import { Router } from 'express'
import { db } from '../../lib/db.js'
import { normalizeProductName } from '../../lib/matching/fuzzy-matcher.js'

export const matchesRouter = Router()

// POST /api/matches - Create a manual match
matchesRouter.post('/', async (req, res) => {
  try {
    const { productId, canonicalProductId } = req.body

    if (!productId || !canonicalProductId) {
      return res.status(400).json({
        error: 'productId and canonicalProductId are required'
      })
    }

    // Check if product exists and doesn't already have a match
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { match: true }
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    if (product.match) {
      return res.status(400).json({ error: 'Product already has a match' })
    }

    // Check if canonical product exists
    const canonical = await db.canonicalProduct.findUnique({
      where: { id: canonicalProductId }
    })

    if (!canonical) {
      return res.status(404).json({ error: 'Canonical product not found' })
    }

    // Create the match
    const match = await db.productMatch.create({
      data: {
        productId,
        canonicalProductId,
        matchType: 'MANUAL',
        confidence: 1.0,
        isVerified: true
      }
    })

    // Also create an alias for future automatic matching
    const normalizedName = product.normalizedName
    const existingAlias = await db.canonicalAlias.findUnique({
      where: { normalizedName }
    })

    if (!existingAlias) {
      await db.canonicalAlias.create({
        data: {
          normalizedName,
          canonicalProductId
        }
      })
    }

    res.json({
      success: true,
      match: {
        id: match.id,
        productId: match.productId,
        canonicalProductId: match.canonicalProductId,
        matchType: match.matchType,
        confidence: match.confidence
      }
    })
  } catch (error) {
    console.error('Error creating match:', error)
    res.status(500).json({ error: 'Failed to create match' })
  }
})

// GET /api/matches/canonical/search - Search for canonical products
matchesRouter.get('/canonical/search', async (req, res) => {
  try {
    const { q, limit = '20' } = req.query
    const limitNum = Math.min(parseInt(limit as string, 10), 50)

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({
        error: 'Query parameter "q" is required and must be at least 2 characters'
      })
    }

    const normalizedQuery = normalizeProductName(q)

    // Set threshold for fuzzy search
    await db.$executeRaw`SELECT set_limit(0.2)`

    const results = await db.$queryRaw<{
      id: string
      name: string
      normalizedName: string
      category: string | null
      similarity: number
      minPrice: number | null
    }[]>`
      SELECT
        cp.id,
        cp.name,
        cp."normalizedName",
        cp.category,
        similarity(cp."normalizedName", ${normalizedQuery}) as similarity,
        (
          SELECT MIN(p.price)
          FROM "ProductMatch" pm
          JOIN "Price" p ON p."productId" = pm."productId"
          WHERE pm."canonicalProductId" = cp.id
            AND p."scrapedAt" = (
              SELECT MAX(p2."scrapedAt") FROM "Price" p2 WHERE p2."productId" = pm."productId"
            )
        ) as "minPrice"
      FROM "CanonicalProduct" cp
      WHERE cp."normalizedName" % ${normalizedQuery}
         OR cp.name ILIKE ${'%' + q + '%'}
      ORDER BY similarity DESC
      LIMIT ${limitNum}
    `

    res.json(results)
  } catch (error) {
    console.error('Error searching canonical products:', error)
    res.status(500).json({ error: 'Failed to search canonical products' })
  }
})

// DELETE /api/matches/:productId - Remove a match
matchesRouter.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const hide = req.query.hide === 'true'

    // Find the match
    const match = await db.productMatch.findUnique({
      where: { productId },
      include: { product: true }
    })

    if (!match) {
      return res.status(404).json({ error: 'Match not found' })
    }

    // Delete the match
    await db.productMatch.delete({
      where: { productId }
    })

    // Optionally hide the product
    if (hide) {
      await db.product.update({
        where: { id: productId },
        data: { isHidden: true }
      })
    }

    res.json({
      success: true,
      productId,
      hidden: hide
    })
  } catch (error) {
    console.error('Error deleting match:', error)
    res.status(500).json({ error: 'Failed to delete match' })
  }
})

// POST /api/matches/canonical - Create a new canonical product and match
matchesRouter.post('/canonical', async (req, res) => {
  try {
    const { productId, name, category, brand } = req.body

    if (!productId || !name) {
      return res.status(400).json({
        error: 'productId and name are required'
      })
    }

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { match: true }
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    if (product.match) {
      return res.status(400).json({ error: 'Product already has a match' })
    }

    const normalizedName = normalizeProductName(name)

    // Check if canonical already exists
    const existing = await db.canonicalProduct.findUnique({
      where: { normalizedName }
    })

    if (existing) {
      return res.status(400).json({
        error: 'A canonical product with this name already exists',
        existingId: existing.id
      })
    }

    // Create canonical product
    const canonical = await db.canonicalProduct.create({
      data: {
        name,
        normalizedName,
        category: category || product.category,
        brand: brand || product.brand
      }
    })

    // Create the match
    const match = await db.productMatch.create({
      data: {
        productId,
        canonicalProductId: canonical.id,
        matchType: 'MANUAL',
        confidence: 1.0,
        isVerified: true
      }
    })

    // Create alias from the product's normalized name
    await db.canonicalAlias.create({
      data: {
        normalizedName: product.normalizedName,
        canonicalProductId: canonical.id
      }
    })

    res.json({
      success: true,
      canonical: {
        id: canonical.id,
        name: canonical.name,
        normalizedName: canonical.normalizedName
      },
      match: {
        id: match.id,
        matchType: match.matchType
      }
    })
  } catch (error) {
    console.error('Error creating canonical product:', error)
    res.status(500).json({ error: 'Failed to create canonical product' })
  }
})
