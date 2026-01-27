import * as cheerio from 'cheerio'
import { stockConfig, type StockRouteKey } from '../config/stock'
import { db } from '../../lib/db'
import type { ScrapedProduct, ScraperResult } from '../../types/index'

interface StockProduct extends ScrapedProduct {
    category: string
    inStock: boolean
}

export class StockScraper {
    private config = stockConfig

    get name() { return this.config.name }
    get slug() { return this.config.slug }

    async scrapeRoute(routeKey: StockRouteKey): Promise<ScraperResult<StockProduct>> {
        const startTime = Date.now()
        const allProducts: StockProduct[] = []
        const errors: string[] = []
        const route = this.config.routes[routeKey]

        try {
            let currentUrl: string | null = `${this.config.baseUrl}${route.path}`
            console.log(currentUrl)
            let pageNum = 1

            while (currentUrl) {
                try {
                    const { products, nextPageUrl } = await this.scrapePage(currentUrl, route.category)
                    allProducts.push(...products)

                    console.log(`[${this.name}] ${route.category} - Página ${pageNum} - ${products.length} productos`)

                    currentUrl = nextPageUrl
                    pageNum++

                    if (currentUrl) {
                        await this.delay(400)
                    }
                } catch (error) {
                    const msg = `Error en ${route.category} página ${pageNum}: ${error instanceof Error ? error.message : 'Unknown'}`
                    errors.push(msg)
                    console.error(`[${this.name}] ${msg}`)
                    break
                }
            }

            console.log(`[${this.name}] ${route.category} - Total: ${allProducts.length} productos en ${pageNum - 1} páginas`)

        } catch (error) {
            const msg = `Error en ${route.category}: ${error instanceof Error ? error.message : 'Error desconocido'}`
            errors.push(msg)
            console.error(`[${this.name}] ${msg}`)
        }

        return {
            success: errors.length === 0,
            data: allProducts,
            errors,
            scrapedAt: new Date(),
            duration: Date.now() - startTime,
        }
    }

    async scrapeAll(options?: {
        onlyCategories?: StockRouteKey[]
    }): Promise<ScraperResult<StockProduct>> {
        const startTime = Date.now()
        const allProducts: StockProduct[] = []
        const allErrors: string[] = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as StockRouteKey[])

        console.log(`\n${'='.repeat(60)}`)
        console.log(`[${this.name}] Iniciando scrape de ${routeKeys.length} rutas`)
        console.log(`${'='.repeat(60)}\n`)

        for (const routeKey of routeKeys) {
            const result = await this.scrapeRoute(routeKey)
            allProducts.push(...result.data)
            allErrors.push(...result.errors)

            console.log(`[${this.name}] ✓ ${routeKey}: ${result.data.length} productos\n`)

            await this.delay(1000)
        }

