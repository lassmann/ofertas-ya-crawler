import * as cheerio from 'cheerio'
import { casaricaConfig, type CasaRicaRouteKey } from '../config/casarica'
import { db } from '../../lib/db'
import { scraperLog, logger } from '../../lib/logger'
import type { ScrapedProduct, ScraperResult } from '../../types/index'

interface CasaRicaProduct extends ScrapedProduct {
    category: string
}

export class CasaRicaScraper {
    private config = casaricaConfig

    get name() { return this.config.name }
    get slug() { return this.config.slug }

    async scrapeRoute(routeKey: CasaRicaRouteKey): Promise<ScraperResult<CasaRicaProduct>> {
        const startTime = Date.now()
        const allProducts: CasaRicaProduct[] = []
        const errors: string[] = []
        const route = this.config.routes[routeKey]

        try {
            let pageNum = 1
            let hasMorePages = true

            while (hasMorePages) {
                const url = `${this.config.baseUrl}${this.config.buildPageUrl(route.path, pageNum)}`
                logger.debug(`[${this.name}] URL: ${url}`)

                try {
                    const { products, nextPageExists } = await this.scrapePage(url, route.category)
                    allProducts.push(...products)

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    // If no products found, stop pagination
                    if (products.length === 0) {
                        hasMorePages = false
                    } else {
                        hasMorePages = nextPageExists
                        pageNum++
                    }

                    if (hasMorePages) {
                        await this.delay(400)
                    }
                } catch (error) {
                    const msg = `Error in ${route.category} page ${pageNum}: ${error instanceof Error ? error.message : 'Unknown'}`
                    errors.push(msg)
                    scraperLog.error(this.name, msg)
                    break
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

    async scrapeAll(options?: {
        onlyCategories?: CasaRicaRouteKey[]
    }): Promise<ScraperResult<CasaRicaProduct>> {
        const startTime = Date.now()
        const allProducts: CasaRicaProduct[] = []
        const allErrors: string[] = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as CasaRicaRouteKey[])

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

    async scrapePage(url: string, category: string): Promise<{ products: CasaRicaProduct[]; nextPageExists: boolean }> {
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

    parseHtml(html: string, sourceUrl: string, category: string): { products: CasaRicaProduct[]; nextPageExists: boolean } {
        const $ = cheerio.load(html)
        const products: CasaRicaProduct[] = []
        const { selectors, parsePrice, extractExternalId, extractBarcode } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            // Extract name
            const name = $el.find(selectors.name).text().trim()

            // Product container IS the <a> link, so URL comes from $el.attr('href')
            const productUrl = $el.attr('href')
            const fullUrl = productUrl
                ? (productUrl.startsWith('http') ? productUrl : `${this.config.baseUrl}/${productUrl}`)
                : sourceUrl

            // Extract external ID from URL (e.g., "bebida-alpro-p12173" -> "12173")
            const externalId = extractExternalId(productUrl) || undefined

            // Extract image URL - try data-src first (lazy loading), fallback to src
            const $img = $el.find(selectors.image)
            const imageUrl = $img.attr('data-src') || $img.attr('src')

            // Extract barcode from image URL (e.g., ".../5411188110835.jpg" -> "5411188110835")
            const barcode = extractBarcode(imageUrl) || undefined

            // Extract price - get non-empty span.amount (skip empty ones inside <ins>)
            const priceContainer = $el.find(selectors.priceContainer)
            let priceText = ''
            priceContainer.find(selectors.regularPrice).each((_, priceEl) => {
                const text = $(priceEl).text().trim()
                if (text && !priceText) {
                    priceText = text
                }
            })
            const price = parsePrice(priceText)

            if (!name || !price) return

            const product: CasaRicaProduct = {
                name,
                price,
                imageUrl: imageUrl || undefined,
                sourceUrl: fullUrl,
                category,
                externalId,
                barcode,
            }

            products.push(product)
        })

        // Check if next page exists using a.next.page-numbers selector
        const nextPageExists = $(selectors.nextPage).length > 0

        return { products, nextPageExists }
    }

    async saveProducts(products: CasaRicaProduct[]): Promise<{ saved: number; updated: number }> {
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
                        barcode: product.barcode,
                        externalId: product.externalId,
                        updatedAt: new Date(),
                    },
                    create: {
                        name: product.name,
                        normalizedName,
                        imageUrl: product.imageUrl,
                        category: product.category,
                        barcode: product.barcode,
                        externalId: product.externalId,
                        storeId: store.id,
                    },
                })

                if (existing) {
                    updated++
                } else {
                    saved++
                }

                await db.price.create({
                    data: {
                        price: product.price,
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
    const scraper = new CasaRicaScraper()

    const saveToDb = args.includes('--save')
    const specificRoute = args.find(a => a.startsWith('--route='))?.split('=')[1] as CasaRicaRouteKey | undefined

    logger.box([
        `🛒 Casa Rica Scraper`,
        ``,
        `   Mode: ${specificRoute ? `Route: ${specificRoute}` : 'All categories'}`,
        `   Save: ${saveToDb ? 'Yes' : 'No (use --save to save)'}`,
    ].join('\n'))

    let result: ScraperResult<CasaRicaProduct>

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

    if (result.data.length > 0) {
        logger.info('Examples:')
        result.data.slice(0, 3).forEach(p => {
            logger.log(`  ${p.name}: ₲ ${p.price.toLocaleString()}`)
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
