import { describe, it, expect, beforeEach } from 'vitest'
import { CasaRicaScraper } from '../supermercados/casarica'
import { casaricaConfig } from '../config/casarica'

describe('CasaRicaScraper', () => {
    let scraper: CasaRicaScraper

    beforeEach(() => {
        scraper = new CasaRicaScraper()
    })

    describe('config', () => {
        it('should have correct name and slug', () => {
            expect(scraper.name).toBe('Casa Rica')
            expect(scraper.slug).toBe('casarica')
        })

        it('should have correct baseUrl', () => {
            expect(casaricaConfig.baseUrl).toBe('https://www.casarica.com.py')
        })
    })

    describe('parseHtml', () => {
        it('should parse empty HTML correctly', () => {
            const html = '<html><body></body></html>'
            const result = scraper.parseHtml(html, 'https://www.casarica.com.py', 'test')

            expect(result.products).toHaveLength(0)
            expect(result.nextPageExists).toBe(false)
        })

        it('should parse products from Casa Rica HTML', () => {
            // Actual HTML structure: product container IS the <a> link itself
            const html = `
                <html>
                <body>
                    <a href="/producto/leche-1l" class="ecommercepro-LoopProduct-link">
                        <div class="product-list-image">
                            <img src="https://casarica.com.py/img/leche.jpg" alt="Leche Entera 1L" />
                        </div>
                        <span class="price">
                            <ins><span class="amount"></span></ins>
                            <span class="amount">₲. 14.950</span>
                        </span>
                        <h2 class="ecommercepro-loop-product__title">Leche Entera 1L</h2>
                    </a>
                </body>
                </html>
            `
            const result = scraper.parseHtml(html, 'https://www.casarica.com.py/catalogo/lacteos-c209', 'lacteos')

            expect(result.products).toHaveLength(1)
            expect(result.products[0].name).toBe('Leche Entera 1L')
            expect(result.products[0].price).toBe(14950)
            expect(result.products[0].imageUrl).toBe('https://casarica.com.py/img/leche.jpg')
            expect(result.products[0].category).toBe('lacteos')
        })

        it('should handle discounted products (get first non-empty price)', () => {
            // In actual HTML, <ins> has empty span.amount, actual price is outside
            const html = `
                <html>
                <body>
                    <a href="/producto/oferta" class="ecommercepro-LoopProduct-link">
                        <h2 class="ecommercepro-loop-product__title">Producto en Oferta</h2>
                        <span class="price">
                            <ins><span class="amount"></span></ins>
                            <span class="amount">₲. 15.000</span>
                        </span>
                    </a>
                </body>
                </html>
            `
            const result = scraper.parseHtml(html, 'https://www.casarica.com.py', 'test')

            expect(result.products).toHaveLength(1)
            expect(result.products[0].price).toBe(15000)
        })

        it('should detect next page from pagination', () => {
            const html = `
                <html>
                <body>
                    <a href="/producto/test" class="ecommercepro-LoopProduct-link">
                        <h2 class="ecommercepro-loop-product__title">Test Product</h2>
                        <span class="price"><span class="amount">₲. 10.000</span></span>
                    </a>
                    <ul class="page-numbers">
                        <a href="catalogo/almacen-c1.6" class="prev page-numbers">Prev</a>
                        <a href="catalogo/almacen-c1.8" class="next page-numbers">Next</a>
                    </ul>
                </body>
                </html>
            `
            const result = scraper.parseHtml(html, 'https://www.casarica.com.py/catalogo/almacen-c1.7', 'test')

            expect(result.products).toHaveLength(1)
            expect(result.nextPageExists).toBe(true)
        })

        it('should detect no next page when pagination ends', () => {
            const html = `
                <html>
                <body>
                    <a href="/producto/test" class="ecommercepro-LoopProduct-link">
                        <h2 class="ecommercepro-loop-product__title">Test Product</h2>
                        <span class="price"><span class="amount">₲. 10.000</span></span>
                    </a>
                    <ul class="page-numbers">
                        <a href="catalogo/almacen-c1.9" class="prev page-numbers">Prev</a>
                    </ul>
                </body>
                </html>
            `
            const result = scraper.parseHtml(html, 'https://www.casarica.com.py/catalogo/almacen-c1.10', 'test')

            expect(result.products).toHaveLength(1)
            expect(result.nextPageExists).toBe(false)
        })
    })

    describe('parsePrice', () => {
        it('should parse guarani prices correctly', () => {
            const { parsePrice } = casaricaConfig

            expect(parsePrice('₲. 14.950')).toBe(14950)
            expect(parsePrice('₲. 1.234.567')).toBe(1234567)
            expect(parsePrice('₲. 100')).toBe(100)
            expect(parsePrice('₲.50.000')).toBe(50000)
            expect(parsePrice(null)).toBeNull()
            expect(parsePrice('')).toBeNull()
        })

        it('should handle prices without guarani symbol', () => {
            const { parsePrice } = casaricaConfig

            expect(parsePrice('14.950')).toBe(14950)
            expect(parsePrice('100')).toBe(100)
        })
    })

    describe('extractPageNumber', () => {
        it('should extract page numbers from Casa Rica URLs', () => {
            const { extractPageNumber } = casaricaConfig

            expect(extractPageNumber('/catalogo/almacen-c1.2')).toBe(2)
            expect(extractPageNumber('/catalogo/almacen-c1.10')).toBe(10)
            expect(extractPageNumber('/catalogo/lacteos-c209.5')).toBe(5)
        })

        it('should return null for first page URLs', () => {
            const { extractPageNumber } = casaricaConfig

            expect(extractPageNumber('/catalogo/almacen-c1')).toBeNull()
            expect(extractPageNumber('/catalogo/lacteos-c209')).toBeNull()
        })
    })

    describe('buildPageUrl', () => {
        it('should build paginated URLs correctly', () => {
            const { buildPageUrl } = casaricaConfig

            expect(buildPageUrl('/catalogo/almacen-c1', 1)).toBe('/catalogo/almacen-c1')
            expect(buildPageUrl('/catalogo/almacen-c1', 2)).toBe('/catalogo/almacen-c1.2')
            expect(buildPageUrl('/catalogo/almacen-c1', 10)).toBe('/catalogo/almacen-c1.10')
        })
    })
})
