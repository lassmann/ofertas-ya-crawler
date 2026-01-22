import * as cheerio from 'cheerio'
import { fortisConfig, type FortisRouteKey } from '../config/fortis'
import { db } from '../../lib/db.js'
import type { ScrapedProduct, ScraperResult } from '../../types/index'

interface FortisProduct extends ScrapedProduct {
    category: string
    precioMayorista?: number
    cantidadMayorista?: number
}

export class FortisScraper {
    private config = fortisConfig

    get name() { return this.config.name }
    get slug() { return this.config.slug }

    // Scrapear una ruta específica - NUEVA LÓGICA
    async scrapeRoute(routeKey: FortisRouteKey): Promise<ScraperResult<FortisProduct>> {
        const startTime = Date.now()
        const allProducts: FortisProduct[] = []
        const errors: string[] = []
        const route = this.config.routes[routeKey]

        try {
            let currentUrl: string | null = `${this.config.baseUrl}${route.path}`
            let pageNum = 1

            while (currentUrl) {
                try {
                    const { products, nextPageUrl } = await this.scrapePage(currentUrl, route.category)
                    allProducts.push(...products)

                    console.log(`[${this.name}] ${route.category} - Página ${pageNum} - ${products.length} productos`)

                    currentUrl = nextPageUrl
                    pageNum++

                    if (currentUrl) {
                        await this.delay(300)
                    }
                } catch (error) {
                    const msg = `Error en ${route.category} página ${pageNum}: ${error instanceof Error ? error.message : 'Unknown'}`
                    errors.push(msg)
                    console.error(`[${this.name}] ${msg}`)
                    break // Salir del loop si hay error
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

    // Scrapear todas las rutas
    async scrapeAll(options?: {
        onlyCategories?: FortisRouteKey[]
    }): Promise<ScraperResult<FortisProduct>> {
        const startTime = Date.now()
        const allProducts: FortisProduct[] = []
        const allErrors: string[] = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as FortisRouteKey[])

        console.log(`\n${'='.repeat(60)}`)
        console.log(`[${this.name}] Iniciando scrape de ${routeKeys.length} rutas`)
        console.log(`${'='.repeat(60)}\n`)

        for (const routeKey of routeKeys) {
            const result = await this.scrapeRoute(routeKey)
            allProducts.push(...result.data)
            allErrors.push(...result.errors)

            console.log(`[${this.name}] ✓ ${routeKey}: ${result.data.length} productos\n`)

            // Pausa entre categorías
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

    // Cambiar el return type de scrapePage
    async scrapePage(url: string, category: string): Promise<{ products: FortisProduct[]; nextPageUrl: string | null }> {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Cookie': this.config.cookies.subsidiaryId,
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const html = await response.text()
        return this.parseHtml(html, url, category)
    }

    // Actualizar parseHtml para retornar nextPageUrl
    parseHtml(html: string, sourceUrl: string, category: string): { products: FortisProduct[]; nextPageUrl: string | null } {
        const $ = cheerio.load(html)
        const products: FortisProduct[] = []
        const { selectors, parsePrice, parseCantidadMayorista } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            const nameEl = $el.find(selectors.name)
            const name = nameEl.text().trim()

            const productUrl = nameEl.attr('href')
            const fullUrl = productUrl ? `${this.config.baseUrl}${productUrl}` : sourceUrl

            const imageUrl = $el.find(selectors.image).attr('src')
            const productId = $el.attr('data-product-id')

            const precioMayoristaText = $el.find(selectors.priceMayorista).first().text()
            const precioUnitarioText = $el.find(selectors.priceUnitario).text()

            const precioMayorista = parsePrice(precioMayoristaText)
            const precioUnitario = parsePrice(precioUnitarioText)

            const cantidadText = $el.find(selectors.cantidadMayorista).text()
            const cantidadMayorista = parseCantidadMayorista(cantidadText)

            const price = precioUnitario || precioMayorista

            if (!name || !price) return

            const product: FortisProduct = {
                name,
                price,
                oldPrice: undefined,
                precioMayorista: precioMayorista || undefined,
                cantidadMayorista: cantidadMayorista || undefined,
                imageUrl,
                sourceUrl: fullUrl,
                productId,
                category,
            }

            products.push(product)
        })

        // Buscar link "siguiente" (rel="next" o el botón ›)
        let nextPageUrl: string | null = null

        // Opción 1: Buscar por rel="next"
        const nextLink = $('a[rel="next"]').first()
        if (nextLink.length > 0) {
            const href = nextLink.attr('href')
            if (href && !nextLink.hasClass('bg-cat')) {
                // El botón › tiene bg-cat, queremos el link numérico con rel="next"
                nextPageUrl = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`
            }
        }

        // Opción 2: Si no encontramos rel="next", buscar el botón › que tiene bg-cat
        if (!nextPageUrl) {
            const nextButton = $('a.page-link.bg-cat[rel="next"]')
            if (nextButton.length > 0) {
                const href = nextButton.attr('href')
                if (href) {
                    nextPageUrl = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`
                }
            }
        }

        return { products, nextPageUrl }
    }

    async saveProducts(products: FortisProduct[]): Promise<{ saved: number; updated: number }> {
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

                // Crear registro de precio
                await db.price.create({
                    data: {
                        price: product.price,
                        oldPrice: product.precioMayorista, // Guardamos mayorista como referencia
                        sourceUrl: product.sourceUrl,
                        productId: dbProduct.id,
                        storeId: store.id,
                    },
                })

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
    const scraper = new FortisScraper()

    const saveToDb = args.includes('--save')
    const specificRoute = args.find(a => a.startsWith('--route='))?.split('=')[1] as FortisRouteKey | undefined

    console.log(`\n🛒 Fortis Scraper`)
    console.log(`   Modo: ${specificRoute ? `Ruta: ${specificRoute}` : 'Todas las categorías'}`)
    console.log(`   Guardar: ${saveToDb ? 'Sí' : 'No (usar --save para guardar)'}\n`)

    let result: ScraperResult<FortisProduct>

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
    console.log(`- Productos únicos: ${new Set(result.data.map(p => p.name)).size}`)
    console.log(`- Errores: ${result.errors.length}`)
    console.log(`- Duración: ${(result.duration / 1000 / 60).toFixed(1)} minutos`)

    // Mostrar algunos productos de ejemplo
    if (result.data.length > 0) {
        console.log(`\nEjemplos de productos:`)
        result.data.slice(0, 3).forEach(p => {
            console.log(`  - ${p.name}`)
            console.log(`    Precio unitario: ₲ ${p.price.toLocaleString()}`)
            if (p.precioMayorista) {
                console.log(`    Precio mayorista: ₲ ${p.precioMayorista.toLocaleString()} (a partir de ${p.cantidadMayorista} unidades)`)
            }
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
