import 'dotenv/config'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger'
import { SuperseisScraper } from '../scrapers/supermercados/superseis.js'

async function main() {
  logger.box([
    '🕷️ OFERTAS-YA CRAWLER',
    '',
    `   Starting: ${new Date().toISOString()}`,
  ].join('\n'))

  const scrapers = [
    new SuperseisScraper(),
    // Add more scrapers here
  ]

  for (const scraper of scrapers) {
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

  logger.box([
    '✅ Crawler Finished',
    '',
    `   ${new Date().toISOString()}`,
  ].join('\n'))

  await db.$disconnect()
}

main().catch(logger.error)
