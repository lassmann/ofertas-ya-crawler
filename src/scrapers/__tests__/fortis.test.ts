import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FortisScraper } from '../supermercados/fortis'
import { fortisConfig } from '../config/fortis'

describe('FortisScraper', () => {
    let scraper: FortisScraper

    beforeEach(() => {
        scraper = new FortisScraper()
    })

    describe('config', () => {
        it('should have correct name and slug', () => {
            expect(scraper.name).toBe('Fortis')
            expect(scraper.slug).toBe('fortis')
        })
    })

    describe('parseHtml', () => {
        it('should parse empty HTML correctly', () => {
            const html = '<html><body></body></html>'
            const result = scraper.parseHtml(html, 'https://fortis.com.py', 'test')

            expect(result.products).toHaveLength(0)
            expect(result.nextPageUrl).toBeNull()
        })

        // TODO: Agregar más tests con HTML real de Fortis
    })

    describe('parsePrice', () => {
        it('should parse guarani prices correctly', () => {
            const { parsePrice } = fortisConfig

            expect(parsePrice('₲ 13.900')).toBe(13900)
            expect(parsePrice('₲13900')).toBe(13900)
            expect(parsePrice('₲ 1.234.567')).toBe(1234567)
            expect(parsePrice(null)).toBeNull()
            expect(parsePrice('')).toBeNull()
        })
    })

    describe('parseDiscount', () => {
        it('should parse discount percentages correctly', () => {
            const { parseDiscount } = fortisConfig

            expect(parseDiscount('- 35%')).toBe(35)
            expect(parseDiscount('-35%')).toBe(35)
            expect(parseDiscount('35%')).toBe(35)
            expect(parseDiscount(null)).toBeNull()
            expect(parseDiscount('')).toBeNull()
        })
    })

    describe('extractPageNumber', () => {
        it('should extract page numbers from URLs', () => {
            const { extractPageNumber } = fortisConfig

            expect(extractPageNumber('?page=5')).toBe(5)
            expect(extractPageNumber('/category?page=10&sort=asc')).toBe(10)
            expect(extractPageNumber('/category')).toBeNull()
        })
    })
})
