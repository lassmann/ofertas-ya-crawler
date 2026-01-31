import { Router } from 'express'
import { db } from '../../lib/db.js'

export const statsRouter = Router()

// GET /api/stats/price-differences - Paginated price differences
statsRouter.get('/price-differences', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10))
    const offset = (page - 1) * limit

    // Get total count of canonical products in multiple stores
    const countResult = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT cp.id
        FROM "CanonicalProduct" cp
        JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
        JOIN "Product" p ON p.id = pm."productId"
        GROUP BY cp.id
        HAVING COUNT(DISTINCT p."storeId") >= 2
      ) sub
    `
    const total = Number(countResult[0]?.count || 0)
    const totalPages = Math.ceil(total / limit)

    // Get paginated canonical products that exist in multiple stores
    const canonicalProducts = await db.$queryRaw<{
      id: string
      name: string
      storeCount: bigint
    }[]>`
      SELECT
        cp.id,
        cp.name,
        COUNT(DISTINCT p."storeId") as "storeCount"
      FROM "CanonicalProduct" cp
      JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
      JOIN "Product" p ON p.id = pm."productId"
      GROUP BY cp.id
      HAVING COUNT(DISTINCT p."storeId") >= 2
      ORDER BY COUNT(DISTINCT p."storeId") DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Calculate price differences for each product
    const priceDifferences = await Promise.all(
      canonicalProducts.map(async (cp) => {
        const matches = await db.productMatch.findMany({
          where: { canonicalProductId: cp.id },
          include: {
            product: {
              include: {
                store: { select: { name: true } },
                prices: { orderBy: { scrapedAt: 'desc' }, take: 1 }
              }
            }
          }
        })

        const prices = matches
          .filter(m => m.product.prices.length > 0)
          .map(m => ({
            store: m.product.store.name,
            price: Number(m.product.prices[0].price)
          }))
          .sort((a, b) => a.price - b.price)

        if (prices.length < 2) return null

        const minPrice = prices[0].price
        const maxPrice = prices[prices.length - 1].price
        const diffPercent = minPrice > 0
          ? Math.round(((maxPrice - minPrice) / minPrice) * 100)
          : 0

        return {
          id: cp.id,
          name: cp.name,
          storeCount: Number(cp.storeCount),
          minPrice,
          maxPrice,
          cheapestStore: prices[0].store,
          mostExpensiveStore: prices[prices.length - 1].store,
          priceDifferencePercent: diffPercent
        }
      })
    )

    res.json({
      data: priceDifferences.filter(Boolean),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Error fetching price differences:', error)
    res.status(500).json({ error: 'Failed to fetch price differences' })
  }
})

// GET /api/stats - Dashboard statistics
statsRouter.get('/', async (_req, res) => {
  try {
    // Get counts in parallel
    const [
      totalProducts,
      matchedProducts,
      totalCanonicals,
      totalStores,
      categoriesResult
    ] = await Promise.all([
      db.product.count(),
      db.productMatch.count(),
      db.canonicalProduct.count(),
      db.store.count({ where: { isActive: true } }),
      db.product.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category']
      })
    ])

    const unmatchedProducts = totalProducts - matchedProducts

    // Get top price differences (products in multiple stores with biggest % difference)
    const topDifferences = await db.$queryRaw<{
      id: string
      name: string
      storeCount: bigint
    }[]>`
      SELECT
        cp.id,
        cp.name,
        COUNT(DISTINCT p."storeId") as "storeCount"
      FROM "CanonicalProduct" cp
      JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
      JOIN "Product" p ON p.id = pm."productId"
      GROUP BY cp.id
      HAVING COUNT(DISTINCT p."storeId") >= 2
      ORDER BY COUNT(DISTINCT p."storeId") DESC
      LIMIT 10
    `

    // Calculate price differences for top products
    const topPriceDifferences = await Promise.all(
      topDifferences.slice(0, 5).map(async (cp) => {
        const matches = await db.productMatch.findMany({
          where: { canonicalProductId: cp.id },
          include: {
            product: {
              include: {
                store: { select: { name: true } },
                prices: { orderBy: { scrapedAt: 'desc' }, take: 1 }
              }
            }
          }
        })

        const prices = matches
          .filter(m => m.product.prices.length > 0)
          .map(m => ({
            store: m.product.store.name,
            price: Number(m.product.prices[0].price)
          }))
          .sort((a, b) => a.price - b.price)

        if (prices.length < 2) return null

        const minPrice = prices[0].price
        const maxPrice = prices[prices.length - 1].price
        const diffPercent = minPrice > 0
          ? Math.round(((maxPrice - minPrice) / minPrice) * 100)
          : 0

        return {
          id: cp.id,
          name: cp.name,
          storeCount: Number(cp.storeCount),
          minPrice,
          maxPrice,
          cheapestStore: prices[0].store,
          mostExpensiveStore: prices[prices.length - 1].store,
          priceDifferencePercent: diffPercent
        }
      })
    )

    // Get products per store
    const productsPerStore = await db.store.findMany({
      where: { isActive: true },
      select: {
        name: true,
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    })

    res.json({
      overview: {
        totalProducts,
        matchedProducts,
        unmatchedProducts,
        matchPercentage: totalProducts > 0
          ? Math.round((matchedProducts / totalProducts) * 100)
          : 0,
        totalCanonicals,
        totalStores,
        totalCategories: categoriesResult.length
      },
      topPriceDifferences: topPriceDifferences.filter(Boolean),
      productsPerStore: productsPerStore.map(s => ({
        name: s.name,
        count: s._count.products
      }))
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})
