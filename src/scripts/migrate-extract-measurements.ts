import 'dotenv/config'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { parseProductName } from '../lib/matching/fuzzy-matcher.js'

interface MigrationStats {
  productsProcessed: number
  productsWithMeasures: number
  canonicalsProcessed: number
  canonicalsWithMeasures: number
  errors: number
}

const BATCH_SIZE = 500

async function migrateProducts(stats: MigrationStats): Promise<void> {
  logger.info('Fetching all products...')

  const totalProducts = await db.product.count()
  logger.info(`Found ${totalProducts.toLocaleString()} products to process`)

  const batches = Math.ceil(totalProducts / BATCH_SIZE)

  for (let i = 0; i < batches; i++) {
    const products = await db.product.findMany({
      select: { id: true, name: true },
      skip: i * BATCH_SIZE,
      take: BATCH_SIZE,
    })

    const updates: Array<{ id: string; data: { baseNormalizedName: string; quantity: number | null; unit: string | null } }> = []

    for (const product of products) {
      try {
        // IMPORTANTE: Usar nombre ORIGINAL para preservar decimales
        const parsed = parseProductName(product.name)

        updates.push({
          id: product.id,
          data: {
            baseNormalizedName: parsed.baseName,
            quantity: parsed.quantity,
            unit: parsed.unit,
          },
        })

        if (parsed.quantity !== null) {
          stats.productsWithMeasures++
        }
        stats.productsProcessed++
      } catch (error) {
        logger.error(`Error parsing product ${product.id}:`, error)
        stats.errors++
      }
    }

    // Batch update using transaction
    await db.$transaction(
      updates.map((u) =>
        db.product.update({
          where: { id: u.id },
          data: u.data,
        })
      )
    )

    const processed = Math.min((i + 1) * BATCH_SIZE, totalProducts)
    const percent = ((processed / totalProducts) * 100).toFixed(1)
    logger.info(`Products: ${processed.toLocaleString()}/${totalProducts.toLocaleString()} (${percent}%)`)
  }
}

async function migrateCanonicals(stats: MigrationStats): Promise<void> {
  logger.info('Fetching all canonical products...')

  const totalCanonicals = await db.canonicalProduct.count()
  logger.info(`Found ${totalCanonicals.toLocaleString()} canonical products to process`)

  const batches = Math.ceil(totalCanonicals / BATCH_SIZE)

  for (let i = 0; i < batches; i++) {
    const canonicals = await db.canonicalProduct.findMany({
      select: { id: true, name: true },
      skip: i * BATCH_SIZE,
      take: BATCH_SIZE,
    })

    const updates: Array<{ id: string; data: { baseNormalizedName: string; quantity: number | null; unit: string | null } }> = []

    for (const canonical of canonicals) {
      try {
        // IMPORTANTE: Usar nombre ORIGINAL para preservar decimales
        const parsed = parseProductName(canonical.name)

        updates.push({
          id: canonical.id,
          data: {
            baseNormalizedName: parsed.baseName,
            quantity: parsed.quantity,
            unit: parsed.unit,
          },
        })

        if (parsed.quantity !== null) {
          stats.canonicalsWithMeasures++
        }
        stats.canonicalsProcessed++
      } catch (error) {
        logger.error(`Error parsing canonical ${canonical.id}:`, error)
        stats.errors++
      }
    }

    // Batch update using transaction
    await db.$transaction(
      updates.map((u) =>
        db.canonicalProduct.update({
          where: { id: u.id },
          data: u.data,
        })
      )
    )

    const processed = Math.min((i + 1) * BATCH_SIZE, totalCanonicals)
    const percent = ((processed / totalCanonicals) * 100).toFixed(1)
    logger.info(`Canonicals: ${processed.toLocaleString()}/${totalCanonicals.toLocaleString()} (${percent}%)`)
  }
}

async function showExamples(): Promise<void> {
  logger.info('\n--- Examples of parsed products ---\n')

  const examples = await db.product.findMany({
    where: { quantity: { not: null } },
    select: {
      name: true,
      normalizedName: true,
      baseNormalizedName: true,
      quantity: true,
      unit: true,
    },
    take: 10,
  })

  for (const ex of examples) {
    console.log(`  "${ex.name}"`)
    console.log(`    normalized: "${ex.normalizedName}"`)
    console.log(`    base: "${ex.baseNormalizedName}" | qty: ${ex.quantity} | unit: ${ex.unit}`)
    console.log()
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  logger.box([
    'MIGRATION: Extract Measurements',
    '',
    `Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`,
    `Started: ${new Date().toISOString()}`,
  ].join('\n'))

  if (dryRun) {
    // Just show some examples of what would be parsed
    logger.info('Dry run - showing parse examples...\n')

    const sampleProducts = await db.product.findMany({
      select: { name: true },
      take: 20,
    })

    for (const product of sampleProducts) {
      // Usar nombre ORIGINAL para preservar decimales
      const parsed = parseProductName(product.name)
      console.log(`"${product.name}"`)
      console.log(`  → base: "${parsed.baseName}"`)
      console.log(`  → qty: ${parsed.quantity ?? 'null'}, unit: ${parsed.unit ?? 'null'}`)
      console.log()
    }

    await db.$disconnect()
    return
  }

  const stats: MigrationStats = {
    productsProcessed: 0,
    productsWithMeasures: 0,
    canonicalsProcessed: 0,
    canonicalsWithMeasures: 0,
    errors: 0,
  }

  const startTime = Date.now()

  // Migrate products
  await migrateProducts(stats)

  // Migrate canonicals
  await migrateCanonicals(stats)

  const duration = Date.now() - startTime

  // Show examples
  await showExamples()

  logger.box([
    'MIGRATION COMPLETED',
    '',
    `Products processed: ${stats.productsProcessed.toLocaleString()}`,
    `Products with measures: ${stats.productsWithMeasures.toLocaleString()} (${((stats.productsWithMeasures / stats.productsProcessed) * 100).toFixed(1)}%)`,
    '',
    `Canonicals processed: ${stats.canonicalsProcessed.toLocaleString()}`,
    `Canonicals with measures: ${stats.canonicalsWithMeasures.toLocaleString()} (${((stats.canonicalsWithMeasures / stats.canonicalsProcessed) * 100).toFixed(1)}%)`,
    '',
    `Errors: ${stats.errors}`,
    `Duration: ${(duration / 1000).toFixed(1)}s`,
  ].join('\n'))

  await db.$disconnect()
}

main().catch((error) => {
  logger.error('Fatal error:', error)
  process.exit(1)
})
