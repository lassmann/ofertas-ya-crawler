import * as cheerio from 'cheerio'
import { areteConfig, type AreteRouteKey } from '../config/arete'
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

interface AreteProduct extends BaseProduct {
    oldPrice?: number
}

export class AreteScraper extends BaseScraper<AreteProduct, typeof areteConfig, AreteRouteKey> {
    protected config = areteConfig

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
                    const html = await this.fetchPage(url)
                    const { products, nextPageExists } = this.parseHtml(html, url, route.category)
                    allProducts.push(...products)

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    if (products.length === 0) {
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
        onlyCategories?: AreteRouteKey[]
        onlyOfertas?: boolean
    }): Promise<ScraperResult<AreteProduct>> {
        const result = await super.scrapeAll({ onlyCategories: options?.onlyCategories })

        // If onlyOfertas, filter to products with oldPrice (products on sale)
        if (options?.onlyOfertas) {
            result.data = result.data.filter(p => p.oldPrice !== undefined)
        }

        return result
    }

    parseHtml(html: string, sourceUrl: string, category: string): PageResult<AreteProduct> {
        const $ = cheerio.load(html)
        const products: AreteProduct[] = []
        const { selectors, parsePrice, extractExternalId, extractBarcode } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            const $link = $el.find(selectors.productLink)
            const name = $el.find(selectors.name).text().trim()

            const productUrl = $link.attr('href')
            const fullUrl = productUrl
                ? (productUrl.startsWith('http') ? productUrl : `${this.config.baseUrl}/${productUrl}`)
                : sourceUrl

            const externalId = extractExternalId(productUrl) || undefined

            const $img = $el.find(selectors.image)
            const imageUrl = $img.attr('data-src') || $img.attr('src')

            const barcode = extractBarcode(imageUrl) || undefined

            const priceContainer = $el.find(selectors.priceContainer)
            let price: number | null = null
            let oldPrice: number | undefined

            const offerPriceText = priceContainer.find(selectors.offerPrice).text().trim()

            if (offerPriceText) {
                price = parsePrice(offerPriceText)
                const oldPriceText = priceContainer.find(selectors.oldPrice).text().trim()
                oldPrice = parsePrice(oldPriceText) || undefined
            } else {
                priceContainer.find(selectors.regularPrice).each((_, priceEl) => {
                    const text = $(priceEl).text().trim()
                    if (text && !price) {
                        price = parsePrice(text)
                    }
                })
            }

            if (!name || !price) return

            products.push({
                name,
                price,
                oldPrice,
                imageUrl: imageUrl || undefined,
                sourceUrl: fullUrl,
                category,
                externalId,
                barcode,
            })
        })

        const nextPageExists = $(selectors.nextPage).length > 0

        return { products, nextPageExists }
    }
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
    const args = parseCliArgs(process.argv.slice(2))
    const scraper = new AreteScraper()

    showCliHeader('Arete', args)

    let result: ScraperResult<AreteProduct>

    if (args.specificRoute) {
        result = await scraper.scrapeRoute(args.specificRoute as AreteRouteKey)
        if (args.onlyOfertas) {
            result.data = result.data.filter(p => p.oldPrice !== undefined)
        }
    } else {
        result = await scraper.scrapeAll({ onlyOfertas: args.onlyOfertas })
    }

    showCliSummary(scraper.name, result, (products) => {
        logger.info('Examples:')
        products.slice(0, 3).forEach(p => {
            const priceStr = p.oldPrice
                ? `${p.price.toLocaleString()} (was ${p.oldPrice.toLocaleString()})`
                : `${p.price.toLocaleString()}`
            logger.log(`  ${p.name}: ${priceStr}`)
        })
    })

    if (result.data.length === 0 && args.specificRoute) {
        logger.warn(`No products found for route "${args.specificRoute}". Consider checking if the URL is valid or removing this route from the config.`)
    }

    await saveIfRequested(scraper, result.data, args.saveToDb)
    await db.$disconnect()
}
