import 'dotenv/config'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger.js'

interface SuspiciousMatch {
  canonicalId: string
  canonicalName: string
  products: {
    id: string
    name: string
    store: string
    price: number
  }[]
  minPrice: number
  maxPrice: number
  diffPercent: number
}

async function findSuspiciousMatches(threshold: number): Promise<SuspiciousMatch[]> {
  // Get all canonical products with their matched products and latest prices
  const canonicals = await db.canonicalProduct.findMany({
    include: {
      matches: {
        include: {
          product: {
            include: {
              store: true,
              prices: {
                orderBy: { scrapedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  const suspicious: SuspiciousMatch[] = []

  for (const canonical of canonicals) {
    // Skip if less than 2 matches
    if (canonical.matches.length < 2) continue

    // Get products with their latest price
    const products = canonical.matches
      .filter(m => m.product.prices.length > 0)
      .map(m => ({
        id: m.product.id,
        name: m.product.name,
        store: m.product.store.name,
        price: m.product.prices[0].price.toNumber(),
      }))

    // Skip if less than 2 products have prices
    if (products.length < 2) continue

    const prices = products.map(p => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    // Calculate percentage difference relative to min price
    const diffPercent = ((maxPrice - minPrice) / minPrice) * 100

    if (diffPercent >= threshold) {
      suspicious.push({
        canonicalId: canonical.id,
        canonicalName: canonical.name,
        products: products.sort((a, b) => a.price - b.price),
        minPrice,
        maxPrice,
        diffPercent,
      })
    }
  }

  // Sort by difference percentage (highest first)
  return suspicious.sort((a, b) => b.diffPercent - a.diffPercent)
}

function formatPrice(price: number): string {
  return `₲${price.toLocaleString('es-PY')}`
}

async function main() {
  const args = process.argv.slice(2)
  const thresholdArg = args.find(a => a.startsWith('--threshold='))
  const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1]) : 500

  logger.box([
    '🔍 Buscador de Matches Sospechosos',
    '',
    `   Threshold: >${threshold}% diferencia de precio`,
  ].join('\n'))

  const suspicious = await findSuspiciousMatches(threshold)

  if (suspicious.length === 0) {
    logger.success(`No se encontraron matches con diferencia >${threshold}%`)
    await db.$disconnect()
    return
  }

  console.log(`\n=== Matches sospechosos (>${threshold}% diferencia) ===\n`)

  suspicious.forEach((match, index) => {
    console.log(`${index + 1}. ${match.canonicalName} (ID: ${match.canonicalId})`)

    match.products.forEach(product => {
      const isMin = product.price === match.minPrice
      const isMax = product.price === match.maxPrice
      const marker = isMin ? '💚' : isMax ? '🔴' : '  '
      console.log(`   ${marker} ${product.store}: ${formatPrice(product.price)} (${product.name})`)
    })

    console.log(`   Diferencia: ${match.diffPercent.toFixed(0)}%`)
    console.log('')
  })

  console.log('─'.repeat(60))
  console.log(`Total: ${suspicious.length} matches sospechosos encontrados`)
  console.log('')
  console.log('Para remover un producto de su match:')
  console.log('  npm run unmatch -- --product-id=<id>')
  console.log('  npm run unmatch -- --canonical-id=<id> --store=<nombre>')

  await db.$disconnect()
}

main().catch(err => {
  logger.error(err)
  process.exit(1)
})
