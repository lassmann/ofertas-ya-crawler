import * as cheerio from 'cheerio'
import { salemmaConfig, type SalemmaRouteKey } from '../config/salemma'
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

interface SalemmaProduct extends BaseProduct {
    discountPercent?: number
}

export class SalemmaScraper extends BaseScraper<SalemmaProduct, typeof salemmaConfig, SalemmaRouteKey> {
    protected config = salemmaConfig
    private emptyUrls: string[] = []

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
                    const html = await this.fetchPage(url, {
                        'Cookie': 'salemma_location=1; salemma_modal_shown=1',
                    })
                    const { products, nextPageExists } = this.parseHtml(html, url, route.category)
                    allProducts.push(...products)

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    if (products.length === 0) {
                        this.emptyUrls.push(url)
                        hasMorePages = false
                    } else {
                        hasMorePages = nextPageExists ?? false
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

        return this.createResult(allProducts, errors, startTime)
    }

    async scrapeAll(options?: {
        includeOfertas?: boolean
        onlyCategories?: SalemmaRouteKey[]
    }): Promise<ScraperResult<SalemmaProduct>> {
        this.emptyUrls = []

        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as SalemmaRouteKey[])

        const routesToScrape = options?.includeOfertas === false
            ? routeKeys.filter(k => !k.startsWith('ofertas'))
            : routeKeys

        return super.scrapeAll({ onlyCategories: routesToScrape })
    }

    async scrapeOfertas(): Promise<ScraperResult<SalemmaProduct>> {
        const ofertasRoutes = (Object.keys(this.config.routes) as SalemmaRouteKey[])
            .filter(k => k.startsWith('ofertas'))
        return this.scrapeAll({ onlyCategories: ofertasRoutes })
    }

    parseHtml(html: string, sourceUrl: string, category: string): PageResult<SalemmaProduct> {
        const $ = cheerio.load(html)
        const products: SalemmaProduct[] = []
        const { selectors, parsePrice, parseDiscount, extractBarcode, buildFullUrl } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            const brand = $el.find(selectors.brand).text().trim()
            const productName = $el.find(selectors.name).text().trim()
            const name = brand && productName
                ? `${brand} ${productName}`
                : productName || brand

            const priceText = $el.find(selectors.price).text()
            const price = parsePrice(priceText)

            if (!name || !price) return

            const productPath = $el.find(selectors.url).attr('href')
            const fullUrl = buildFullUrl(this.config.baseUrl, productPath) || sourceUrl

            const imageUrl = $el.find(selectors.image).attr(selectors.imageAttr) || undefined

            const barcode = extractBarcode(imageUrl) || undefined

            const externalId = $el.find(selectors.externalId).attr('value') || undefined

            const discountText = $el.find(selectors.discountPercent).text()
            const discountPercent = parseDiscount(discountText) || undefined

            products.push({
                name,
                price,
                discountPercent,
                imageUrl,
                sourceUrl: fullUrl,
                category,
                externalId,
                barcode,
            })
        })

        const nextPageExists = $(selectors.nextPage).length > 0

        return { products, nextPageExists }
    }

    // Override to track skipped products
    async saveProducts(products: SalemmaProduct[]): Promise<{ saved: number; updated: number }> {
        return super.saveProducts(products)
    }

    getEmptyUrls(): string[] {
        return this.emptyUrls
    }
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
    const args = parseCliArgs(process.argv.slice(2))
    const scraper = new SalemmaScraper()

    showCliHeader('Salemma', args)

    let result: ScraperResult<SalemmaProduct>

    if (args.onlyOfertas) {
        result = await scraper.scrapeOfertas()
    } else if (args.specificRoute) {
        result = await scraper.scrapeRoute(args.specificRoute as SalemmaRouteKey)
    } else {
        result = await scraper.scrapeAll()
    }

    showCliSummary(scraper.name, result, (products) => {
        logger.info('Examples:')
        products.slice(0, 5).forEach(p => {
            const discount = p.discountPercent ? ` (${p.discountPercent}% OFF)` : ''
            const barcode = p.barcode ? ` [${p.barcode}]` : ''
            logger.log(`  ${p.name}: ${p.price.toLocaleString()}${discount}${barcode}`)
        })
    })

    // Show empty URLs if any
    const emptyUrls = scraper.getEmptyUrls()
    if (emptyUrls.length > 0) {
        logger.warn(`Empty URLs found: ${emptyUrls.length}`)
        emptyUrls.slice(0, 10).forEach(url => logger.log(`  ${url}`))
        if (emptyUrls.length > 10) {
            logger.log(`  ... and ${emptyUrls.length - 10} more`)
        }
    }

    await saveIfRequested(scraper, result.data, args.saveToDb)
    await db.$disconnect()
}
