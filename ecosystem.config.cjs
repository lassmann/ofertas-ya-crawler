module.exports = {
  apps: [{
    name: 'ofertas-ya-scraper',
    script: 'npm',
    args: 'run scrape',
    cron_restart: '0 12 * * *',  // Every day at 12:00
    autorestart: false,          // Don't restart after completion
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
