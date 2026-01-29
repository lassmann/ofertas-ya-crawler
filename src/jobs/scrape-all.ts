import 'dotenv/config'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger'
import { SuperseisScraper } from '../scrapers/supermercados/superseis.js'
import { CasaRicaScraper } from '../scrapers/supermercados/casarica.js'
import { FortisScraper } from '../scrapers/supermercados/fortis.js'
import { StockScraper } from '../scrapers/supermercados/stock.js'
import { BiggieScraper } from '../scrapers/supermercados/biggie.js'
import type { ScrapedProduct, ScraperResult } from '../types/index.js'

interface Scraper<T extends ScrapedProduct> {
  name: string
  scrapeAll(): Promise<ScraperResult<T>>
  saveProducts(products: T[]): Promise<{ saved: number; updated: number }>
}

async function runScraper<T extends ScrapedProduct>(scraper: Scraper<T>): Promise<{ name: string; success: boolean; count: number; duration: number }> {
  logger.info(`[${scraper.name}] Starting...`)

  try {
    const result = await scraper.scrapeAll()

    if (result.success && result.data.length > 0) {
      logger.start(`[${scraper.name}] Saving ${result.data.length} products...`)
      await scraper.saveProducts(result.data)
      logger.success(`[${scraper.name}] Completed in ${result.duration}ms`)
      return { name: scraper.name, success: true, count: result.data.length, duration: result.duration }
    } else {
      logger.warn(`[${scraper.name}] No data or with errors`)
      result.errors.forEach((e: string) => logger.error(`  ${e}`))
      return { name: scraper.name, success: false, count: 0, duration: result.duration }
    }
  } catch (error) {
    logger.error(`[${scraper.name}] Fatal error:`, error)
    throw error
  }
}

async function main() {
  const startTime = Date.now()

  logger.box([
    'OFERTAS-YA CRAWLER',
    '',
    `Starting: ${new Date().toISOString()}`,
  ].join('\n'))

  const scrapers = [
    new SuperseisScraper(),
    new CasaRicaScraper(),
    new FortisScraper(),
    new StockScraper(),
    new BiggieScraper(),
  ]

  // Run all scrapers in parallel
  const results = await Promise.allSettled(
    scrapers.map(scraper => runScraper(scraper))
  )

  // Summary
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
  const totalProducts = results
    .filter((r): r is PromiseFulfilledResult<{ name: string; success: boolean; count: number; duration: number }> =>
      r.status === 'fulfilled' && r.value.success)
    .reduce((sum, r) => sum + r.value.count, 0)

  const totalDuration = Date.now() - startTime

  logger.box([
    'CRAWLER FINISHED',
    '',
    `Successful: ${successful}/${scrapers.length}`,
    `Failed: ${failed}`,
    `Total products: ${totalProducts.toLocaleString()}`,
    `Total time: ${(totalDuration / 1000).toFixed(1)}s`,
    '',
    `${new Date().toISOString()}`,
  ].join('\n'))

  await db.$disconnect()
}

main().catch(logger.error)
