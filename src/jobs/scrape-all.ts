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

async function runScraper<T extends ScrapedProduct>(scraper: Scraper<T>) {
  logger.info(`[${scraper.name}] Starting...`)

  try {
    const result = await scraper.scrapeAll()

    if (result.success && result.data.length > 0) {
      logger.start(`[${scraper.name}] Saving ${result.data.length} products...`)
      await scraper.saveProducts(result.data)
      logger.success(`[${scraper.name}] Completed in ${result.duration}ms`)
    } else {
      logger.warn(`[${scraper.name}] No data or with errors`)
      result.errors.forEach((e: string) => logger.error(`  ${e}`))
    }
  } catch (error) {
    logger.error(`[${scraper.name}] Fatal error:`, error)
  }

  // Pause between scrapers to avoid overload
  await new Promise(r => setTimeout(r, 2000))
}

async function main() {
  logger.box([
    '🕷️ OFERTAS-YA CRAWLER',
    '',
    `   Starting: ${new Date().toISOString()}`,
  ].join('\n'))

  await runScraper(new SuperseisScraper())
  await runScraper(new CasaRicaScraper())
  await runScraper(new FortisScraper())
  await runScraper(new StockScraper())
  await runScraper(new BiggieScraper())

  logger.box([
    '✅ Crawler Finished',
    '',
    `   ${new Date().toISOString()}`,
  ].join('\n'))

  await db.$disconnect()
}

main().catch(logger.error)
