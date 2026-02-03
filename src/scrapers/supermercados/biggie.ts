import { biggieConfig, type BiggieRouteKey } from '../config/biggie'
import { db } from '../../lib/db'
import { scraperLog, logger } from '../../lib/logger'
import type { ScraperResult } from '../../types/index'
import {
    BaseScraper,
    BaseProduct,
    PageResult,
    parseCliArgs,
    showCliHeader,
    showCliSummary,
    saveIfRequested,
} from '../base'

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
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

interface BiggieProduct extends BaseProduct {
    oldPrice?: number
    discountPercent?: number
}

export class BiggieScraper extends BaseScraper<BiggieProduct, typeof biggieConfig, BiggieRouteKey> {
    protected config = biggieConfig

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
                    const { products, total } = await this.fetchApiPage(route.path, skip)
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

        return this.createResult(allProducts, errors, startTime)
    }

    // Biggie uses API, not HTML parsing
    parseHtml(_html: string, _sourceUrl: string, _category: string): PageResult<BiggieProduct> {
        return { products: [] }
    }

    private async fetchApiPage(classificationName: string, skip: number): Promise<{ products: BiggieProduct[]; total: number }> {
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
            const currentPrice = item.isOnOffer && item.priceSaleOffer > 0
                ? item.priceSaleOffer
                : item.price
            const oldPrice = item.isOnOffer && item.priceSaleOffer > 0
                ? item.price
                : undefined

            const imageUrl = item.images?.[0]?.src

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
                category: '',
            }
        }).filter(p => p.name && p.price > 0)
    }
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
    const args = parseCliArgs(process.argv.slice(2))
    const scraper = new BiggieScraper()

    showCliHeader('Biggie', args)

    let result: ScraperResult<BiggieProduct>

    if (args.specificRoute) {
        result = await scraper.scrapeRoute(args.specificRoute as BiggieRouteKey)
    } else {
        result = await scraper.scrapeAll()
    }

    showCliSummary(scraper.name, result, (products) => {
        logger.info('Examples:')
        products.slice(0, 3).forEach(p => {
            const discount = p.discountPercent ? ` (-${p.discountPercent}%)` : ''
            logger.log(`  ${p.name}: ${p.price.toLocaleString()}${discount}`)
        })
    })

    await saveIfRequested(scraper, result.data, args.saveToDb)
    await db.$disconnect()
}
