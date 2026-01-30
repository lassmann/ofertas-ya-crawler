import { biggieConfig, type BiggieRouteKey } from '../config/biggie'
import { db } from '../../lib/db'
import { scraperLog, logger } from '../../lib/logger'
import type { ScrapedProduct, ScraperResult } from '../../types/index'

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9\s-]/g, '')    // Solo alfanuméricos, espacios y guiones
        .replace(/\s+/g, '-')            // Espacios a guiones
        .replace(/-+/g, '-')             // Múltiples guiones a uno
        .trim()
}

interface BiggieApiImage {
    id: number
    src: string
    type: number
}

interface BiggieApiBrand {
    id: number
    name: string
}

interface BiggieApiProduct {
    id: string
    code: string
    name: string
    price: number
    priceSaleOffer: number
    discountPercent: number
    isOnOffer: boolean
    brand: BiggieApiBrand | null
    unitOfMeasure: string | null
    images: BiggieApiImage[]
}

interface BiggieApiResponse {
    count: number
    items: BiggieApiProduct[]
}

interface BiggieProduct extends ScrapedProduct {
    category: string
}

export class BiggieScraper {
    private config = biggieConfig

    get name() { return this.config.name }
    get slug() { return this.config.slug }

    async scrapeRoute(routeKey: BiggieRouteKey): Promise<ScraperResult<BiggieProduct>> {
        const startTime = Date.now()
        const allProducts: BiggieProduct[] = []
        const errors: string[] = []
        const route = this.config.routes[routeKey]

        try {
            let skip = 0
            let totalCount = 0
            let pageNum = 1

            do {
                try {
                    const { products, total } = await this.fetchPage(route.path, skip)
                    totalCount = total
                    allProducts.push(...products.map(p => ({ ...p, category: route.category })))

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    skip += this.config.pageSize
                    pageNum++

                    if (skip < totalCount) {
                        await this.delay(400)
                    }
                } catch (error) {
                    const msg = `Error in ${route.category} page ${pageNum}: ${error instanceof Error ? error.message : 'Unknown'}`
                    errors.push(msg)
                    scraperLog.error(this.name, msg)
                    break
                }
            } while (skip < totalCount)

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
        onlyCategories?: BiggieRouteKey[]
    }): Promise<ScraperResult<BiggieProduct>> {
        const startTime = Date.now()
        const allProducts: BiggieProduct[] = []
        const allErrors: string[] = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as BiggieRouteKey[])

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

    async fetchPage(classificationName: string, skip: number): Promise<{ products: BiggieProduct[]; total: number }> {
        const url = `${this.config.apiUrl}?classificationName=${classificationName}&take=${this.config.pageSize}&skip=${skip}`

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'es-ES,es;q=0.9',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data: BiggieApiResponse = await response.json()
        const products = this.parseApiResponse(data.items)

        return { products, total: data.count }
    }

    private parseApiResponse(items: BiggieApiProduct[]): BiggieProduct[] {
        return items.map(item => {
            // When isOnOffer is true:
            // - price is the current (discounted) price
            // - priceSaleOffer is the original price
            const currentPrice = item.price
            const oldPrice = item.isOnOffer && item.priceSaleOffer > 0 ? item.priceSaleOffer : undefined

            // Get first image (type=0 is full size)
            const imageUrl = item.images?.[0]?.src

            // Construct product URL: https://biggie.com.py/item/{slug}-{code}
            const slug = slugify(item.name)
            const sourceUrl = `${this.config.baseUrl}/item/${slug}-${item.code}`

            return {
                name: item.name,
                price: currentPrice,
                oldPrice,
                discountPercent: item.discountPercent > 0 ? item.discountPercent : undefined,
                brand: item.brand?.name?.trim() || undefined,
                unit: item.unitOfMeasure?.trim() || undefined,
                imageUrl,
                sourceUrl,
                externalId: item.id,
                barcode: item.code,
                category: '', // Will be set in scrapeRoute
            }
        }).filter(p => p.name && p.price > 0)
    }

    async saveProducts(products: BiggieProduct[]): Promise<{ saved: number; updated: number }> {
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
                        brand: product.brand,
                        externalId: product.externalId,
                        barcode: product.barcode,
                        updatedAt: new Date(),
                    },
                    create: {
                        name: product.name,
                        normalizedName,
                        imageUrl: product.imageUrl,
                        category: product.category,
                        brand: product.brand,
                        externalId: product.externalId,
                        barcode: product.barcode,
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
    const scraper = new BiggieScraper()

    const saveToDb = args.includes('--save')
    const specificRoute = args.find(a => a.startsWith('--route='))?.split('=')[1] as BiggieRouteKey | undefined

    logger.box([
        `🛒 Biggie Scraper`,
        ``,
        `   Mode: ${specificRoute ? `Route: ${specificRoute}` : 'All categories'}`,
        `   Save: ${saveToDb ? 'Yes' : 'No (use --save to save)'}`,
    ].join('\n'))

    let result: ScraperResult<BiggieProduct>

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
            const discount = p.discountPercent ? ` (-${p.discountPercent}%)` : ''
            logger.log(`  ${p.name}: ₲ ${p.price.toLocaleString()}${discount}`)
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
