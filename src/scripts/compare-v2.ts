import 'dotenv/config'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import {
  compareProduct,
  searchAndCompare,
  getTopPriceDifferences,
  getTopPriceDifferencesByCategory,
  formatPrice,
  type ProductComparison
} from '../lib/compare.js'

function printComparison(comparison: ProductComparison, index?: number): void {
  const prefix = index !== undefined ? `${index + 1}. ` : ''

  console.log(`${prefix}${comparison.canonicalName}`)
  console.log(`   Stores: ${comparison.stores.length}`)

  for (const store of comparison.stores) {
    const discountLabel = store.hasDiscount
      ? ` (-${store.discountPercent}% from ${formatPrice(store.oldPrice!)})`
      : ''
    const marker = store === comparison.cheapest ? '💚' : store === comparison.mostExpensive ? '💸' : '  '

    console.log(`   ${marker} ${store.storeName}: ${formatPrice(store.price)}${discountLabel}`)
    if (store.sourceUrl) {
      console.log(`      🔗 ${store.sourceUrl}`)
    }
  }

  if (comparison.stores.length >= 2) {
    console.log(`   📉 Difference: ${formatPrice(comparison.priceDifference)} (${comparison.priceDifferencePercent}%)`)
  }
  console.log('─'.repeat(80))
}

async function showStats(): Promise<void> {
  const [
    totalProducts,
    totalMatches,
    totalCanonicals,
    matchesByStore
  ] = await Promise.all([
    db.product.count(),
    db.productMatch.count(),
    db.canonicalProduct.count(),
    db.$queryRaw<{ store: string; matched: bigint; total: bigint }[]>`
      SELECT
        s.name as store,
        COUNT(pm.id) as matched,
        COUNT(p.id) as total
      FROM "Product" p
      JOIN "Store" s ON s.id = p."storeId"
      LEFT JOIN "ProductMatch" pm ON pm."productId" = p.id
      GROUP BY s.name
      ORDER BY s.name
    `
  ])

  const multiStoreCount = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM (
      SELECT cp.id
      FROM "CanonicalProduct" cp
      JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
      JOIN "Product" p ON p.id = pm."productId"
      GROUP BY cp.id
      HAVING COUNT(DISTINCT p."storeId") >= 2
    ) sub
  `

  logger.box([
    'MATCHING SYSTEM STATUS',
    '',
    `Total products: ${totalProducts.toLocaleString()}`,
    `Total matches: ${totalMatches.toLocaleString()}`,
    `Canonical products: ${totalCanonicals.toLocaleString()}`,
    `Multi-store canonicals: ${Number(multiStoreCount[0]?.count ?? 0).toLocaleString()}`,
  ].join('\n'))

  logger.info('\nMatches by store:')
  for (const row of matchesByStore) {
    const matched = Number(row.matched)
    const total = Number(row.total)
    const percent = total > 0 ? ((matched / total) * 100).toFixed(1) : '0.0'
    console.log(`  ${row.store}: ${matched}/${total} (${percent}%)`)
  }
}

async function main() {
  const args = process.argv.slice(2)

  const query = args.find(a => !a.startsWith('--'))
  const showTop = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] || '20')
  const showStatsOnly = args.includes('--stats')
  const showDifferences = args.includes('--differences')

  const matchCount = await db.productMatch.count()

  if (matchCount === 0) {
    logger.warn('No matched products found. Run first: npm run match:process')
    await db.$disconnect()
    return
  }

  if (showStatsOnly) {
    await showStats()
    await db.$disconnect()
    return
  }

  if (showDifferences) {
    const byCategory = args.includes('--by-category')

    if (byCategory) {
      logger.box('TOP PRICE DIFFERENCES BY CATEGORY')

      const differencesByCategory = await getTopPriceDifferencesByCategory(showTop)

      if (differencesByCategory.size === 0) {
        logger.warn('No comparable products found in multiple stores')
      } else {
        for (const [category, comparisons] of differencesByCategory) {
          if (comparisons.length === 0) continue

          console.log(`\n${'═'.repeat(80)}`)
          logger.info(`📦 ${category.toUpperCase()} (${comparisons.length} products)`)
          console.log('═'.repeat(80))

          comparisons.forEach((comp, i) => printComparison(comp, i))
        }
      }
    } else {
      logger.box([
        'TOP PRICE DIFFERENCES',
        '',
        'Products with the highest price difference between stores',
      ].join('\n'))

      const differences = await getTopPriceDifferences(showTop)

      if (differences.length === 0) {
        logger.warn('No comparable products found in multiple stores')
      } else {
        differences.forEach((comp, i) => printComparison(comp, i))
      }
    }

    await db.$disconnect()
    return
  }

  if (query) {
    logger.box([
      'PRODUCT COMPARISON',
      '',
      `Query: "${query}"`,
    ].join('\n'))

    const exactMatch = await compareProduct(query)

    if (exactMatch && exactMatch.stores.length > 0) {
      logger.success('Match found:')
      printComparison(exactMatch)
    } else {
      logger.info('Searching similar products...')
      const results = await searchAndCompare(query, 10)

      if (results.length === 0) {
        logger.warn('No similar products found')
      } else {
        logger.success(`${results.length} products found:`)
        results.forEach((comp, i) => printComparison(comp, i))
      }
    }
  } else {
    logger.box([
      'PRICE COMPARATOR V2',
      '',
      'Usage:',
      '  npm run compare:v2 "coca cola 2l"     # Search product',
      '  npm run compare:v2 -- --differences   # Top differences',
      '  npm run compare:v2 -- --stats         # Statistics',
      '',
      'Options:',
      '  --top=N          Number of results (default: 20)',
      '  --differences    Show highest price differences',
      '  --by-category    Group differences by category',
      '  --stats          Show system statistics',
    ].join('\n'))
  }

  await db.$disconnect()
}

main().catch((error) => {
  logger.error('Error:', error)
  process.exit(1)
})
