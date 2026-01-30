import { describe, it, expect } from 'vitest'
import { areMeasurementsCompatible } from '../process-matches.js'

describe('areMeasurementsCompatible', () => {
  describe('Compatible cases (same product)', () => {
    it('should return true for exact match', () => {
      expect(areMeasurementsCompatible(2, 'l', 2, 'l')).toBe(true)
      expect(areMeasurementsCompatible(500, 'ml', 500, 'ml')).toBe(true)
      expect(areMeasurementsCompatible(1, 'kg', 1, 'kg')).toBe(true)
      expect(areMeasurementsCompatible(250, 'g', 250, 'g')).toBe(true)
      expect(areMeasurementsCompatible(12, 'un', 12, 'un')).toBe(true)
    })

    it('should return true when both have no measurement', () => {
      expect(areMeasurementsCompatible(null, null, null, null)).toBe(true)
    })

    it('should convert ml to l correctly', () => {
      expect(areMeasurementsCompatible(1000, 'ml', 1, 'l')).toBe(true)
      expect(areMeasurementsCompatible(1, 'l', 1000, 'ml')).toBe(true)
      expect(areMeasurementsCompatible(2000, 'ml', 2, 'l')).toBe(true)
      expect(areMeasurementsCompatible(500, 'ml', 0.5, 'l')).toBe(true)
    })

    it('should convert g to kg correctly', () => {
      expect(areMeasurementsCompatible(1000, 'g', 1, 'kg')).toBe(true)
      expect(areMeasurementsCompatible(1, 'kg', 1000, 'g')).toBe(true)
      expect(areMeasurementsCompatible(500, 'g', 0.5, 'kg')).toBe(true)
      expect(areMeasurementsCompatible(2500, 'g', 2.5, 'kg')).toBe(true)
    })
  })

  describe('Incompatible cases (different products)', () => {
    it('should return false for different quantities (same unit)', () => {
      expect(areMeasurementsCompatible(2, 'l', 1, 'l')).toBe(false)
      expect(areMeasurementsCompatible(500, 'ml', 250, 'ml')).toBe(false)
      expect(areMeasurementsCompatible(1, 'kg', 2, 'kg')).toBe(false)
    })

    it('should return false for different quantities after conversion', () => {
      expect(areMeasurementsCompatible(500, 'ml', 1, 'l')).toBe(false) // 500ml != 1000ml
      expect(areMeasurementsCompatible(1, 'kg', 500, 'g')).toBe(false) // 1000g != 500g
      expect(areMeasurementsCompatible(2, 'l', 1500, 'ml')).toBe(false) // 2000ml != 1500ml
    })

    it('should return false for different unit types', () => {
      expect(areMeasurementsCompatible(1, 'l', 1, 'kg')).toBe(false)
      expect(areMeasurementsCompatible(500, 'ml', 500, 'g')).toBe(false)
      expect(areMeasurementsCompatible(1, 'kg', 1, 'un')).toBe(false)
    })

    it('should return false when one has measurement and other does not', () => {
      expect(areMeasurementsCompatible(2, 'l', null, null)).toBe(false)
      expect(areMeasurementsCompatible(null, null, 500, 'ml')).toBe(false)
      expect(areMeasurementsCompatible(1, 'kg', null, null)).toBe(false)
    })
  })

  describe('Float tolerance', () => {
    it('should handle float precision for 1L = 1000ml', () => {
      // 1.0 * 1000 = 1000.0, should match exactly
      expect(areMeasurementsCompatible(1.0, 'l', 1000, 'ml')).toBe(true)
    })

    it('should accept values within 1% tolerance', () => {
      // 999.99ml vs 1L (1000ml) - diff is 0.01ml, well within 1% of 1000 (10ml)
      expect(areMeasurementsCompatible(999.99, 'ml', 1, 'l')).toBe(true)
      // 1001ml vs 1L (1000ml) - diff is 1ml, within 1% of 1000 (10ml)
      expect(areMeasurementsCompatible(1001, 'ml', 1, 'l')).toBe(true)
    })

    it('should reject values outside 1% tolerance', () => {
      // 1100ml vs 1L (1000ml) - diff is 100ml, 10% difference, outside tolerance
      expect(areMeasurementsCompatible(1100, 'ml', 1, 'l')).toBe(false)
      // 900ml vs 1L (1000ml) - diff is 100ml, 10% difference
      expect(areMeasurementsCompatible(900, 'ml', 1, 'l')).toBe(false)
    })

    it('should handle small decimal differences', () => {
      // 1.5L vs 1500ml
      expect(areMeasurementsCompatible(1.5, 'l', 1500, 'ml')).toBe(true)
      // 2.5kg vs 2500g
      expect(areMeasurementsCompatible(2.5, 'kg', 2500, 'g')).toBe(true)
    })

    it('should handle floating point arithmetic edge cases', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      // 0.3L = 300ml - this tests that small float errors don't cause issues
      expect(areMeasurementsCompatible(0.3, 'l', 300, 'ml')).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle zero quantities', () => {
      expect(areMeasurementsCompatible(0, 'l', 0, 'l')).toBe(true)
      expect(areMeasurementsCompatible(0, 'ml', 0, 'l')).toBe(true)
    })

    it('should handle very large quantities', () => {
      expect(areMeasurementsCompatible(10000, 'ml', 10, 'l')).toBe(true)
      expect(areMeasurementsCompatible(50000, 'g', 50, 'kg')).toBe(true)
    })

    it('should handle very small quantities', () => {
      expect(areMeasurementsCompatible(0.001, 'l', 1, 'ml')).toBe(true)
      expect(areMeasurementsCompatible(0.01, 'kg', 10, 'g')).toBe(true)
    })

    it('should handle null unit with non-null quantity gracefully', () => {
      // This is an edge case - quantity without unit
      // Both need to be null or both non-null for compatibility
      expect(areMeasurementsCompatible(1, null, 1, null)).toBe(true)
      expect(areMeasurementsCompatible(1, null, 2, null)).toBe(false)
    })
  })
})
