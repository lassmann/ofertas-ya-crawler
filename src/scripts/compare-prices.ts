import { db } from '../lib/db'
import { logger } from '../lib/logger'
import stringSimilarity from 'string-similarity'

interface ProductWithPrice {
  id: string
  name: string
  normalizedName: string
  category: string | null
  storeId: string
  storeName: string
  storeSlug: string
  price: number
  imageUrl: string | null
}

interface ProductMatch {
  product1: ProductWithPrice
  product2: ProductWithPrice
  similarity: number
  priceDiff: number
  priceDiffPercent: number
  cheaper: 'store1' | 'store2' | 'equal'
}

async function getProductsWithLatestPrice(): Promise<ProductWithPrice[]> {
  // Get the latest price for each product
  const products = await db.product.findMany({
    include: {
      store: true,
      prices: {
        orderBy: { scrapedAt: 'desc' },
        take: 1,
      },
    },
  })

  return products
    .filter(p => p.prices.length > 0)
    .map(p => ({
      id: p.id,
      name: p.name,
      normalizedName: p.normalizedName,
      category: p.category,
      storeId: p.storeId,
      storeName: p.store.name,
      storeSlug: p.store.slug,
      price: p.prices[0].price.toNumber(),
      imageUrl: p.imageUrl,
    }))
}

function findMatches(
  products: ProductWithPrice[],
  minSimilarity: number = 0.85
): ProductMatch[] {
  const matches: ProductMatch[] = []
  const stores = [...new Set(products.map(p => p.storeSlug))]

  if (stores.length < 2) {
    logger.error('Need at least 2 stores to compare')
    return []
  }

  // Group products by store
  const byStore = stores.reduce((acc, slug) => {
    acc[slug] = products.filter(p => p.storeSlug === slug)
    return acc
  }, {} as Record<string, ProductWithPrice[]>)

  // Compare products between stores
  const store1 = stores[0]
  const store2 = stores[1]

  logger.info(`Comparing ${byStore[store1].length} products from ${store1} with ${byStore[store2].length} from ${store2}...`)

  for (const p1 of byStore[store1]) {
    // Find the most similar product in the other store
    const names2 = byStore[store2].map(p => p.normalizedName)
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
      p1.normalizedName,
      names2
    )

    if (bestMatch.rating >= minSimilarity) {
      const p2 = byStore[store2][bestMatchIndex]
      const priceDiff = p1.price - p2.price
      const priceDiffPercent = (priceDiff / Math.max(p1.price, p2.price)) * 100

      matches.push({
        product1: p1,
        product2: p2,
        similarity: bestMatch.rating,
        priceDiff: Math.abs(priceDiff),
        priceDiffPercent: Math.abs(priceDiffPercent),
        cheaper: priceDiff > 0 ? 'store2' : priceDiff < 0 ? 'store1' : 'equal',
      })
    }
  }

  return matches
}

async function main() {
  const args = process.argv.slice(2)
  const minSimilarity = parseFloat(args.find(a => a.startsWith('--min='))?.split('=')[1] || '0.85')
  const showTop = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] || '20')
  const category = args.find(a => a.startsWith('--category='))?.split('=')[1]

  logger.box([
    '📊 Price Comparator',
    '',
    `   Minimum similarity: ${(minSimilarity * 100).toFixed(0)}%`,
    `   Showing top: ${showTop}`,
    category ? `   Category: ${category}` : '',
  ].filter(Boolean).join('\n'))

  // Get products
  let products = await getProductsWithLatestPrice()

  if (category) {
    products = products.filter(p => p.category?.toLowerCase().includes(category.toLowerCase()))
  }

  logger.info(`Total products: ${products.length}`)

  // Find matches
  const matches = findMatches(products, minSimilarity)

  logger.success(`Matches found: ${matches.length}`)

  // General statistics
  const store1Cheaper = matches.filter(m => m.cheaper === 'store1').length
  const store2Cheaper = matches.filter(m => m.cheaper === 'store2').length
  const equal = matches.filter(m => m.cheaper === 'equal').length

  const stores = [...new Set(products.map(p => p.storeSlug))]

  logger.box([
    '📈 Summary',
    '',
    `   ${stores[0]} cheaper: ${store1Cheaper} products`,
    `   ${stores[1]} cheaper: ${store2Cheaper} products`,
    `   Same price: ${equal} products`,
  ].join('\n'))

  // Top price differences (sorted by % difference)
  const topDifferences = matches
    .filter(m => m.cheaper !== 'equal')
    .sort((a, b) => b.priceDiffPercent - a.priceDiffPercent)
    .slice(0, showTop)

  logger.info(`🏷️  Top ${showTop} largest price differences:`)
  logger.log('─'.repeat(80))

  topDifferences.forEach((match, i) => {
    const cheaper = match.cheaper === 'store1' ? match.product1 : match.product2
    const expensive = match.cheaper === 'store1' ? match.product2 : match.product1

    logger.log(`${i + 1}. ${match.product1.name}`)
    logger.log(`   Similarity: ${(match.similarity * 100).toFixed(0)}%`)
    logger.log(`   💚 ${cheaper.storeName}: ₲ ${cheaper.price.toLocaleString()}`)
    logger.log(`   💸 ${expensive.storeName}: ₲ ${expensive.price.toLocaleString()}`)
    logger.log(`   📉 Difference: ₲ ${match.priceDiff.toLocaleString()} (${match.priceDiffPercent.toFixed(1)}%)`)
    logger.log('─'.repeat(80))
  })

  // Products where each store is cheaper
  logger.box('🛒 BEST DEALS BY STORE')

  for (const storeSlug of stores) {
    const storeWins = matches
      .filter(m =>
        (m.cheaper === 'store1' && m.product1.storeSlug === storeSlug) ||
        (m.cheaper === 'store2' && m.product2.storeSlug === storeSlug)
      )
      .sort((a, b) => b.priceDiffPercent - a.priceDiffPercent)
      .slice(0, 5)

    const storeName = products.find(p => p.storeSlug === storeSlug)?.storeName
    logger.info(`📍 ${storeName} - Top 5 cheapest products vs competition:`)

    storeWins.forEach((match, i) => {
      const ours = match.product1.storeSlug === storeSlug ? match.product1 : match.product2
      const theirs = match.product1.storeSlug === storeSlug ? match.product2 : match.product1

      logger.log(`   ${i + 1}. ${ours.name}`)
      logger.log(`      Here: ₲ ${ours.price.toLocaleString()} | Other: ₲ ${theirs.price.toLocaleString()} (-${match.priceDiffPercent.toFixed(1)}%)`)
    })
  }

  await db.$disconnect()
}

main().catch(logger.error)