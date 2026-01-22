import 'dotenv/config'
import { db } from '../lib/db.js'
import { SuperseisScraper } from '../scrapers/supermercados/superseis.js'

async function main() {
  console.log('='.repeat(50))
  console.log('OFERTAS-YA CRAWLER')
  console.log(`Iniciando: ${new Date().toISOString()}`)
  console.log('='.repeat(50))

  const scrapers = [
    new SuperseisScraper(),
    // Agregar más scrapers aquí
  ]

  for (const scraper of scrapers) {
    console.log(`\n[${scraper.name}] Iniciando...`)

    try {
      const result = await scraper.scrapeAll()

      if (result.success && result.data.length > 0) {
        console.log(`[${scraper.name}] Guardando ${result.data.length} productos...`)
        await scraper.saveProducts(result.data)
        console.log(`[${scraper.name}] ✓ Completado en ${result.duration}ms`)
      } else {
        console.log(`[${scraper.name}] ✗ Sin datos o con errores`)
        result.errors.forEach((e: string) => console.log(`  Error: ${e}`))
      }
    } catch (error) {
      console.error(`[${scraper.name}] Error fatal:`, error)
    }

    // Pausa entre scrapers para no sobrecargar
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log('\n' + '='.repeat(50))
  console.log(`Finalizado: ${new Date().toISOString()}`)
  console.log('='.repeat(50))

  await db.$disconnect()
}

main().catch(console.error)
