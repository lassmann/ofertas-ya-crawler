import { Router } from 'express'
import { Prisma } from '../../../generated/prisma/client.js'
import { db } from '../../lib/db.js'

export const productsRouter = Router()

// GET /api/products/unmatched - Products without ProductMatch
productsRouter.get('/unmatched', async (req, res) => {
  try {
    const { storeId, category, search, page = '1', limit = '50' } = req.query
    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const skip = (pageNum - 1) * limitNum

    const where: Record<string, unknown> = {
      match: null
    }

    if (storeId) {
      where.storeId = storeId as string
    }

    if (category) {
      where.category = category as string
    }

    if (search) {
      where.name = {
        contains: search as string,
        mode: 'insensitive'
      }
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          store: {
            select: { id: true, name: true, slug: true }
          },
          prices: {
            orderBy: { scrapedAt: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum
      }),
      db.product.count({ where })
    ])

    const data = products.map(p => ({
      id: p.id,
      name: p.name,
      normalizedName: p.normalizedName,
      category: p.category,
      brand: p.brand,
      imageUrl: p.imageUrl,
      store: p.store,
      price: p.prices[0] ? Number(p.prices[0].price) : null,
      oldPrice: p.prices[0]?.oldPrice ? Number(p.prices[0].oldPrice) : null,
      lastUpdated: p.prices[0]?.scrapedAt || p.updatedAt
    }))

    res.json({
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching unmatched products:', error)
    res.status(500).json({ error: 'Failed to fetch unmatched products' })
  }
})

// GET /api/products/matched - Canonical products with matches in multiple stores
productsRouter.get('/matched', async (req, res) => {
  try {
    const { category, search, minStores = '2', page = '1', limit = '50' } = req.query
    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const minStoresNum = parseInt(minStores as string, 10)
    const offset = (pageNum - 1) * limitNum

    // Build the WHERE clause conditionally
    const categoryCondition = category
      ? Prisma.sql`AND p.category = ${category}`
      : Prisma.empty

    const searchCondition = search
      ? Prisma.sql`AND cp.name ILIKE ${'%' + search + '%'}`
      : Prisma.empty

    // Get canonical products with store counts
    const canonicals = await db.$queryRaw<{
      id: string
      name: string
      normalizedName: string
      category: string | null
      storeCount: bigint
    }[]>`
      SELECT
        cp.id,
        cp.name,
        cp."normalizedName",
        cp.category,
        COUNT(DISTINCT p."storeId") as "storeCount"
      FROM "CanonicalProduct" cp
      JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
      JOIN "Product" p ON p.id = pm."productId"
      WHERE 1=1
      ${categoryCondition}
      ${searchCondition}
      GROUP BY cp.id
      HAVING COUNT(DISTINCT p."storeId") >= ${minStoresNum}
      ORDER BY "storeCount" DESC, cp.name
      LIMIT ${limitNum}
      OFFSET ${offset}
    `

    // Get total count for pagination
    const totalResult = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT cp.id
        FROM "CanonicalProduct" cp
        JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
        JOIN "Product" p ON p.id = pm."productId"
        WHERE 1=1
        ${categoryCondition}
        ${searchCondition}
        GROUP BY cp.id
        HAVING COUNT(DISTINCT p."storeId") >= ${minStoresNum}
      ) sub
    `
    const total = Number(totalResult[0]?.count || 0)

    // For each canonical, get price range
    const data = await Promise.all(
      canonicals.map(async (cp) => {
        const matches = await db.productMatch.findMany({
          where: { canonicalProductId: cp.id },
          include: {
            product: {
              include: {
                store: { select: { id: true, name: true, slug: true } },
                prices: { orderBy: { scrapedAt: 'desc' }, take: 1 }
              }
            }
          }
        })

        const prices = matches
          .filter(m => m.product.prices.length > 0)
          .map(m => ({
            storeId: m.product.store.id,
            storeName: m.product.store.name,
            price: Number(m.product.prices[0].price),
            productId: m.product.id,
            imageUrl: m.product.imageUrl
          }))
          .sort((a, b) => a.price - b.price)

        const minPrice = prices[0]?.price || 0
        const maxPrice = prices[prices.length - 1]?.price || 0
        const cheapestStore = prices[0]?.storeName || null
        // Get first available image from any matched product
        const imageUrl = matches.find(m => m.product.imageUrl)?.product.imageUrl || null

        return {
          id: cp.id,
          name: cp.name,
          normalizedName: cp.normalizedName,
          category: cp.category,
          storeCount: Number(cp.storeCount),
          minPrice,
          maxPrice,
          cheapestStore,
          imageUrl,
          priceDifferencePercent: minPrice > 0
            ? Math.round(((maxPrice - minPrice) / minPrice) * 100)
            : 0
        }
      })
    )

    res.json({
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching matched products:', error)
    res.status(500).json({ error: 'Failed to fetch matched products' })
  }
})

// GET /api/products/categories - List all unique categories
productsRouter.get('/categories', async (_req, res) => {
  try {
    const categories = await db.product.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    })

    res.json(categories.map(c => c.category).filter(Boolean))
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})
