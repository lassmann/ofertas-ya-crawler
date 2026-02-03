import * as cheerio from 'cheerio'
import { superseisConfig, type RouteKey } from '../config/superseis'
import { db } from '../../lib/db.js'
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

interface SuperseisProduct extends BaseProduct {
    oldPrice?: number
    discountPercent?: number
}

export class SuperseisScraper extends BaseScraper<SuperseisProduct, typeof superseisConfig, RouteKey> {
    protected config = superseisConfig

    async scrapeRoute(routeKey: RouteKey): Promise<ScraperResult<SuperseisProduct>> {
        const startTime = Date.now()
        const allProducts: SuperseisProduct[] = []
        const errors: string[] = []
        const route = this.config.routes[routeKey]

        try {
            const firstPageUrl = `${this.config.baseUrl}${route.path}`
            const firstPageHtml = await this.fetchPage(firstPageUrl)
            const { products, totalPages } = this.parseHtml(firstPageHtml, firstPageUrl, route.category)
            allProducts.push(...products)

            scraperLog.page(this.name, route.category, 1, products.length)

            for (let page = 2; page <= (totalPages ?? 1); page++) {
                try {
                    const pageUrl = `${firstPageUrl}?page=${page}`
                    const html = await this.fetchPage(pageUrl)
                    const { products: pageProducts } = this.parseHtml(html, pageUrl, route.category)
                    allProducts.push(...pageProducts)

                    scraperLog.page(this.name, route.category, page, pageProducts.length)

                    await this.delay(300)
                } catch (error) {
                    const msg = `Error in ${route.category} page ${page}: ${error instanceof Error ? error.message : 'Unknown'}`
                    errors.push(msg)
                    scraperLog.error(this.name, msg)
                }
            }

            logger.success(`[${this.name}] ${route.category} - Total: ${allProducts.length} products in ${totalPages} pages`)

        } catch (error) {
            const msg = `Error in ${route.category}: ${error instanceof Error ? error.message : 'Unknown error'}`
            errors.push(msg)
            scraperLog.error(this.name, msg)
        }

        return this.createResult(allProducts, errors, startTime)
    }

    async scrapeAll(options?: {
        includeOfertas?: boolean
        onlyCategories?: RouteKey[]
    }): Promise<ScraperResult<SuperseisProduct>> {
        const routeKeys = options?.onlyCategories ||
            (Object.keys(this.config.routes) as RouteKey[])

        const routesToScrape = options?.includeOfertas === false
            ? routeKeys.filter(k => k !== 'ofertas')
            : routeKeys

        return super.scrapeAll({ onlyCategories: routesToScrape })
    }

    async scrapeOfertas(): Promise<ScraperResult<SuperseisProduct>> {
        return this.scrapeRoute('ofertas')
    }

    parseHtml(html: string, sourceUrl: string, category: string): PageResult<SuperseisProduct> {
        const $ = cheerio.load(html)
        const products: SuperseisProduct[] = []
        const { selectors, parsePrice, parseDiscount, extractPageNumber } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            const name = $el.find(selectors.name).attr(selectors.nameAttr) ||
                $el.find(selectors.name).text().trim()

            const priceNew = parsePrice($el.find(selectors.priceNew).text())
            const priceOld = parsePrice($el.find(selectors.priceOld).text())

            if (!name || !priceNew) return

            products.push({
                name,
                price: priceNew,
                oldPrice: priceOld || undefined,
                discountPercent: parseDiscount($el.find(selectors.discountPercent).text()) || undefined,
                imageUrl: $el.find(selectors.image).attr('src') || undefined,
                sourceUrl: $el.find(selectors.url).attr('href') || sourceUrl,
                unit: $el.find(selectors.saleType).text().trim() || undefined,
                externalId: $el.find(selectors.productId).attr('data-product-id') || undefined,
                category,
            })
        })

        let totalPages = 1
        const lastPageLink = $(selectors.lastPage).attr('href')
        if (lastPageLink) {
            totalPages = extractPageNumber(lastPageLink) || 1
        }

        return { products, totalPages }
    }
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
    const args = parseCliArgs(process.argv.slice(2))
    const scraper = new SuperseisScraper()

    showCliHeader('Superseis', args)

    let result: ScraperResult<SuperseisProduct>

    if (args.onlyOfertas) {
        result = await scraper.scrapeOfertas()
    } else if (args.specificRoute) {
        result = await scraper.scrapeRoute(args.specificRoute as RouteKey)
    } else {
        result = await scraper.scrapeAll()
    }

    showCliSummary(scraper.name, result)
    await saveIfRequested(scraper, result.data, args.saveToDb)
    await db.$disconnect()
}
