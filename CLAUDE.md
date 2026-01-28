# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ofertas-Ya Crawler is a web scraping system for Paraguayan supermarket prices. It scrapes product data (prices, discounts, categories) from multiple supermarkets and stores them in PostgreSQL for price comparison.

## Common Commands

```bash
# Run all scrapers with database save
npm run scrape

# Run individual scrapers (dry run)
npm run scrape:superseis
npm run scrape:fortis
npm run scrape:stock

# Run with database save
npm run scrape:superseis:save
npm run scrape:fortis:save
npm run scrape:stock:save

# Scraper-specific options
npm run scrape:superseis -- --ofertas           # Only offers
npm run scrape:superseis -- --route=lacteos     # Specific category

# Tests
npm run test              # Watch mode
npm run test:run          # Single run

# Database
npm run docker:up         # Start PostgreSQL (port 5433)
npm run db:push           # Push schema to DB
npm run db:generate       # Generate Prisma client
npm run db:studio         # Prisma Studio GUI

# Utility scripts
npm run stats             # Database statistics
npm run compare           # Compare prices across stores
```

## Architecture

### Scraper Pattern
Each supermarket scraper follows a consistent structure in `src/scrapers/supermercados/`:
- Uses Cheerio for HTML parsing (not Playwright/browser automation)
- Config in `src/scrapers/config/{store}.ts` defines selectors, routes, and parse functions
- Scrapers process categories in batches of 3 in parallel with 500ms delay between batches
- Each scraper can run standalone via CLI with `--save` flag to persist to DB

### Key Files
- `src/scrapers/config/categories.ts` - Standardized category enum shared across all scrapers
- `src/lib/db.ts` - Prisma client singleton with PostgreSQL adapter
- `src/lib/logger.ts` - Consola-based logger with scraper-specific helpers
- `src/types/index.ts` - Shared types: `ScrapedProduct`, `ScraperResult`

### Database Schema
- `Store` - Supermarket metadata
- `Product` - Products identified by normalized name per store
- `Price` - Price history with timestamps (creates new record each scrape)
- `Bank`, `Promotion` - For future bank promotions feature

### Adding a New Scraper
1. Create config in `src/scrapers/config/{store}.ts` with selectors and routes
2. Create scraper class in `src/scrapers/supermercados/{store}.ts`
3. Implement: `scrapeRoute()`, `scrapePage()`, `parseHtml()`, `saveProducts()`
4. Add tests in `src/scrapers/__tests__/{store}.test.ts`
5. Add npm scripts to package.json

## Code Conventions

- ESM modules (`"type": "module"` in package.json)
- Path alias `@/*` maps to `src/*`
- Prices are in Guaraníes (PYG), stored as integers (no decimals)
- Product names are normalized (lowercase, no accents, no special chars) for deduplication
- Currency: Guaraníes symbol is `₲`

## GitHub CLI Note
Do not use `gh pr diff --stat` - that flag does not exist. Use `gh pr diff --name-only` or `git diff --stat` instead.
