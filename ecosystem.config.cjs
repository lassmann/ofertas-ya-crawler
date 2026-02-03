module.exports = {
  apps: [
    {
      name: 'ofertas-ya-scraper',
      script: 'npm',
      args: 'run scrape',
      cwd: '/opt/ofertas-ya',
      cron_restart: '0 12 * * *',  // Every day at 12:00
      autorestart: false,          // Don't restart after completion
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'ofertas-ya-api',
      script: 'npm',
      args: 'run start:api',
      cwd: '/opt/ofertas-ya',
      autorestart: true,           // Restart if crashes
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
