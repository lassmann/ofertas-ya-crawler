import * as cheerio from 'cheerio'
import { casaricaConfig, type CasaRicaRouteKey } from '../config/casarica'
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

interface CasaRicaProduct extends BaseProduct {}

export class CasaRicaScraper extends BaseScraper<CasaRicaProduct, typeof casaricaConfig, CasaRicaRouteKey> {
    protected config = casaricaConfig

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

    parseHtml(html: string, sourceUrl: string, category: string): PageResult<CasaRicaProduct> {
        const $ = cheerio.load(html)
        const products: CasaRicaProduct[] = []
        const { selectors, parsePrice, extractExternalId, extractBarcode } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            const name = $el.find(selectors.name).text().trim()

            const productUrl = $el.attr('href')
            const fullUrl = productUrl
                ? (productUrl.startsWith('http') ? productUrl : `${this.config.baseUrl}/${productUrl}`)
                : sourceUrl

            const externalId = extractExternalId(productUrl) || undefined

            const $img = $el.find(selectors.image)
            const imageUrl = $img.attr('data-src') || $img.attr('src')

            const barcode = extractBarcode(imageUrl) || undefined

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

            products.push({
                name,
                price,
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
    const scraper = new CasaRicaScraper()

    showCliHeader('Casa Rica', args)

    let result: ScraperResult<CasaRicaProduct>

    if (args.specificRoute) {
        result = await scraper.scrapeRoute(args.specificRoute as CasaRicaRouteKey)
    } else {
        result = await scraper.scrapeAll()
    }

    showCliSummary(scraper.name, result)
    await saveIfRequested(scraper, result.data, args.saveToDb)
    await db.$disconnect()
}
