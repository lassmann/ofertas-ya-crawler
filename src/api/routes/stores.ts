import { Router } from 'express'
import { db } from '../../lib/db.js'
import { withCache } from '../middleware/cache.js'

export const storesRouter = Router()

// GET /api/stores - List all stores with product counts
storesRouter.get('/', withCache(), async (_req, res) => {
  try {
    const stores = await db.store.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        logoUrl: true,
        lastScrapedAt: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const storesWithCounts = stores.map(store => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      type: store.type,
      logoUrl: store.logoUrl,
      lastScrapedAt: store.lastScrapedAt,
      productCount: store._count.products
    }))

    res.json(storesWithCounts)
  } catch (error) {
    console.error('Error fetching stores:', error)
    res.status(500).json({ error: 'Failed to fetch stores' })
  }
})
