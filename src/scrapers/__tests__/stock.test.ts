import { describe, it, expect, beforeEach } from 'vitest'
import { StockScraper } from '../supermercados/stock'
import { stockConfig } from '../config/stock'

describe('StockScraper', () => {
    let scraper: StockScraper

    beforeEach(() => {
        scraper = new StockScraper()
    })

    describe('config', () => {
        it('should have correct name and slug', () => {
            expect(scraper.name).toBe('Stock')
            expect(scraper.slug).toBe('stock')
        })
    })

    describe('parseHtml', () => {
        it('should parse empty HTML correctly', () => {
            const html = '<html><body></body></html>'
            const result = scraper.parseHtml(html, 'https://stock.com.py', 'test')

            expect(result.products).toHaveLength(0)
            expect(result.nextPageUrl).toBeNull()
        })

        // TODO: Agregar más tests con HTML real de Stock
    })

    describe('parsePrice', () => {
        it('should parse guarani prices correctly', () => {
            const { parsePrice } = stockConfig

            expect(parsePrice(' 11.050')).toBe(11050)
            expect(parsePrice('13900')).toBe(13900)
            expect(parsePrice(' 1.234.567')).toBe(1234567)
            expect(parsePrice('Gs 50.000')).toBe(50000)
            expect(parsePrice('Gs 25000')).toBe(25000)
            expect(parsePrice(null)).toBeNull()
            expect(parsePrice('')).toBeNull()
        })
    })

    describe('extractProductId', () => {
        it('should extract product ID from class name', () => {
            const { extractProductId } = stockConfig

            expect(extractProductId('product-item product236926')).toBe('236926')
            expect(extractProductId('product-item product123456 other-class')).toBe('123456')
            expect(extractProductId('product-item')).toBeNull()
            expect(extractProductId(null)).toBeNull()
        })
    })

    describe('extractPageNumber', () => {
        it('should extract page numbers from Stock URLs', () => {
            const { extractPageNumber } = stockConfig

            expect(extractPageNumber('?pageindex=5')).toBe(5)
            expect(extractPageNumber('/category/5-almacen.aspx?pageindex=10')).toBe(10)
            expect(extractPageNumber('/category/5-almacen.aspx?pageindex=3&sort=asc')).toBe(3)
            expect(extractPageNumber('/category')).toBeNull()
            expect(extractPageNumber('/category?page=2')).toBeNull() // No debería coincidir con otro formato
        })
    })
})
