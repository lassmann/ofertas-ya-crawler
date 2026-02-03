import { db } from '../lib/db'
import { scraperLog, logger } from '../lib/logger'
import { parseProductName } from '../lib/matching/fuzzy-matcher'
import type { ScrapedProduct, ScraperResult } from '../types/index'

// ============================================================================
// INTERFACES
// ============================================================================

export interface BaseScraperConfig {
    name: string
    slug: string
    baseUrl: string
    routes: Record<string, { path: string; category: string }>
}

export interface BaseProduct extends ScrapedProduct {
    category: string
}

export interface PageResult<T> {
    products: T[]
    nextPageExists?: boolean
    nextPageUrl?: string | null
    totalPages?: number
}

// ============================================================================
// ABSTRACT BASE SCRAPER
// ============================================================================

export abstract class BaseScraper<
    TProduct extends BaseProduct,
    TConfig extends BaseScraperConfig,
    TRouteKey extends string
> {
    protected abstract config: TConfig

    get name() { return this.config.name }
    get slug() { return this.config.slug }

    // ========================================================================
    // ABSTRACT METHODS - Each scraper must implement these
    // ========================================================================

    /**
     * Scrape a single route/category. Each scraper implements its own pagination logic.
     */
    abstract scrapeRoute(routeKey: TRouteKey): Promise<ScraperResult<TProduct>>

    /**
     * Parse HTML and extract products. Returns products and pagination info.
     */
    abstract parseHtml(html: string, sourceUrl: string, category: string): PageResult<TProduct>

    // ========================================================================
    // COMMON METHODS - Shared by all scrapers
    // ========================================================================

    /**
     * Scrape all routes in batches of 3 in parallel.
     */
    async scrapeAll(options?: {
        onlyCategories?: TRouteKey[]
    }): Promise<ScraperResult<TProduct>> {
        const startTime = Date.now()
        const allProducts: TProduct[] = []
        const allErrors: string[] = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as TRouteKey[])

        const BATCH_SIZE = 3
        const BATCH_DELAY_MS = 500

        scraperLog.start(this.name, routeKeys.length)
        logger.info(`[${this.name}] Mode: ${BATCH_SIZE} in parallel, ${BATCH_DELAY_MS}ms between batches`)

        for (let i = 0; i < routeKeys.length; i += BATCH_SIZE) {
            const batch = routeKeys.slice(i, i + BATCH_SIZE)
            const batchNum = Math.floor(i / BATCH_SIZE) + 1
            const totalBatches = Math.ceil(routeKeys.length / BATCH_SIZE)

            scraperLog.batch(this.name, batchNum, totalBatches, batch)

            const results = await Promise.all(
                batch.map(routeKey => this.scrapeRoute(routeKey))
            )

            for (let j = 0; j < results.length; j++) {
                const result = results[j]
                const routeKey = batch[j]
                allProducts.push(...result.data)
                allErrors.push(...result.errors)
                scraperLog.route(this.name, routeKey, result.data.length)
            }

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

    /**
     * Save products to database. Handles store upsert, product upsert, and price creation.
     */
    async saveProducts(products: TProduct[]): Promise<{ saved: number; updated: number }> {
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
                                brand: product.brand,
                                isAvailable: true,
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
                            brand: product.brand,
                            isAvailable: true,
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
                            brand: product.brand,
                            isAvailable: true,
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

    /**
     * Detect products that weren't scraped in the last 24 hours.
     * This indicates they may have been removed or are out of stock.
     * Returns the count and list of stale products for reporting.
     */
    async detectStaleProducts(): Promise<{
        staleCount: number
        staleProducts: Array<{ name: string; hoursSinceLastScrape: number }>
    }> {
        const store = await db.store.findUnique({ where: { slug: this.slug } })
        if (!store) return { staleCount: 0, staleProducts: [] }

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const staleProducts = await db.$queryRaw<Array<{
            id: string
            name: string
            lastScrapedAt: Date
            hoursSinceLastScrape: number
        }>>`
            SELECT
                p.id,
                p.name,
                MAX(pr."scrapedAt") as "lastScrapedAt",
                EXTRACT(EPOCH FROM (NOW() - MAX(pr."scrapedAt"))) / 3600 as "hoursSinceLastScrape"
            FROM "Product" p
            JOIN "Price" pr ON p.id = pr."productId"
            WHERE p."storeId" = ${store.id}
                AND p."isHidden" = false
                AND p."isAvailable" = true
            GROUP BY p.id
            HAVING MAX(pr."scrapedAt") < ${oneDayAgo}
            ORDER BY "lastScrapedAt" ASC
        `

        if (staleProducts.length > 0) {
            logger.warn(`⚠️ [${this.name}] ${staleProducts.length} productos no scrapeados en >24h:`)
            for (const p of staleProducts.slice(0, 10)) {
                logger.warn(`  - ${p.name} (hace ${Math.round(p.hoursSinceLastScrape)}h)`)
            }
            if (staleProducts.length > 10) {
                logger.warn(`  ... y ${staleProducts.length - 10} más`)
            }
        } else {
            logger.success(`[${this.name}] Todos los productos fueron scrapeados recientemente`)
        }

        return {
            staleCount: staleProducts.length,
            staleProducts: staleProducts.map(p => ({
                name: p.name,
                hoursSinceLastScrape: Math.round(p.hoursSinceLastScrape)
            }))
        }
    }

    /**
     * Fetch a page with standard headers.
     */
    protected async fetchPage(url: string, extraHeaders?: Record<string, string>): Promise<string> {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                ...extraHeaders,
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.text()
    }

    /**
     * Normalize product name for deduplication.
     */
    protected normalizeName(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
    }

    /**
     * Delay helper for rate limiting.
     */
    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Create a ScraperResult object.
     */
    protected createResult(
        data: TProduct[],
        errors: string[],
        startTime: number
    ): ScraperResult<TProduct> {
        return {
            success: errors.length === 0,
            data,
            errors,
            scrapedAt: new Date(),
            duration: Date.now() - startTime,
        }
    }
}

// ============================================================================
// CLI HELPERS
// ============================================================================

export interface CliArgs {
    saveToDb: boolean
    onlyOfertas: boolean
    specificRoute: string | undefined
}

export function parseCliArgs(args: string[]): CliArgs {
    return {
        saveToDb: args.includes('--save'),
        onlyOfertas: args.includes('--ofertas'),
        specificRoute: args.find(a => a.startsWith('--route='))?.split('=')[1],
    }
}

export function showCliHeader(scraperName: string, args: CliArgs) {
    const mode = args.onlyOfertas
        ? 'Offers only'
        : args.specificRoute
            ? `Route: ${args.specificRoute}`
            : 'All categories'

    logger.box([
        `${scraperName} Scraper`,
        ``,
        `   Mode: ${mode}`,
        `   Save: ${args.saveToDb ? 'Yes' : 'No (use --save to save)'}`,
    ].join('\n'))
}

export function showCliSummary<T extends BaseProduct>(
    scraperName: string,
    result: ScraperResult<T>,
    showExamples: (products: T[]) => void = (products) => {
        logger.info('Examples:')
        products.slice(0, 3).forEach(p => {
            const priceStr = p.oldPrice
                ? `${p.price.toLocaleString()} (was ${p.oldPrice.toLocaleString()})`
                : `${p.price.toLocaleString()}`
            logger.log(`  ${p.name}: ${priceStr}`)
        })
    }
) {
    scraperLog.summary(scraperName, {
        total: result.data.length,
        errors: result.errors.length,
        duration: result.duration,
    })

    if (result.data.length > 0) {
        showExamples(result.data)
    }

    const byCategory = result.data.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    scraperLog.categories(scraperName, byCategory)
}

export async function saveIfRequested<T extends BaseProduct>(
    scraper: {
        saveProducts: (products: T[]) => Promise<{ saved: number; updated: number }>
        detectStaleProducts: () => Promise<{ staleCount: number; staleProducts: Array<{ name: string; hoursSinceLastScrape: number }> }>
        name: string
    },
    products: T[],
    saveToDb: boolean
) {
    if (saveToDb && products.length > 0) {
        logger.start('Guardando en base de datos...')
        const { saved, updated } = await scraper.saveProducts(products)
        scraperLog.saved(scraper.name, saved, updated)

        // Detectar productos stale después de guardar
        await scraper.detectStaleProducts()
    }
}
