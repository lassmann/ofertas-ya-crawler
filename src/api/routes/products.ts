import { Router } from 'express'
import { Prisma } from '../../../generated/prisma/client.js'
import { db } from '../../lib/db.js'
import { requireAuth } from '../middleware/auth.js'
import { withCache, invalidateCache } from '../middleware/cache.js'

export const productsRouter = Router()

// GET /api/products - All products with optional filters
productsRouter.get('/', async (req, res) => {
  try {
    const { storeId, category, search, page = '1', limit = '50' } = req.query
    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const skip = (pageNum - 1) * limitNum

    const where: Record<string, unknown> = {
      isHidden: false
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
          match: {
            include: {
              canonicalProduct: {
                include: {
                  matches: {
                    include: {
                      product: {
                        include: {
                          store: { select: { name: true } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum
      }),
      db.product.count({ where })
    ])

    const data = products.map(p => {
      // Get other matches (excluding current product)
      const otherMatches = p.match?.canonicalProduct?.matches
        ?.filter(m => m.productId !== p.id)
        ?.map(m => ({
          id: m.product.id,
          name: m.product.name,
          storeName: m.product.store.name
        })) || []

      return {
        id: p.id,
        name: p.name,
        normalizedName: p.normalizedName,
        category: p.category,
        brand: p.brand,
        imageUrl: p.imageUrl,
        storeId: p.store.id,
        storeName: p.store.name,
        hasMatch: !!p.match,
        canonicalName: p.match?.canonicalProduct?.name || null,
        otherMatches
      }
    })

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
    console.error('Error fetching products:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

// GET /api/products/unmatched - Products without ProductMatch
productsRouter.get('/unmatched', async (req, res) => {
  try {
    const { storeId, category, search, page = '1', limit = '50' } = req.query
    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const skip = (pageNum - 1) * limitNum

    const where: Record<string, unknown> = {
      match: null,
      isHidden: false
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
productsRouter.get('/matched', withCache(), async (req, res) => {
  try {
    const { category, search, minStores = '2', page = '1', limit = '50', sort } = req.query
    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const minStoresNum = parseInt(minStores as string, 10)
    const sortByDiscount = sort === 'discount'
    // When sorting by discount, fetch more to sort properly, otherwise use offset
    const offset = sortByDiscount ? 0 : (pageNum - 1) * limitNum
    const fetchLimit = sortByDiscount ? 500 : limitNum // Fetch more when sorting by discount

    // Build the WHERE clause conditionally
    const categoryCondition = category
      ? Prisma.sql`AND p.category = ${category}`
      : Prisma.empty

    const searchCondition = search
      ? Prisma.sql`AND cp.name ILIKE ${'%' + search + '%'}`
      : Prisma.empty

    // Filter out hidden products
    const hiddenCondition = Prisma.sql`AND p."isHidden" = false`

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
      ${hiddenCondition}
      GROUP BY cp.id
      HAVING COUNT(DISTINCT p."storeId") >= ${minStoresNum}
      ORDER BY "storeCount" DESC, cp.name
      LIMIT ${fetchLimit}
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
        ${hiddenCondition}
        GROUP BY cp.id
        HAVING COUNT(DISTINCT p."storeId") >= ${minStoresNum}
      ) sub
    `
    const total = Number(totalResult[0]?.count || 0)

    // For each canonical, get price range
    const data = await Promise.all(
      canonicals.map(async (cp) => {
        const matches = await db.productMatch.findMany({
          where: {
            canonicalProductId: cp.id,
            product: { isHidden: false }
          },
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

    // Sort by discount if requested, then paginate
    let finalData = data
    if (sortByDiscount) {
      finalData = data
        .sort((a, b) => b.priceDifferencePercent - a.priceDifferencePercent)
        .slice((pageNum - 1) * limitNum, pageNum * limitNum)
    }

    res.json({
      data: finalData,
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

// PATCH /api/products/:productId - Update product fields (like category)
productsRouter.patch('/:productId', requireAuth, invalidateCache(['/api/products', '/api/stats']), async (req, res) => {
  try {
    const { productId } = req.params
    const { category } = req.body

    const product = await db.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const updated = await db.product.update({
      where: { id: productId },
      data: { category }
    })

    res.json({
      success: true,
      product: {
        id: updated.id,
        category: updated.category
      }
    })
  } catch (error) {
    console.error('Error updating product:', error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// GET /api/products/categories - List all unique categories
productsRouter.get('/categories', withCache(), async (_req, res) => {
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
