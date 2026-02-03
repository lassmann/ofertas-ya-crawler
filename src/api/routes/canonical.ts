import { Router } from 'express'
import { db } from '../../lib/db.js'
import { requireAuth } from '../middleware/auth.js'

export const canonicalRouter = Router()

// PATCH /api/canonical/:id - Update canonical product (displayName)
canonicalRouter.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { displayName } = req.body

    const existing = await db.canonicalProduct.findUnique({
      where: { id }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Canonical product not found' })
    }

    const updated = await db.canonicalProduct.update({
      where: { id },
      data: {
        displayName: displayName || null // Allow clearing by sending empty string
      }
    })

    res.json({
      success: true,
      canonical: {
        id: updated.id,
        name: updated.name,
        displayName: updated.displayName
      }
    })
  } catch (error) {
    console.error('Error updating canonical product:', error)
    res.status(500).json({ error: 'Failed to update canonical product' })
  }
})
