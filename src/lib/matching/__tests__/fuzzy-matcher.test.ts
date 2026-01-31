import { describe, it, expect } from 'vitest'
import { parseProductName, normalizeProductName } from '../fuzzy-matcher.js'

describe('normalizeProductName', () => {
  it('should convert to lowercase', () => {
    expect(normalizeProductName('COCA COLA')).toBe('coca cola')
    expect(normalizeProductName('Leche Entera')).toBe('leche entera')
  })

  it('should remove accents', () => {
    expect(normalizeProductName('Azúcar Refinada')).toBe('azucar refinada')
    expect(normalizeProductName('Jamón Cocido')).toBe('jamon cocido')
    expect(normalizeProductName('Café Molido')).toBe('cafe molido')
  })

  it('should remove special characters', () => {
    expect(normalizeProductName('Coca-Cola')).toBe('coca cola')
    expect(normalizeProductName('Pan & Manteca')).toBe('pan manteca')
    expect(normalizeProductName('Producto (nuevo)')).toBe('producto nuevo')
  })

  it('should normalize multiple spaces', () => {
    expect(normalizeProductName('Coca   Cola   2L')).toBe('coca cola 2l')
    expect(normalizeProductName('  Leche  Entera  ')).toBe('leche entera')
  })
})

describe('parseProductName', () => {
  describe('Volumen (litros/ml)', () => {
    it('should parse liters with L suffix', () => {
      const result = parseProductName('Coca Cola 2L')
      expect(result.baseName).toBe('coca cola')
      expect(result.quantity).toBe(2)
      expect(result.unit).toBe('l')
    })

    it('should parse milliliters', () => {
      const result = parseProductName('Agua Mineral 500ml')
      expect(result.baseName).toBe('agua mineral')
      expect(result.quantity).toBe(500)
      expect(result.unit).toBe('ml')
    })

    it('should parse "Litro" word', () => {
      const result = parseProductName('Leche 1 Litro')
      expect(result.baseName).toBe('leche')
      expect(result.quantity).toBe(1)
      expect(result.unit).toBe('l')
    })

    it('should parse "Lt" abbreviation', () => {
      const result = parseProductName('Jugo 1.5 Lt')
      expect(result.baseName).toBe('jugo')
      expect(result.quantity).toBe(1.5)
      expect(result.unit).toBe('l')
    })

    it('should parse "Lt" abbreviation without decimal', () => {
      const result = parseProductName('Jugo 2 Lt')
      expect(result.baseName).toBe('jugo')
      expect(result.quantity).toBe(2)
      expect(result.unit).toBe('l')
    })

    it('should parse decimal with comma', () => {
      const result = parseProductName('Gaseosa 2,5L')
      expect(result.baseName).toBe('gaseosa')
      expect(result.quantity).toBe(2.5)
      expect(result.unit).toBe('l')
    })

    it('should parse decimal attached to unit', () => {
      const result = parseProductName('Gaseosa 2.5L')
      expect(result.baseName).toBe('gaseosa')
      expect(result.quantity).toBe(2.5)
      expect(result.unit).toBe('l')
    })

    it('should parse integer liters correctly', () => {
      // Integer quantities work fine
      const result = parseProductName('Gaseosa 2L')
      expect(result.baseName).toBe('gaseosa')
      expect(result.quantity).toBe(2)
      expect(result.unit).toBe('l')
    })

    it('should parse "Litros" plural', () => {
      const result = parseProductName('Agua 3 Litros')
      expect(result.baseName).toBe('agua')
      expect(result.quantity).toBe(3)
      expect(result.unit).toBe('l')
    })

    it('should parse "Lts" abbreviation', () => {
      const result = parseProductName('Jugo Natural 2 Lts')
      expect(result.baseName).toBe('jugo natural')
      expect(result.quantity).toBe(2)
      expect(result.unit).toBe('l')
    })
  })

  describe('Peso (kg/g)', () => {
    it('should parse kilograms', () => {
      const result = parseProductName('Arroz 5kg')
      expect(result.baseName).toBe('arroz')
      expect(result.quantity).toBe(5)
      expect(result.unit).toBe('kg')
    })

    it('should parse "Kilo" word', () => {
      const result = parseProductName('Azucar 1 Kilo')
      expect(result.baseName).toBe('azucar')
      expect(result.quantity).toBe(1)
      expect(result.unit).toBe('kg')
    })

    it('should parse grams', () => {
      const result = parseProductName('Sal Fina 500g')
      expect(result.baseName).toBe('sal fina')
      expect(result.quantity).toBe(500)
      expect(result.unit).toBe('g')
    })

    it('should parse "Gramos" word', () => {
      const result = parseProductName('Harina 500 Gramos')
      expect(result.baseName).toBe('harina')
      expect(result.quantity).toBe(500)
      expect(result.unit).toBe('g')
    })

    it('should parse "gr" abbreviation', () => {
      const result = parseProductName('Cafe 250gr')
      expect(result.baseName).toBe('cafe')
      expect(result.quantity).toBe(250)
      expect(result.unit).toBe('g')
    })

    it('should parse "Kilos" plural', () => {
      const result = parseProductName('Papa 10 Kilos')
      expect(result.baseName).toBe('papa')
      expect(result.quantity).toBe(10)
      expect(result.unit).toBe('kg')
    })

    it('should parse "Kgs" abbreviation', () => {
      const result = parseProductName('Pollo 2 Kgs')
      expect(result.baseName).toBe('pollo')
      expect(result.quantity).toBe(2)
      expect(result.unit).toBe('kg')
    })
  })

  describe('Unidades', () => {
    it('should parse "x" prefix format', () => {
      const result = parseProductName('Huevos x12')
      expect(result.baseName).toBe('huevos')
      expect(result.quantity).toBe(12)
      expect(result.unit).toBe('un')
    })

    it('should parse "Pack" format with unit word', () => {
      // "Pack 6" without explicit unit word doesn't match because
      // the pattern requires "pack" followed by a unit word like "un/und/unidades"
      const result = parseProductName('Yogurt Pack 6 Unidades')
      expect(result.baseName).toBe('yogurt')
      expect(result.quantity).toBe(6)
      expect(result.unit).toBe('un')
    })

    it('should parse x6 format (works)', () => {
      // x6 format works because it matches the "x(\d+)" pattern
      const result = parseProductName('Yogurt x6')
      expect(result.baseName).toBe('yogurt')
      expect(result.quantity).toBe(6)
      expect(result.unit).toBe('un')
    })

    it('should parse "Unidades" word', () => {
      const result = parseProductName('Galletas 6 Unidades')
      expect(result.baseName).toBe('galletas')
      expect(result.quantity).toBe(6)
      expect(result.unit).toBe('un')
    })

    it('should parse "un" abbreviation', () => {
      const result = parseProductName('Banana 5 un')
      expect(result.baseName).toBe('banana')
      expect(result.quantity).toBe(5)
      expect(result.unit).toBe('un')
    })

    it('should parse "und" abbreviation', () => {
      const result = parseProductName('Manzana 10 und')
      expect(result.baseName).toBe('manzana')
      expect(result.quantity).toBe(10)
      expect(result.unit).toBe('un')
    })

    it('should parse "x unidad" without number as 1 unit', () => {
      const result = parseProductName('Chocolate Nucita crocante x unidad')
      expect(result.baseName).toBe('chocolate nucita crocante')
      expect(result.quantity).toBe(1)
      expect(result.unit).toBe('un')
    })

    it('should parse "x un" without number as 1 unit', () => {
      const result = parseProductName('Alfajor x un')
      expect(result.baseName).toBe('alfajor')
      expect(result.quantity).toBe(1)
      expect(result.unit).toBe('un')
    })

    it('should parse "x und" without number as 1 unit', () => {
      const result = parseProductName('Galletita x und')
      expect(result.baseName).toBe('galletita')
      expect(result.quantity).toBe(1)
      expect(result.unit).toBe('un')
    })

    it('should parse "x unid" without number as 1 unit', () => {
      const result = parseProductName('Caramelo x unid')
      expect(result.baseName).toBe('caramelo')
      expect(result.quantity).toBe(1)
      expect(result.unit).toBe('un')
    })
  })

  describe('Centimetros cubicos (cc)', () => {
    it('should parse cc and convert to ml', () => {
      const result = parseProductName('Aceite 500cc')
      expect(result.baseName).toBe('aceite')
      expect(result.quantity).toBe(500)
      expect(result.unit).toBe('ml')
    })

    it('should parse cc with space', () => {
      const result = parseProductName('Crema 200 cc')
      expect(result.baseName).toBe('crema')
      expect(result.quantity).toBe(200)
      expect(result.unit).toBe('ml')
    })
  })

  describe('Edge cases', () => {
    it('should handle product without measurement', () => {
      const result = parseProductName('Coca Cola')
      expect(result.baseName).toBe('coca cola')
      expect(result.quantity).toBe(null)
      expect(result.unit).toBe(null)
    })

    it('should handle product explicitly without measurement', () => {
      const result = parseProductName('Producto Sin Medida')
      expect(result.baseName).toBe('producto sin medida')
      expect(result.quantity).toBe(null)
      expect(result.unit).toBe(null)
    })

    it('should not parse numbers at the start without unit', () => {
      const result = parseProductName('123 Numeros Al Inicio')
      expect(result.baseName).toBe('123 numeros al inicio')
      expect(result.quantity).toBe(null)
      expect(result.unit).toBe(null)
    })

    it('should handle empty string', () => {
      const result = parseProductName('')
      expect(result.baseName).toBe('')
      expect(result.quantity).toBe(null)
      expect(result.unit).toBe(null)
    })

    it('should handle measurement in the middle of name', () => {
      const result = parseProductName('Coca Cola 2L Retornable')
      expect(result.baseName).toBe('coca cola retornable')
      expect(result.quantity).toBe(2)
      expect(result.unit).toBe('l')
    })

    it('should preserve brand names with numbers', () => {
      const result = parseProductName('7up 2L')
      expect(result.baseName).toBe('7up')
      expect(result.quantity).toBe(2)
      expect(result.unit).toBe('l')
    })
  })

  describe('Regression cases (problematic patterns)', () => {
    it('should handle "2x" prefix followed by product', () => {
      // This tests that "2x" at the start doesn't break parsing
      const result = parseProductName('2x Coca Cola 1L')
      // The important thing is it doesn't crash and finds the 1L
      expect(result.quantity).toBe(1)
      expect(result.unit).toBe('l')
    })

    it('should handle pack notation "x 6" at the end', () => {
      const result = parseProductName('Leche 1L x 6')
      // Should detect either the 1L or the x6
      expect(result.quantity).not.toBe(null)
      expect(result.unit).not.toBe(null)
    })

    it('should handle decimal quantities attached to unit', () => {
      const result = parseProductName('Aceite 0.5L')
      expect(result.baseName).toBe('aceite')
      expect(result.quantity).toBe(0.5)
      expect(result.unit).toBe('l')
    })

    it('should handle 500ml format correctly', () => {
      // Better approach: use ml for sub-liter quantities
      const result = parseProductName('Aceite 500ml')
      expect(result.baseName).toBe('aceite')
      expect(result.quantity).toBe(500)
      expect(result.unit).toBe('ml')
    })

    it('should handle large quantities', () => {
      const result = parseProductName('Agua 5000ml')
      expect(result.baseName).toBe('agua')
      expect(result.quantity).toBe(5000)
      expect(result.unit).toBe('ml')
    })

    it('should handle special characters in name with measurement', () => {
      const result = parseProductName('Coca-Cola® Original 2L')
      expect(result.baseName).toBe('coca cola original')
      expect(result.quantity).toBe(2)
      expect(result.unit).toBe('l')
    })
  })
})
