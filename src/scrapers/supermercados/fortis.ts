import * as cheerio from 'cheerio'
import { fortisConfig, type FortisRouteKey } from '../config/fortis'
import { db } from '../../lib/db.js'
import { scraperLog, logger } from '../../lib/logger'
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

    // Scrape a specific route
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

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    currentUrl = nextPageUrl
                    pageNum++

                    if (currentUrl) {
                        await this.delay(300)
                    }
                } catch (error) {
                    const msg = `Error in ${route.category} page ${pageNum}: ${error instanceof Error ? error.message : 'Unknown'}`
                    errors.push(msg)
                    scraperLog.error(this.name, msg)
                    break // Exit loop on error
                }
            }

            logger.success(`[${this.name}] ${route.category} - Total: ${allProducts.length} products in ${pageNum - 1} pages`)

        } catch (error) {
            const msg = `Error in ${route.category}: ${error instanceof Error ? error.message : 'Unknown error'}`
            errors.push(msg)
            scraperLog.error(this.name, msg)
        }

        return {
            success: errors.length === 0,
            data: allProducts,
            errors,
            scrapedAt: new Date(),
            duration: Date.now() - startTime,
        }
    }

    // Scrape all routes - BATCH MODE
    async scrapeAll(options?: {
        onlyCategories?: FortisRouteKey[]
    }): Promise<ScraperResult<FortisProduct>> {
        const startTime = Date.now()
        const allProducts: FortisProduct[] = []
        const allErrors: string[] = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as FortisRouteKey[])

        const BATCH_SIZE = 3
        const BATCH_DELAY_MS = 500

        scraperLog.start(this.name, routeKeys.length)
        logger.info(`[${this.name}] Mode: ${BATCH_SIZE} in parallel, ${BATCH_DELAY_MS}ms between batches`)

        // Process in batches of 3
        for (let i = 0; i < routeKeys.length; i += BATCH_SIZE) {
            const batch = routeKeys.slice(i, i + BATCH_SIZE)
            const batchNum = Math.floor(i / BATCH_SIZE) + 1
            const totalBatches = Math.ceil(routeKeys.length / BATCH_SIZE)

            scraperLog.batch(this.name, batchNum, totalBatches, batch)

            // Execute batch in parallel
            const results = await Promise.all(
                batch.map(routeKey => this.scrapeRoute(routeKey))
            )

            // Add results
            for (let j = 0; j < results.length; j++) {
                const result = results[j]
                const routeKey = batch[j]
                allProducts.push(...result.data)
                allErrors.push(...result.errors)
                scraperLog.route(this.name, routeKey, result.data.length)
            }

            // Delay between batches (except the last one)
            if (i + BATCH_SIZE < routeKeys.length) {
                await this.delay(BATCH_DELAY_MS)
            }
        }

        return {
            success: allErrors.length === 0,
            data: allProducts,
            errors: allErrors,
            scrapedAt: new Date(),
            duration: Date.now() - startTime,
        }
    }

    // Scrape a single page
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

    // Parse HTML and return products with next page URL
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

        // Find "next" link (rel="next" or › button)
        let nextPageUrl: string | null = null

        // Option 1: Search by rel="next"
        const nextLink = $('a[rel="next"]').first()
        if (nextLink.length > 0) {
            const href = nextLink.attr('href')
            if (href && !nextLink.hasClass('bg-cat')) {
                // El botón › tiene bg-cat, queremos el link numérico con rel="next"
                nextPageUrl = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`
            }
        }

        // Option 2: If rel="next" not found, look for › button with bg-cat
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

                // Create price record
                await db.price.create({
                    data: {
                        price: product.price,
                        oldPrice: product.precioMayorista, // Store wholesale price as reference
                        sourceUrl: product.sourceUrl,
                        productId: dbProduct.id,
                        storeId: store.id,
                    },
                })

            } catch (error) {
                logger.error(`Error saving "${product.name}":`, error)
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

    logger.box([
        `🛒 Fortis Scraper`,
        ``,
        `   Mode: ${specificRoute ? `Route: ${specificRoute}` : 'All categories'}`,
        `   Save: ${saveToDb ? 'Yes' : 'No (use --save to save)'}`,
    ].join('\n'))

    let result: ScraperResult<FortisProduct>

    if (specificRoute) {
        result = await scraper.scrapeRoute(specificRoute)
    } else {
        result = await scraper.scrapeAll()
    }

    // Final summary
    scraperLog.summary(scraper.name, {
        total: result.data.length,
        errors: result.errors.length,
        duration: result.duration,
    })

    // Show sample products
    if (result.data.length > 0) {
        logger.info('Sample products:')
        result.data.slice(0, 3).forEach(p => {
            logger.log(`  - ${p.name}`)
            logger.log(`    Unit price: ₲ ${p.price.toLocaleString()}`)
            if (p.precioMayorista) {
                logger.log(`    Wholesale price: ₲ ${p.precioMayorista.toLocaleString()} (from ${p.cantidadMayorista} units)`)
            }
        })
    }

    // Summary by category
    const byCategory = result.data.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    scraperLog.categories(scraper.name, byCategory)

    if (saveToDb && result.data.length > 0) {
        logger.start('Guardando en base de datos...')
        const { saved, updated } = await scraper.saveProducts(result.data)
        scraperLog.saved(scraper.name, saved, updated)
    }

    await db.$disconnect()
}
