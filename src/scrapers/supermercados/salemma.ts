import * as cheerio from 'cheerio'
import { salemmaConfig, type SalemmaRouteKey } from '../config/salemma'
import { db } from '../../lib/db'
import { scraperLog, logger } from '../../lib/logger'
import type { ScrapedProduct, ScraperResult } from '../../types/index'

interface SalemmaProduct extends ScrapedProduct {
    category: string
}

export class SalemmaScraper {
    private config = salemmaConfig
    private emptyUrls: string[] = []

    get name() { return this.config.name }
    get slug() { return this.config.slug }

    async scrapeRoute(routeKey: SalemmaRouteKey): Promise<ScraperResult<SalemmaProduct>> {
        const startTime = Date.now()
        const allProducts: SalemmaProduct[] = []
        const errors: string[] = []
        const route = this.config.routes[routeKey]

        try {
            let pageNum = 1
            let hasMorePages = true

            while (hasMorePages) {
                const url = pageNum === 1
                    ? `${this.config.baseUrl}${route.path}`
                    : `${this.config.baseUrl}${route.path}?page=${pageNum}`

                try {
                    const { products, nextPageExists } = await this.scrapePage(url, route.category)
                    allProducts.push(...products)

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    // Track empty pages
                    if (products.length === 0) {
                        this.emptyUrls.push(url)
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
        includeOfertas?: boolean
        onlyCategories?: SalemmaRouteKey[]
    }): Promise<ScraperResult<SalemmaProduct>> {
        const startTime = Date.now()
        const allProducts: SalemmaProduct[] = []
        const allErrors: string[] = []
        this.emptyUrls = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as SalemmaRouteKey[])

        const routesToScrape = options?.includeOfertas === false
            ? routeKeys.filter(k => !k.startsWith('ofertas'))
            : routeKeys

        const BATCH_SIZE = 3
        const BATCH_DELAY_MS = 500

        scraperLog.start(this.name, routesToScrape.length)
        logger.info(`[${this.name}] Mode: ${BATCH_SIZE} in parallel, ${BATCH_DELAY_MS}ms between batches`)

        // Process in batches of 3
        for (let i = 0; i < routesToScrape.length; i += BATCH_SIZE) {
            const batch = routesToScrape.slice(i, i + BATCH_SIZE)
            const batchNum = Math.floor(i / BATCH_SIZE) + 1
            const totalBatches = Math.ceil(routesToScrape.length / BATCH_SIZE)

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
            if (i + BATCH_SIZE < routesToScrape.length) {
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

    async scrapeOfertas(): Promise<ScraperResult<SalemmaProduct>> {
        const ofertasRoutes = (Object.keys(this.config.routes) as SalemmaRouteKey[])
            .filter(k => k.startsWith('ofertas'))
        return this.scrapeAll({ onlyCategories: ofertasRoutes })
    }

    async scrapePage(url: string, category: string): Promise<{ products: SalemmaProduct[]; nextPageExists: boolean }> {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                // Cookie to bypass the modal/location popup
                'Cookie': 'salemma_location=1; salemma_modal_shown=1',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const html = await response.text()
        return this.parseHtml(html, url, category)
    }

    parseHtml(html: string, sourceUrl: string, category: string): { products: SalemmaProduct[]; nextPageExists: boolean } {
        const $ = cheerio.load(html)
        const products: SalemmaProduct[] = []
        const { selectors, parsePrice, parseDiscount, extractBarcode, buildFullUrl } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            // Combine brand + name
            const brand = $el.find(selectors.brand).text().trim()
            const productName = $el.find(selectors.name).text().trim()
            const name = brand && productName
                ? `${brand} ${productName}`
                : productName || brand

            // Price
            const priceText = $el.find(selectors.price).text()
            const price = parsePrice(priceText)

            if (!name || !price) return

            // URL
            const productPath = $el.find(selectors.url).attr('href')
            const fullUrl = buildFullUrl(this.config.baseUrl, productPath) || sourceUrl

            // Image URL (from picture source srcset)
            const imageUrl = $el.find(selectors.image).attr(selectors.imageAttr) || undefined

            // Extract barcode from image URL
            const barcode = extractBarcode(imageUrl) || undefined

            // External ID
            const externalId = $el.find(selectors.externalId).attr('value') || undefined

            // Discount
            const discountText = $el.find(selectors.discountPercent).text()
            const discountPercent = parseDiscount(discountText) || undefined

            const product: SalemmaProduct = {
                name,
                price,
                discountPercent,
                imageUrl,
                sourceUrl: fullUrl,
                category,
                externalId,
                barcode,
            }

            products.push(product)
        })

        // Check if next page exists
        const nextPageExists = $(selectors.nextPage).length > 0

        return { products, nextPageExists }
    }

    async saveProducts(products: SalemmaProduct[]): Promise<{ saved: number; updated: number; skipped: number }> {
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
        let skipped = 0
        const seenNames = new Set<string>()
        const seenExternalIds = new Set<string>()

        for (const product of products) {
            const normalizedName = this.normalizeName(product.name)

            // Skip duplicates by normalized name
            if (seenNames.has(normalizedName)) {
                skipped++
                continue
            }

            // Skip duplicates by externalId (unique constraint in DB)
            if (product.externalId && seenExternalIds.has(product.externalId)) {
                skipped++
                continue
            }

            seenNames.add(normalizedName)
            if (product.externalId) seenExternalIds.add(product.externalId)

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
                skipped++
            }
        }

        return { saved, updated, skipped }
    }

    getEmptyUrls(): string[] {
        return this.emptyUrls
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
    const scraper = new SalemmaScraper()

    const onlyOfertas = args.includes('--ofertas')
    const saveToDb = args.includes('--save')
    const specificRoute = args.find(a => a.startsWith('--route='))?.split('=')[1] as SalemmaRouteKey | undefined

    logger.box([
        `🛒 Salemma Scraper`,
        ``,
        `   Mode: ${onlyOfertas ? 'Offers only' : specificRoute ? `Route: ${specificRoute}` : 'All categories'}`,
        `   Save: ${saveToDb ? 'Yes' : 'No (use --save to save)'}`,
    ].join('\n'))

    let result: ScraperResult<SalemmaProduct>

    if (onlyOfertas) {
        result = await scraper.scrapeOfertas()
    } else if (specificRoute) {
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
        result.data.slice(0, 5).forEach(p => {
            const discount = p.discountPercent ? ` (${p.discountPercent}% OFF)` : ''
            const barcode = p.barcode ? ` [${p.barcode}]` : ''
            logger.log(`  ${p.name}: ₲ ${p.price.toLocaleString()}${discount}${barcode}`)
        })
    }

    // Summary by category
    const byCategory = result.data.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    scraperLog.categories(scraper.name, byCategory)

    // Show empty URLs if any
    const emptyUrls = scraper.getEmptyUrls()
    if (emptyUrls.length > 0) {
        logger.warn(`Empty URLs found: ${emptyUrls.length}`)
        emptyUrls.slice(0, 10).forEach(url => logger.log(`  ${url}`))
        if (emptyUrls.length > 10) {
            logger.log(`  ... and ${emptyUrls.length - 10} more`)
        }
    }

    if (saveToDb && result.data.length > 0) {
        logger.start('Guardando en base de datos...')
        const { saved, updated, skipped } = await scraper.saveProducts(result.data)
        scraperLog.saved(scraper.name, saved, updated)
        if (skipped > 0) {
            logger.warn(`Skipped ${skipped} products (duplicates or errors)`)
        }
    }

    await db.$disconnect()
}