        return {
            success: allErrors.length === 0,
            data: allProducts,
            errors: allErrors,
            scrapedAt: new Date(),
            duration: Date.now() - startTime,
        }
    }

    async scrapePage(url: string, category: string): Promise<{ products: StockProduct[]; nextPageUrl: string | null }> {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const html = await response.text()
        return this.parseHtml(html, url, category)
    }

    parseHtml(html: string, sourceUrl: string, category: string): { products: StockProduct[]; nextPageUrl: string | null } {
        const $ = cheerio.load(html)
        const products: StockProduct[] = []
        const { selectors, parsePrice, extractProductId } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            // Verificar si está sin stock
            const isOutOfStock = $el.find(selectors.outOfStock).length > 0

            // Extraer nombre
            const nameEl = $el.find(selectors.name)
            const name = nameEl.text().trim()

            // Extraer URL
            const productUrl = nameEl.attr('href')
            const fullUrl = productUrl || sourceUrl

            // Extraer imagen
            const imageUrl = $el.find(selectors.image).attr('src')

            // Extraer product ID de la clase
            const className = $el.attr('class')
            const productId = extractProductId(className || '')

            // Extraer precio
            const priceText = $el.find(selectors.price).text()
            const price = parsePrice(priceText)

            if (!name || !price) return

            const product: StockProduct = {
                name,
                price,
                imageUrl: imageUrl || undefined,
                sourceUrl: fullUrl,
                productId: productId || undefined,
                category,
                inStock: !isOutOfStock,
            }

            products.push(product)
        })

        // Buscar link a siguiente página - Stock usa .product-pager
        let nextPageUrl: string | null = null

        // Buscar en la paginación de Stock
        const pagerLinks = $('.product-pager a')

        // Opción 1: Buscar link "Siguiente"
        pagerLinks.each((_, el) => {
            const $link = $(el)
            const text = $link.text().trim().toLowerCase()
            const href = $link.attr('href')

            if (href && text === 'siguiente') {
                nextPageUrl = href.startsWith('http') ? href : href
            }
        })

        // Opción 2: Si no hay "Siguiente", buscar la página actual + 1
        if (!nextPageUrl) {
            const currentPage = this.config.extractPageNumber(sourceUrl) || 1
            pagerLinks.each((_, el) => {
                const href = $(el).attr('href')
                if (href) {
                    const pageNum = this.config.extractPageNumber(href)
                    if (pageNum && pageNum === currentPage + 1) {
                        nextPageUrl = href.startsWith('http') ? href : href
                    }
                }
            })
        }

        return { products, nextPageUrl }
    }

    async saveProducts(products: StockProduct[]): Promise<{ saved: number; updated: number }> {
        const store = await db.store.upsert({
            where: { slug: this.slug },
            update: { lastScrapedAt: new Date() },
            create: {
                name: this.name,
                slug: this.slug,
                type: 'SUPERMERCADO',
                websiteUrl: this.config.baseUrl,
                isActive: true,
            },
        })

        let saved = 0
        let updated = 0
        const seen = new Set<string>()

        for (const product of products) {
            const normalizedName = this.normalizeName(product.name)

            if (seen.has(normalizedName)) continue
            seen.add(normalizedName)

            try {
                const existing = await db.product.findUnique({
                    where: {
                        storeId_normalizedName: {
                            storeId: store.id,
                            normalizedName,
                        },
                    },
                })

                const dbProduct = await db.product.upsert({
                    where: {
                        storeId_normalizedName: {
                            storeId: store.id,
                            normalizedName,
                        },
                    },
                    update: {
                        name: product.name,
                        imageUrl: product.imageUrl,
                        category: product.category,
                        updatedAt: new Date(),
                    },
                    create: {
                        name: product.name,
                        normalizedName,
                        imageUrl: product.imageUrl,
                        category: product.category,
                        storeId: store.id,
                    },
                })

                if (existing) {
                    updated++
                } else {
                    saved++
                }

                // Solo guardar precio si está en stock
                if (product.inStock) {
                    await db.price.create({
                        data: {
                            price: product.price,
                            sourceUrl: product.sourceUrl,
                            productId: dbProduct.id,
                            storeId: store.id,
                        },
                    })
                }

            } catch (error) {
                console.error(`Error guardando "${product.name}":`, error)
            }
        }

        return { saved, updated }
    }

    private normalizeName(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
    const args = process.argv.slice(2)
    const scraper = new StockScraper()

    const saveToDb = args.includes('--save')
    const specificRoute = args.find(a => a.startsWith('--route='))?.split('=')[1] as StockRouteKey | undefined

    console.log(`\n🛒 Stock Scraper`)
    console.log(`   Modo: ${specificRoute ? `Ruta: ${specificRoute}` : 'Todas las categorías'}`)
    console.log(`   Guardar: ${saveToDb ? 'Sí' : 'No (usar --save para guardar)'}\n`)

    let result: ScraperResult<StockProduct>

    if (specificRoute) {
        result = await scraper.scrapeRoute(specificRoute)
    } else {
        result = await scraper.scrapeAll()
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`RESULTADO FINAL`)
    console.log(`${'='.repeat(60)}`)
    console.log(`- Éxito: ${result.success}`)
    console.log(`- Productos totales: ${result.data.length}`)
    console.log(`- En stock: ${result.data.filter(p => p.inStock).length}`)
    console.log(`- Sin stock: ${result.data.filter(p => !p.inStock).length}`)
    console.log(`- Errores: ${result.errors.length}`)
    console.log(`- Duración: ${(result.duration / 1000 / 60).toFixed(1)} minutos`)

    if (result.data.length > 0) {
        console.log(`\nEjemplos:`)
        result.data.slice(0, 3).forEach(p => {
            const stock = p.inStock ? '✓' : '✗'
            console.log(`  ${stock} ${p.name}: ₲ ${p.price.toLocaleString()}`)
        })
    }

    // Resumen por categoría
    const byCategory = result.data.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    console.log(`\nProductos por categoría:`)
    Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => console.log(`  - ${cat}: ${count}`))

    if (saveToDb && result.data.length > 0) {
        console.log(`\n💾 Guardando en base de datos...`)
        const { saved, updated } = await scraper.saveProducts(result.data)
        console.log(`✓ Nuevos: ${saved} | Actualizados: ${updated}`)
    }

    await db.$disconnect()
}