import { db } from './db.js'
import { normalizeProductName } from './matching/fuzzy-matcher.js'

export interface ProductComparison {
  canonicalName: string
  canonicalId: string
  stores: StorePrice[]
  cheapest: StorePrice | null
  mostExpensive: StorePrice | null
  priceDifference: number
  priceDifferencePercent: number
}

export interface StorePrice {
  storeName: string
  storeId: string
  productId: string
  productName: string
  price: number
  oldPrice: number | null
  hasDiscount: boolean
  discountPercent: number | null
  lastUpdated: Date
  sourceUrl: string | null
}

/**
 * Compare prices of a product across all stores using the matching system
 */
export async function compareProduct(query: string): Promise<ProductComparison | null> {
  const normalizedQuery = normalizeProductName(query)

  // First look for exact alias match
  const alias = await db.canonicalAlias.findUnique({
    where: { normalizedName: normalizedQuery },
    include: { canonicalProduct: true }
  })

  let canonicalId: string | null = alias?.canonicalProductId ?? null

  // If no exact alias, search with fuzzy matching
  if (!canonicalId) {
    await db.$executeRaw`SELECT set_limit(0.4)`

    const fuzzyResults = await db.$queryRaw<{ id: string; similarity: number }[]>`
      SELECT
        cp.id,
        similarity(cp."normalizedName", ${normalizedQuery}) as similarity
      FROM "CanonicalProduct" cp
      WHERE cp."normalizedName" % ${normalizedQuery}
      ORDER BY similarity DESC
      LIMIT 1
    `

    if (fuzzyResults.length > 0) {
      canonicalId = fuzzyResults[0].id
    }
  }

  if (!canonicalId) {
    return null
  }

  const canonical = await db.canonicalProduct.findUnique({
    where: { id: canonicalId }
  })

  if (!canonical) {
    return null
  }

  // Get all products matched to this canonical
  const matches = await db.productMatch.findMany({
    where: { canonicalProductId: canonicalId },
    include: {
      product: {
        include: {
          store: true,
          prices: {
            orderBy: { scrapedAt: 'desc' },
            take: 1
          }
        }
      }
    }
  })

  // Filter only those with prices
  const prices = matches
    .filter(m => m.product.prices.length > 0)
    .map(m => ({
      canonicalId: canonical.id,
      canonicalName: canonical.name,
      productId: m.product.id,
      productName: m.product.name,
      storeId: m.product.store.id,
      storeName: m.product.store.name,
      price: m.product.prices[0].price,
      oldPrice: m.product.prices[0].oldPrice,
      scrapedAt: m.product.prices[0].scrapedAt,
      sourceUrl: m.product.prices[0].sourceUrl
    }))
    .sort((a, b) => Number(a.price) - Number(b.price))

  if (prices.length === 0) {
    return null
  }

  const stores: StorePrice[] = prices.map(p => {
    const price = Number(p.price)
    const oldPrice = p.oldPrice ? Number(p.oldPrice) : null
    const hasDiscount = oldPrice !== null && oldPrice > price
    const discountPercent = hasDiscount && oldPrice
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : null

    return {
      storeName: p.storeName,
      storeId: p.storeId,
      productId: p.productId,
      productName: p.productName,
      price,
      oldPrice,
      hasDiscount,
      discountPercent,
      lastUpdated: p.scrapedAt,
      sourceUrl: p.sourceUrl
    }
  })

  const cheapest = stores[0] ?? null
  const mostExpensive = stores[stores.length - 1] ?? null
  const priceDifference = cheapest && mostExpensive
    ? mostExpensive.price - cheapest.price
    : 0
  const priceDifferencePercent = cheapest && mostExpensive && cheapest.price > 0
    ? Math.round(((mostExpensive.price - cheapest.price) / cheapest.price) * 100)
    : 0

  return {
    canonicalName: canonical.name,
    canonicalId: canonical.id,
    stores,
    cheapest,
    mostExpensive,
    priceDifference,
    priceDifferencePercent
  }
}

/**
 * Search for similar products and compare prices
 */
export async function searchAndCompare(query: string, limit: number = 10): Promise<ProductComparison[]> {
  const normalizedQuery = normalizeProductName(query)

  await db.$executeRaw`SELECT set_limit(0.3)`

  const canonicals = await db.$queryRaw<{ id: string; name: string; similarity: number }[]>`
    SELECT
      cp.id,
      cp.name,
      similarity(cp."normalizedName", ${normalizedQuery}) as similarity
    FROM "CanonicalProduct" cp
    WHERE cp."normalizedName" % ${normalizedQuery}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `

  const comparisons: ProductComparison[] = []

  for (const canonical of canonicals) {
    const comparison = await compareProduct(canonical.name)
    if (comparison && comparison.stores.length > 0) {
      comparisons.push(comparison)
    }
  }

  return comparisons
}

/**
 * Get products with the highest price difference between stores
 */
export async function getTopPriceDifferences(limit: number = 20): Promise<ProductComparison[]> {
  const multiStoreCanonicals = await db.$queryRaw<{ id: string; name: string; storeCount: bigint }[]>`
    SELECT
      cp.id,
      cp.name,
      COUNT(DISTINCT p."storeId") as "storeCount"
    FROM "CanonicalProduct" cp
    JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
    JOIN "Product" p ON p.id = pm."productId"
    GROUP BY cp.id
    HAVING COUNT(DISTINCT p."storeId") >= 2
    ORDER BY COUNT(DISTINCT p."storeId") DESC
    LIMIT 100
  `

  const comparisons: ProductComparison[] = []

  for (const canonical of multiStoreCanonicals) {
    const comparison = await compareProduct(canonical.name)
    if (comparison && comparison.stores.length >= 2) {
      comparisons.push(comparison)
    }
  }

  comparisons.sort((a, b) => b.priceDifferencePercent - a.priceDifferencePercent)

  return comparisons.slice(0, limit)
}

/**
 * Format a price in Guaranies
 */
export function formatPrice(price: number): string {
  return `₲ ${price.toLocaleString('es-PY')}`
}

/**
 * Get products with the highest price difference, grouped by category
 */
export async function getTopPriceDifferencesByCategory(
  limitPerCategory: number = 20
): Promise<Map<string, ProductComparison[]>> {
  const categories = await db.$queryRaw<{ category: string }[]>`
    SELECT DISTINCT p.category
    FROM "Product" p
    JOIN "ProductMatch" pm ON pm."productId" = p.id
    WHERE p.category IS NOT NULL
    ORDER BY p.category
  `

  const result = new Map<string, ProductComparison[]>()

  for (const { category } of categories) {
    const multiStoreCanonicals = await db.$queryRaw<{ id: string; name: string }[]>`
      SELECT DISTINCT cp.id, cp.name
      FROM "CanonicalProduct" cp
      JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
      JOIN "Product" p ON p.id = pm."productId"
      WHERE p.category = ${category}
      GROUP BY cp.id, cp.name
      HAVING COUNT(DISTINCT p."storeId") >= 2
      LIMIT 50
    `

    const comparisons: ProductComparison[] = []

    for (const canonical of multiStoreCanonicals) {
      const comparison = await compareProduct(canonical.name)
      if (comparison && comparison.stores.length >= 2) {
        comparisons.push(comparison)
      }
    }

    comparisons.sort((a, b) => b.priceDifferencePercent - a.priceDifferencePercent)
    result.set(category, comparisons.slice(0, limitPerCategory))
  }

  return result
}
