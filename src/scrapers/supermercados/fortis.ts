import * as cheerio from 'cheerio'
import { fortisConfig, type FortisRouteKey } from '../config/fortis'
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

interface FortisProduct extends BaseProduct {
    precioMayorista?: number
    cantidadMayorista?: number
}

export class FortisScraper extends BaseScraper<FortisProduct, typeof fortisConfig, FortisRouteKey> {
    protected config = fortisConfig

    async scrapeRoute(routeKey: FortisRouteKey): Promise<ScraperResult<FortisProduct>> {
        const startTime = Date.now()
        const allProducts: FortisProduct[] = []
        const errors: string[] = []
        const route = this.config.routes[routeKey]

        try {
            let currentUrl: string | null = `${this.config.baseUrl}${route.path}`
            let pageNum = 1

            while (currentUrl) {
                try {
                    const html = await this.fetchPage(currentUrl, {
                        'Cookie': this.config.cookies.subsidiaryId,
                    })
                    const { products, nextPageUrl } = this.parseHtml(html, currentUrl, route.category)
                    allProducts.push(...products)

                    scraperLog.page(this.name, route.category, pageNum, products.length)

                    currentUrl = nextPageUrl ?? null
                    pageNum++

                    if (currentUrl) {
                        await this.delay(300)
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

    parseHtml(html: string, sourceUrl: string, category: string): PageResult<FortisProduct> {
        const $ = cheerio.load(html)
        const products: FortisProduct[] = []
        const { selectors, parsePrice, parseCantidadMayorista, extractBarcode } = this.config

        $(selectors.productContainer).each((_, element) => {
            const $el = $(element)

            const nameEl = $el.find(selectors.name)
            const name = nameEl.text().trim()

            const productUrl = nameEl.attr('href')
            const fullUrl = productUrl ? `${this.config.baseUrl}${productUrl}` : sourceUrl

            const imageUrl = $el.find(selectors.image).attr('src')
            const externalId = $el.attr('data-product-id')
            const barcode = extractBarcode(productUrl)

            const precioMayoristaText = $el.find(selectors.priceMayorista).first().text()
            const precioUnitarioText = $el.find(selectors.priceUnitario).text()

            const precioMayorista = parsePrice(precioMayoristaText)
            const precioUnitario = parsePrice(precioUnitarioText)

            const cantidadText = $el.find(selectors.cantidadMayorista).text()
            const cantidadMayorista = parseCantidadMayorista(cantidadText)

            const price = precioUnitario || precioMayorista

            if (!name || !price) return

            products.push({
                name,
                price,
                oldPrice: undefined,
                precioMayorista: precioMayorista || undefined,
                cantidadMayorista: cantidadMayorista || undefined,
                imageUrl,
                sourceUrl: fullUrl,
                externalId,
                barcode,
                category,
            })
        })

        // Find "next" link (rel="next" or > button)
        let nextPageUrl: string | null = null

        const nextLink = $('a[rel="next"]').first()
        if (nextLink.length > 0) {
            const href = nextLink.attr('href')
            if (href && !nextLink.hasClass('bg-cat')) {
                nextPageUrl = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`
            }
        }

        if (!nextPageUrl) {
            const nextButton = $('a.page-link.bg-cat[rel="next"]')
            if (nextButton.length > 0) {
                const href = nextButton.attr('href')
                if (href) {
                    nextPageUrl = href.startsWith('http') ? href : `${this.config.baseUrl}${href}`
                }
            }
        }

        return { products, nextPageUrl }
    }

    // Override saveProducts to handle precioMayorista in oldPrice field
    async saveProducts(products: FortisProduct[]): Promise<{ saved: number; updated: number }> {
        // Map precioMayorista to oldPrice for price storage
        const mappedProducts = products.map(p => ({
            ...p,
            oldPrice: p.precioMayorista,
        }))
        return super.saveProducts(mappedProducts)
    }
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
    const args = parseCliArgs(process.argv.slice(2))
    const scraper = new FortisScraper()

    showCliHeader('Fortis', args)

    let result: ScraperResult<FortisProduct>

    if (args.specificRoute) {
        result = await scraper.scrapeRoute(args.specificRoute as FortisRouteKey)
    } else {
        result = await scraper.scrapeAll()
    }

    showCliSummary(scraper.name, result, (products) => {
        logger.info('Sample products:')
        products.slice(0, 3).forEach(p => {
            logger.log(`  - ${p.name}`)
            logger.log(`    Unit price: ${p.price.toLocaleString()}`)
            if (p.precioMayorista) {
                logger.log(`    Wholesale price: ${p.precioMayorista.toLocaleString()} (from ${p.cantidadMayorista} units)`)
            }
        })
    })

    await saveIfRequested(scraper, result.data, args.saveToDb)
    await db.$disconnect()
}
