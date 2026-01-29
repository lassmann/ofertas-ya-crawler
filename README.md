# Ofertas-Ya Crawler

Web scraping system for Paraguayan supermarket prices. Scrapes product data (prices, discounts, categories) from multiple supermarkets and stores them in PostgreSQL for price comparison.

## Supported Supermarkets

- Superseis
- Casa Rica
- Fortis
- Stock
- Biggie

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL (local development)
npm run docker:up

# Push schema to database
npm run db:push
```

## Commands

### Scraping

```bash
# Run all scrapers (parallel execution, saves to DB)
npm run scrape

# Run individual scrapers (dry run, no DB save)
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
```

### Database

```bash
npm run docker:up         # Start PostgreSQL (port 5433)
npm run db:push           # Push schema to DB
npm run db:generate       # Generate Prisma client
npm run db:studio         # Prisma Studio GUI
```

### Utilities

```bash
npm run stats             # Database statistics
npm run compare           # Compare prices across stores
```

### Tests

```bash
npm run test              # Watch mode
npm run test:run          # Single run
```

## VPS Deployment (PM2)

### Prerequisites

- Node.js 18+
- PostgreSQL database
- PM2 installed globally

### Setup

1. Clone the repository:
```bash
git clone <repo-url>
cd ofertas-ya-crawler
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

`.env` file:
```
DATABASE_URL="postgresql://user:password@host:5432/ofertas_ya"
```

4. Run database migrations:
```bash
npm run db:push
```

5. Install PM2 globally:
```bash
npm install -g pm2
```

6. Start the cron job:
```bash
pm2 start ecosystem.config.cjs
```

7. Configure auto-start on system reboot:
```bash
pm2 startup    # Follow the instructions printed
pm2 save       # Save current process list
```

### PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs ofertas-ya-scraper

# View logs in real-time
pm2 logs ofertas-ya-scraper --lines 100

# Force manual execution
pm2 trigger ofertas-ya-scraper

# Restart the job
pm2 restart ofertas-ya-scraper

# Stop the job
pm2 stop ofertas-ya-scraper

# Remove from PM2
pm2 delete ofertas-ya-scraper
```

### Cron Schedule

The scraper runs daily at **12:00** (server timezone). To modify the schedule, edit `ecosystem.config.cjs`:

```javascript
cron_restart: '0 12 * * *'  // minute hour day month weekday
```

Common schedules:
- `0 12 * * *` - Every day at 12:00
- `0 */6 * * *` - Every 6 hours
- `0 8,20 * * *` - At 8:00 and 20:00

## Architecture

- **Cheerio** for HTML parsing (no browser automation)
- **Prisma** ORM with PostgreSQL
- **Parallel execution** - all scrapers run simultaneously
- Prices stored in Guaranies (PYG) as integers

## License

MIT
