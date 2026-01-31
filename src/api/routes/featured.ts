import { Router } from 'express'
import { db } from '../../lib/db.js'

export const featuredRouter = Router()

// GET /api/featured - List all featured offers
featuredRouter.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true'

    const featured = await db.featuredOffer.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        canonicalProduct: {
          include: {
            matches: {
              include: {
                product: {
                  include: {
                    store: true,
                    prices: {
                      orderBy: { scrapedAt: 'desc' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    // Transform to include price info
    const result = featured.map((offer) => {
      const matches = offer.canonicalProduct.matches
      const prices = matches
        .map((m) => {
          const latestPrice = m.product.prices[0]
          return latestPrice
            ? {
                storeId: m.product.store.id,
                storeName: m.product.store.name,
                storeSlug: m.product.store.slug,
                price: Number(latestPrice.price),
                oldPrice: latestPrice.oldPrice ? Number(latestPrice.oldPrice) : null,
              }
            : null
        })
        .filter(Boolean)

      const minPrice = prices.length > 0 ? Math.min(...prices.map((p) => p!.price)) : null
      const maxPrice = prices.length > 0 ? Math.max(...prices.map((p) => p!.price)) : null

      // Get imageUrl from any matched product
      const imageUrl = matches.find((m) => m.product.imageUrl)?.product.imageUrl || null

      return {
        id: offer.id,
        displayOrder: offer.displayOrder,
        isActive: offer.isActive,
        createdAt: offer.createdAt,
        canonicalProduct: {
          id: offer.canonicalProduct.id,
          name: offer.canonicalProduct.name,
          category: offer.canonicalProduct.category,
          brand: offer.canonicalProduct.brand,
          imageUrl,
        },
        storeCount: prices.length,
        minPrice,
        maxPrice,
        priceDifferencePercent:
          minPrice && maxPrice && minPrice > 0
            ? Math.round(((maxPrice - minPrice) / minPrice) * 100)
            : 0,
      }
    })

    res.json(result)
  } catch (error) {
    console.error('Error listing featured offers:', error)
    res.status(500).json({ error: 'Failed to list featured offers' })
  }
})

// POST /api/featured - Create a featured offer
featuredRouter.post('/', async (req, res) => {
  try {
    const { canonicalProductId, displayOrder } = req.body

    if (!canonicalProductId) {
      return res.status(400).json({ error: 'canonicalProductId is required' })
    }

    // Check if canonical product exists
    const canonical = await db.canonicalProduct.findUnique({
      where: { id: canonicalProductId },
    })

    if (!canonical) {
      return res.status(404).json({ error: 'Canonical product not found' })
    }

    // Check if already featured
    const existing = await db.featuredOffer.findUnique({
      where: { canonicalProductId },
    })

    if (existing) {
      return res.status(400).json({ error: 'This product is already featured' })
    }

    // Get max displayOrder if not provided
    let order = displayOrder
    if (order === undefined) {
      const maxOrder = await db.featuredOffer.aggregate({
        _max: { displayOrder: true },
      })
      order = (maxOrder._max.displayOrder ?? -1) + 1
    }

    const featured = await db.featuredOffer.create({
      data: {
        canonicalProductId,
        displayOrder: order,
      },
    })

    res.json({
      success: true,
      featured: {
        id: featured.id,
        canonicalProductId: featured.canonicalProductId,
        displayOrder: featured.displayOrder,
        isActive: featured.isActive,
      },
    })
  } catch (error) {
    console.error('Error creating featured offer:', error)
    res.status(500).json({ error: 'Failed to create featured offer' })
  }
})

// PATCH /api/featured/:id - Update a featured offer
featuredRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { displayOrder, isActive } = req.body

    const existing = await db.featuredOffer.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Featured offer not found' })
    }

    const updated = await db.featuredOffer.update({
      where: { id },
      data: {
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    res.json({
      success: true,
      featured: {
        id: updated.id,
        displayOrder: updated.displayOrder,
        isActive: updated.isActive,
      },
    })
  } catch (error) {
    console.error('Error updating featured offer:', error)
    res.status(500).json({ error: 'Failed to update featured offer' })
  }
})

// PATCH /api/featured/reorder - Reorder multiple featured offers
featuredRouter.patch('/reorder', async (req, res) => {
  try {
    const { items } = req.body

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' })
    }

    // Update all items in a transaction
    await db.$transaction(
      items.map((item: { id: string; displayOrder: number }) =>
        db.featuredOffer.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error reordering featured offers:', error)
    res.status(500).json({ error: 'Failed to reorder featured offers' })
  }
})

// DELETE /api/featured/:id - Delete a featured offer
featuredRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const existing = await db.featuredOffer.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Featured offer not found' })
    }

    await db.featuredOffer.delete({
      where: { id },
    })

    res.json({ success: true, id })
  } catch (error) {
    console.error('Error deleting featured offer:', error)
    res.status(500).json({ error: 'Failed to delete featured offer' })
  }
})
