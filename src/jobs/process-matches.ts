import 'dotenv/config'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import type { Product, CanonicalProduct } from '../../generated/prisma/client.js'

const FUZZY_THRESHOLD = 0.4 // pg_trgm default threshold
const HIGH_CONFIDENCE_THRESHOLD = 0.85

interface MatchStats {
  total: number
  barcodeMatches: number
  aliasMatches: number
  fuzzyMatches: number
  newCanonicals: number
  skipped: number
  errors: number
}

interface FuzzyMatchResult {
  id: string
  normalizedName: string
  name: string
  similarity: number
}

/**
 * NIVEL 1: Match por barcode exacto
 * 100% confianza
 */
async function matchByBarcode(product: Product): Promise<CanonicalProduct | null> {
  if (!product.barcode) return null

  // Buscar canonical con mismo barcode
  const canonical = await db.canonicalProduct.findUnique({
    where: { primaryBarcode: product.barcode }
  })

  return canonical
}

/**
 * NIVEL 2: Match por alias conocido
 * 99% confianza
 */
async function matchByAlias(product: Product): Promise<CanonicalProduct | null> {
  const alias = await db.canonicalAlias.findUnique({
    where: { normalizedName: product.normalizedName },
    include: { canonicalProduct: true }
  })

  return alias?.canonicalProduct ?? null
}

/**
 * NIVEL 3: Match por similitud fuzzy con pg_trgm
 * 60-95% confianza dependiendo del score
 */
async function matchByFuzzy(product: Product): Promise<{ canonical: CanonicalProduct; confidence: number } | null> {
  const results = await db.$queryRaw<FuzzyMatchResult[]>`
    SELECT
      cp.id,
      cp."normalizedName",
      cp.name,
      similarity(cp."normalizedName", ${product.normalizedName}) as similarity
    FROM "CanonicalProduct" cp
    WHERE cp."normalizedName" % ${product.normalizedName}
    ORDER BY similarity DESC
    LIMIT 1
  `

  if (results.length === 0) return null

  const match = results[0]
  const canonical = await db.canonicalProduct.findUnique({ where: { id: match.id } })

  if (!canonical) return null

  return {
    canonical,
    confidence: match.similarity
  }
}

/**
 * Crea un nuevo CanonicalProduct a partir de un Product
 */
async function createCanonicalFromProduct(product: Product): Promise<CanonicalProduct> {
  return db.canonicalProduct.create({
    data: {
      name: product.name,
      normalizedName: product.normalizedName,
      brand: product.brand,
      category: product.category,
      quantity: product.quantity,
      unit: product.unit,
      primaryBarcode: product.barcode,
    }
  })
}

/**
 * Guarda un alias para un canonical product
 */
async function createAlias(normalizedName: string, canonicalId: string): Promise<void> {
  await db.canonicalAlias.upsert({
    where: { normalizedName },
    create: {
      normalizedName,
      canonicalProductId: canonicalId
    },
    update: {} // No actualizar si ya existe
  })
}

/**
 * Procesa un producto y crea/actualiza su match
 */
async function processProduct(product: Product, stats: MatchStats): Promise<void> {
  try {
    // Ya tiene match?
    const existingMatch = await db.productMatch.findUnique({
      where: { productId: product.id }
    })

    if (existingMatch?.isVerified) {
      stats.skipped++
      return
    }

    // NIVEL 1: Barcode
    let canonical = await matchByBarcode(product)
    if (canonical) {
      await db.productMatch.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          canonicalProductId: canonical.id,
          matchType: 'BARCODE',
          confidence: 1.0
        },
        update: {
          canonicalProductId: canonical.id,
          matchType: 'BARCODE',
          confidence: 1.0
        }
      })

      // Crear alias para este nombre
      await createAlias(product.normalizedName, canonical.id)
      stats.barcodeMatches++
      return
    }

    // NIVEL 2: Alias
    canonical = await matchByAlias(product)
    if (canonical) {
      await db.productMatch.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          canonicalProductId: canonical.id,
          matchType: 'ALIAS',
          confidence: 0.99
        },
        update: {
          canonicalProductId: canonical.id,
          matchType: 'ALIAS',
          confidence: 0.99
        }
      })
      stats.aliasMatches++
      return
    }

    // NIVEL 3: Fuzzy
    const fuzzyResult = await matchByFuzzy(product)
    if (fuzzyResult && fuzzyResult.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
      await db.productMatch.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          canonicalProductId: fuzzyResult.canonical.id,
          matchType: 'FUZZY',
          confidence: fuzzyResult.confidence
        },
        update: {
          canonicalProductId: fuzzyResult.canonical.id,
          matchType: 'FUZZY',
          confidence: fuzzyResult.confidence
        }
      })

      // Crear alias para matches con alta confianza
      await createAlias(product.normalizedName, fuzzyResult.canonical.id)
      stats.fuzzyMatches++
      return
    }

    // No hay match - crear nuevo canonical
    canonical = await createCanonicalFromProduct(product)
    await db.productMatch.create({
      data: {
        productId: product.id,
        canonicalProductId: canonical.id,
        matchType: product.barcode ? 'BARCODE' : 'FUZZY',
        confidence: 1.0 // Es el primer producto
      }
    })

    // Crear alias para el nombre
    await createAlias(product.normalizedName, canonical.id)
    stats.newCanonicals++

  } catch (error) {
    logger.error(`Error processing product ${product.id}:`, error)
    stats.errors++
  }
}

