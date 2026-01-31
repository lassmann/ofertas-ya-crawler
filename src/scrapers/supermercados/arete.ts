import * as cheerio from 'cheerio'
import { areteConfig, type AreteRouteKey } from '../config/arete'
import { db } from '../../lib/db'
import { scraperLog, logger } from '../../lib/logger'
import { parseProductName } from '../../lib/matching/fuzzy-matcher'
import type { ScrapedProduct, ScraperResult } from '../../types/index'

interface AreteProduct extends ScrapedProduct {
    category: string
    oldPrice?: number
}

export class AreteScraper {
    private config = areteConfig

    get name() { return this.config.name }
    get slug() { return this.config.slug }

    async scrapeRoute(routeKey: AreteRouteKey): Promise<ScraperResult<AreteProduct>> {
        const startTime = Date.now()
        const allProducts: AreteProduct[] = []
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
        onlyCategories?: AreteRouteKey[]
        onlyOfertas?: boolean
    }): Promise<ScraperResult<AreteProduct>> {
        const startTime = Date.now()
        const allProducts: AreteProduct[] = []
        const allErrors: string[] = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as AreteRouteKey[])

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

        // If onlyOfertas, filter to products with oldPrice (products on sale)
        const finalProducts = options?.onlyOfertas
            ? allProducts.filter(p => p.oldPrice !== undefined)
            : allProducts

        return {
            success: allErrors.length === 0,
            data: finalProducts,
            errors: allErrors,
            scrapedAt: new Date(),
            duration: Date.now() - startTime,
        }
    }

    async scrapePage(url: string, category: string): Promise<{ products: AreteProduct[]; nextPageExists: boolean }> {
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

    parseHtml(html: string, sourceUrl: string, category: string): { products: AreteProduct[]; nextPageExists: boolean } {
        const $ = cheerio.load(html)
        const products: AreteProduct[] = []
        const { selectors, parsePrice, extractExternalId, extractBarcode } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            // Get the link element inside the product container
            const $link = $el.find(selectors.productLink)

            // Extract name
            const name = $el.find(selectors.name).text().trim()

            // Product URL from the link
            const productUrl = $link.attr('href')
            const fullUrl = productUrl
                ? (productUrl.startsWith('http') ? productUrl : `${this.config.baseUrl}/${productUrl}`)
                : sourceUrl

            // Extract external ID from URL (e.g., "producto-p12173" -> "12173")
            const externalId = extractExternalId(productUrl) || undefined

            // Extract image URL - try data-src first (lazy loading), fallback to src
            const $img = $el.find(selectors.image)
            const imageUrl = $img.attr('data-src') || $img.attr('src')

            // Extract barcode from image URL (e.g., ".../5411188110835.jpg" -> "5411188110835")
            const barcode = extractBarcode(imageUrl) || undefined

            // Extract prices - handle both offer and regular prices
            const priceContainer = $el.find(selectors.priceContainer)
            let price: number | null = null
            let oldPrice: number | undefined

            // Check if product is on sale by looking for offer price in <ins>
            const offerPriceText = priceContainer.find(selectors.offerPrice).text().trim()

            if (offerPriceText) {
                // Product is on sale: ins has current price, del has old price
                price = parsePrice(offerPriceText)
                const oldPriceText = priceContainer.find(selectors.oldPrice).text().trim()
                oldPrice = parsePrice(oldPriceText) || undefined
            } else {
                // Regular product: get first non-empty span.amount
                priceContainer.find(selectors.regularPrice).each((_, priceEl) => {
                    const text = $(priceEl).text().trim()
                    if (text && !price) {
                        price = parsePrice(text)
                    }
                })
            }

            if (!name || !price) return

            const product: AreteProduct = {
                name,
                price,
                oldPrice,
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

    async saveProducts(products: AreteProduct[]): Promise<{ saved: number; updated: number }> {
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
            const parsed = parseProductName(normalizedName)

            if (seen.has(normalizedName)) continue
            seen.add(normalizedName)

            try {
                let dbProduct

                // First, try to find by externalId if available (more reliable identifier)
                if (product.externalId) {
                    const existingByExternalId = await db.product.findFirst({
                        where: {
                            storeId: store.id,
                            externalId: product.externalId,
                        },
                    })

                    if (existingByExternalId) {
                        // Update existing product found by externalId
                        dbProduct = await db.product.update({
                            where: { id: existingByExternalId.id },
                            data: {
                                name: product.name,
                                normalizedName,
                                baseNormalizedName: parsed.baseName,
                                quantity: parsed.quantity,
                                unit: parsed.unit,
                                imageUrl: product.imageUrl,
                                category: product.category,
                                barcode: product.barcode,
                                updatedAt: new Date(),
                            },
                        })
                        updated++
                    }
                }

                // If not found by externalId, upsert by normalizedName
                if (!dbProduct) {
                    const existing = await db.product.findUnique({
                        where: {
                            storeId_normalizedName: {
                                storeId: store.id,
                                normalizedName,
                            },
                        },
                    })

                    dbProduct = await db.product.upsert({
                        where: {
                            storeId_normalizedName: {
                                storeId: store.id,
                                normalizedName,
                            },
                        },
                        update: {
                            name: product.name,
                            baseNormalizedName: parsed.baseName,
                            quantity: parsed.quantity,
                            unit: parsed.unit,
                            imageUrl: product.imageUrl,
                            category: product.category,
                            barcode: product.barcode,
                            externalId: product.externalId,
                            updatedAt: new Date(),
                        },
                        create: {
                            name: product.name,
                            normalizedName,
                            baseNormalizedName: parsed.baseName,
                            quantity: parsed.quantity,
                            unit: parsed.unit,
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
                }

                await db.price.create({
                    data: {
                        price: product.price,
                        oldPrice: product.oldPrice,
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
    const scraper = new AreteScraper()

    const saveToDb = args.includes('--save')
    const onlyOfertas = args.includes('--ofertas')
    const specificRoute = args.find(a => a.startsWith('--route='))?.split('=')[1] as AreteRouteKey | undefined

    logger.box([
        `Areté Scraper`,
        ``,
        `   Mode: ${onlyOfertas ? 'Only offers' : (specificRoute ? `Route: ${specificRoute}` : 'All categories')}`,
        `   Save: ${saveToDb ? 'Yes' : 'No (use --save to save)'}`,
    ].join('\n'))

    let result: ScraperResult<AreteProduct>

    if (specificRoute) {
        result = await scraper.scrapeRoute(specificRoute)
        // Apply offers filter if --ofertas flag is used with --route
        if (onlyOfertas) {
            result.data = result.data.filter(p => p.oldPrice !== undefined)
        }
    } else {
        result = await scraper.scrapeAll({ onlyOfertas })
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
            const priceStr = p.oldPrice
                ? `₲ ${p.price.toLocaleString()} (was ₲ ${p.oldPrice.toLocaleString()})`
                : `₲ ${p.price.toLocaleString()}`
            logger.log(`  ${p.name}: ${priceStr}`)
        })
    } else {
        // Warn when no products found - may need to remove the route
        logger.warn(`No products found${specificRoute ? ` for route "${specificRoute}"` : ''}. Consider checking if the URL is valid or removing this route from the config.`)
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
