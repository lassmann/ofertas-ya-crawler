import * as cheerio from 'cheerio'
import { stockConfig, type StockRouteKey } from '../config/stock'
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

interface StockProduct extends BaseProduct {
    inStock: boolean
}

export class StockScraper extends BaseScraper<StockProduct, typeof stockConfig, StockRouteKey> {
    protected config = stockConfig

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
                    const html = await this.fetchPage(currentUrl)
                    const { products, nextPageUrl } = this.parseHtml(html, currentUrl, route.category)
                    allProducts.push(...products)

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    currentUrl = nextPageUrl ?? null
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

        return this.createResult(allProducts, errors, startTime)
    }

    parseHtml(html: string, sourceUrl: string, category: string): PageResult<StockProduct> {
        const $ = cheerio.load(html)
        const products: StockProduct[] = []
        const { selectors, parsePrice, extractProductId } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            const isOutOfStock = $el.find(selectors.outOfStock).length > 0

            const nameEl = $el.find(selectors.name)
            const name = nameEl.text().trim()

            const productUrl = nameEl.attr('href')
            const fullUrl = productUrl || sourceUrl

            const imageUrl = $el.find(selectors.image).attr('src')

            const className = $el.attr('class')
            const externalId = extractProductId(className || '') || undefined

            const priceText = $el.find(selectors.price).text()
            const price = parsePrice(priceText)

            if (!name || !price) return

            products.push({
                name,
                price,
                imageUrl: imageUrl || undefined,
                sourceUrl: fullUrl,
                externalId,
                category,
                inStock: !isOutOfStock,
            })
        })

        // Find next page link - Stock uses .product-pager
        let nextPageUrl: string | null = null

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
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
    const args = parseCliArgs(process.argv.slice(2))
    const scraper = new StockScraper()

    showCliHeader('Stock', args)

    let result: ScraperResult<StockProduct>

    if (args.specificRoute) {
        result = await scraper.scrapeRoute(args.specificRoute as StockRouteKey)
    } else {
        result = await scraper.scrapeAll()
    }

    // Custom summary with inStock info
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
            const stock = p.inStock ? 'v' : 'x'
            logger.log(`  ${stock} ${p.name}: ${p.price.toLocaleString()}`)
        })
    }

    const byCategory = result.data.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    scraperLog.categories(scraper.name, byCategory)

    await saveIfRequested(scraper, result.data, args.saveToDb)
    await db.$disconnect()
}