/**
 * Procesa todos los productos sin match o con match desactualizado
 */
async function processAllProducts(): Promise<MatchStats> {
  const stats: MatchStats = {
    total: 0,
    barcodeMatches: 0,
    aliasMatches: 0,
    fuzzyMatches: 0,
    newCanonicals: 0,
    skipped: 0,
    errors: 0
  }

  // Obtener productos sin match
  const unmatchedProducts = await db.product.findMany({
    where: {
      match: null
    },
    orderBy: [
      { barcode: 'desc' }, // Priorizar productos con barcode
      { createdAt: 'asc' }
    ]
  })

  stats.total = unmatchedProducts.length
  logger.info(`Processing ${unmatchedProducts.length} unmatched products...`)

  // Procesar en batches para no sobrecargar la DB
  const BATCH_SIZE = 100
  const batches = Math.ceil(unmatchedProducts.length / BATCH_SIZE)

  for (let i = 0; i < batches; i++) {
    const batch = unmatchedProducts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    const batchNum = i + 1

    logger.info(`Batch ${batchNum}/${batches} (${batch.length} products)`)

    for (const product of batch) {
      await processProduct(product, stats)
    }

    // Progress
    const processed = Math.min((i + 1) * BATCH_SIZE, unmatchedProducts.length)
    const percent = ((processed / unmatchedProducts.length) * 100).toFixed(1)
    logger.debug(`Progress: ${processed}/${unmatchedProducts.length} (${percent}%)`)
  }

  return stats
}

/**
 * Muestra estadísticas del sistema de matching
 */
async function showStats(): Promise<void> {
  const [
    totalProducts,
    totalMatches,
    totalCanonicals,
    totalAliases,
    matchesByType
  ] = await Promise.all([
    db.product.count(),
    db.productMatch.count(),
    db.canonicalProduct.count(),
    db.canonicalAlias.count(),
    db.productMatch.groupBy({
      by: ['matchType'],
      _count: { id: true }
    })
  ])

  // Productos con match por tienda
  const matchesByStore = await db.$queryRaw<{ store: string; matched: bigint; total: bigint }[]>`
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

  // Canonicals con múltiples tiendas
  const multiStoreCanonicals = await db.$queryRaw<{ count: bigint }[]>`
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
    'MATCHING SYSTEM STATS',
    '',
    `Total products: ${totalProducts.toLocaleString()}`,
    `Total matches: ${totalMatches.toLocaleString()}`,
    `Canonical products: ${totalCanonicals.toLocaleString()}`,
    `Aliases: ${totalAliases.toLocaleString()}`,
    `Multi-store canonicals: ${Number(multiStoreCanonicals[0]?.count ?? 0).toLocaleString()}`,
  ].join('\n'))

  // Matches by type
  logger.info('\nMatches by type:')
  for (const row of matchesByType) {
    console.log(`  ${row.matchType}: ${row._count.id}`)
  }

  // Matches by store
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
  const showStatsOnly = args.includes('--stats')

  logger.box([
    'PRODUCT MATCHING JOB',
    '',
    `Started: ${new Date().toISOString()}`,
  ].join('\n'))

  // Asegurar que pg_trgm está habilitado
  await db.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm`

  if (showStatsOnly) {
    await showStats()
  } else {
    const startTime = Date.now()
    const stats = await processAllProducts()
    const duration = Date.now() - startTime

    logger.box([
      'MATCHING COMPLETED',
      '',
      `Total processed: ${stats.total}`,
      `Barcode matches: ${stats.barcodeMatches}`,
      `Alias matches: ${stats.aliasMatches}`,
      `Fuzzy matches: ${stats.fuzzyMatches}`,
      `New canonicals: ${stats.newCanonicals}`,
      `Skipped (verified): ${stats.skipped}`,
      `Errors: ${stats.errors}`,
      '',
      `Duration: ${(duration / 1000).toFixed(1)}s`,
    ].join('\n'))

    // Show overall stats
    await showStats()
  }

  await db.$disconnect()
}

main().catch((error) => {
  logger.error('Fatal error:', error)
  process.exit(1)
})
