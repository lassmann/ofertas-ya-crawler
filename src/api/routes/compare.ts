import { Router } from 'express'
import { db } from '../../lib/db.js'

export const compareRouter = Router()

// GET /api/compare/:canonicalId - Get price comparison for a canonical product
compareRouter.get('/:canonicalId', async (req, res) => {
  try {
    const { canonicalId } = req.params

    const canonical = await db.canonicalProduct.findUnique({
      where: { id: canonicalId }
    })

    if (!canonical) {
      return res.status(404).json({ error: 'Canonical product not found' })
    }

    // Get all matches for this canonical product
    const matches = await db.productMatch.findMany({
      where: { canonicalProductId: canonicalId },
      include: {
        product: {
          include: {
            store: { select: { id: true, name: true, slug: true, logoUrl: true } },
            prices: { orderBy: { scrapedAt: 'desc' }, take: 1 }
          }
        }
      }
    })

    const stores = matches
      .filter(m => m.product.prices.length > 0)
      .map(m => {
        const price = Number(m.product.prices[0].price)
        const oldPrice = m.product.prices[0].oldPrice
          ? Number(m.product.prices[0].oldPrice)
          : null
        const hasDiscount = oldPrice !== null && oldPrice > price
        const discountPercent = hasDiscount && oldPrice
          ? Math.round(((oldPrice - price) / oldPrice) * 100)
          : null

        return {
          storeId: m.product.store.id,
          storeName: m.product.store.name,
          storeSlug: m.product.store.slug,
          storeLogo: m.product.store.logoUrl,
          productId: m.product.id,
          productName: m.product.name,
          price,
          oldPrice,
          hasDiscount,
          discountPercent,
          lastUpdated: m.product.prices[0].scrapedAt,
          sourceUrl: m.product.prices[0].sourceUrl,
          matchType: m.matchType,
          confidence: m.confidence
        }
      })
      .sort((a, b) => a.price - b.price)

    const cheapest = stores[0] || null
    const mostExpensive = stores[stores.length - 1] || null
    const priceDifference = cheapest && mostExpensive
      ? mostExpensive.price - cheapest.price
      : 0
    const priceDifferencePercent = cheapest && mostExpensive && cheapest.price > 0
      ? Math.round(((mostExpensive.price - cheapest.price) / cheapest.price) * 100)
      : 0

    res.json({
      canonical: {
        id: canonical.id,
        name: canonical.name,
        normalizedName: canonical.normalizedName,
        category: canonical.category,
        brand: canonical.brand
      },
      stores,
      cheapest,
      mostExpensive,
      priceDifference,
      priceDifferencePercent,
      storeCount: stores.length
    })
  } catch (error) {
    console.error('Error fetching comparison:', error)
    res.status(500).json({ error: 'Failed to fetch comparison' })
  }
})
