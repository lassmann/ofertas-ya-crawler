import * as cheerio from 'cheerio'
import { stockConfig, type StockRouteKey } from '../config/stock'
import { db } from '../../lib/db'
import { scraperLog, logger } from '../../lib/logger'
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
            logger.debug(`[${this.name}] URL: ${currentUrl}`)
            let pageNum = 1

            while (currentUrl) {
                try {
                    const { products, nextPageUrl } = await this.scrapePage(currentUrl, route.category)
                    allProducts.push(...products)

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    currentUrl = nextPageUrl
                    pageNum++

                    if (currentUrl) {
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
        onlyCategories?: StockRouteKey[]
    }): Promise<ScraperResult<StockProduct>> {
        const startTime = Date.now()
        const allProducts: StockProduct[] = []
        const allErrors: string[] = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as StockRouteKey[])

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

            // Check if out of stock
            const isOutOfStock = $el.find(selectors.outOfStock).length > 0

            // Extract name
            const nameEl = $el.find(selectors.name)
            const name = nameEl.text().trim()

            // Extract URL
            const productUrl = nameEl.attr('href')
            const fullUrl = productUrl || sourceUrl

            // Extract image
            const imageUrl = $el.find(selectors.image).attr('src')

            // Extract product ID from class
            const className = $el.attr('class')
            const externalId = extractProductId(className || '') || undefined

            // Extract price
            const priceText = $el.find(selectors.price).text()
            const price = parsePrice(priceText)

            if (!name || !price) return

            const product: StockProduct = {
                name,
                price,
                imageUrl: imageUrl || undefined,
                sourceUrl: fullUrl,
                externalId,
                category,
                inStock: !isOutOfStock,
            }

            products.push(product)
        })

        // Find next page link - Stock uses .product-pager
        let nextPageUrl: string | null = null

        // Search in Stock pagination
        const pagerLinks = $('.product-pager a')

        // Option 1: Find "Next" link
        pagerLinks.each((_, el) => {
            const $link = $(el)
            const text = $link.text().trim().toLowerCase()
            const href = $link.attr('href')

            if (href && text === 'siguiente') {
                nextPageUrl = href.startsWith('http') ? href : href
            }
        })

        // Option 2: If no "Next", find current page + 1
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
                        externalId: product.externalId,
                        updatedAt: new Date(),
                    },
                    create: {
                        name: product.name,
                        normalizedName,
                        imageUrl: product.imageUrl,
                        category: product.category,
                        externalId: product.externalId,
                        storeId: store.id,
                    },
                })

                if (existing) {
                    updated++
                } else {
                    saved++
                }

                // Only save price if in stock
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
    const scraper = new StockScraper()

    const saveToDb = args.includes('--save')
    const specificRoute = args.find(a => a.startsWith('--route='))?.split('=')[1] as StockRouteKey | undefined

    logger.box([
        `🛒 Stock Scraper`,
        ``,
        `   Mode: ${specificRoute ? `Route: ${specificRoute}` : 'All categories'}`,
        `   Save: ${saveToDb ? 'Yes' : 'No (use --save to save)'}`,
    ].join('\n'))

    let result: ScraperResult<StockProduct>

    if (specificRoute) {
        result = await scraper.scrapeRoute(specificRoute)
    } else {
        result = await scraper.scrapeAll()
    }

    // Final summary
    scraperLog.summary(scraper.name, {
        total: result.data.length,
        inStock: result.data.filter(p => p.inStock).length,
        outOfStock: result.data.filter(p => !p.inStock).length,
        errors: result.errors.length,
        duration: result.duration,
    })

    if (result.data.length > 0) {
        logger.info('Examples:')
        result.data.slice(0, 3).forEach(p => {
            const stock = p.inStock ? '✓' : '✗'
            logger.log(`  ${stock} ${p.name}: ₲ ${p.price.toLocaleString()}`)
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