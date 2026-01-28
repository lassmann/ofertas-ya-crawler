import { createConsola, LogLevels } from 'consola'

// Main logger with pretty configuration
export const logger = createConsola({
    level: LogLevels.debug,
    formatOptions: {
        date: true,
        colors: true,
        compact: false,
    },
})

// Create scraper-specific loggers
export function createScraperLogger(scraperName: string) {
    return logger.withTag(scraperName)
}

// Helpers for scraper logging
export const scraperLog = {
    start: (scraper: string, routes: number) => {
        logger.box(`🛒 ${scraper} Scraper\n${routes} routes to process`)
    },

    batch: (scraper: string, batchNum: number, total: number, routes: string[]) => {
        logger.info(`[${scraper}] Batch ${batchNum}/${total}: ${routes.join(', ')}`)
    },

    route: (scraper: string, route: string, products: number) => {
        logger.success(`[${scraper}] ${route}: ${products} productos`)
    },

    page: (scraper: string, category: string, page: number, products: number) => {
        logger.debug(`[${scraper}] ${category} - Page ${page}: ${products} products`)
    },

    error: (scraper: string, message: string) => {
        logger.error(`[${scraper}] ${message}`)
    },

    warn: (scraper: string, message: string) => {
        logger.warn(`[${scraper}] ${message}`)
    },

    summary: (scraper: string, stats: {
        total: number
        inStock?: number
        outOfStock?: number
        errors: number
        duration: number
    }) => {
        const minutes = (stats.duration / 1000 / 60).toFixed(1)

        logger.box([
            `📊 ${scraper} - Summary`,
            ``,
            `   Total: ${stats.total} products`,
            stats.inStock !== undefined ? `   In stock: ${stats.inStock}` : '',
            stats.outOfStock !== undefined ? `   Out of stock: ${stats.outOfStock}` : '',
            `   Errors: ${stats.errors}`,
            `   Duration: ${minutes} min`,
        ].filter(Boolean).join('\n'))
    },

    saved: (scraper: string, saved: number, updated: number) => {
        logger.success(`[${scraper}] 💾 Saved: ${saved} new, ${updated} updated`)
    },

    categories: (scraper: string, byCategory: Record<string, number>) => {
        const lines = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => `   ${cat}: ${count}`)
            .join('\n')

        logger.info(`[${scraper}] By category:\n${lines}`)
    },
}

export default logger
