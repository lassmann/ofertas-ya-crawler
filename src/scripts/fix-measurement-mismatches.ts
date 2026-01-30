import 'dotenv/config'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger.js'

interface MismatchedGroup {
  canonicalId: string
  canonicalName: string
  canonicalQty: number | null
  canonicalUnit: string | null
  products: Array<{
    id: string
    matchId: string
    name: string
    storeName: string
    quantity: number | null
    unit: string | null
  }>
}

/**
 * Normaliza cantidades a una unidad base para comparación
 */
function normalizeQuantity(qty: number | null, unit: string | null): { value: number | null; baseUnit: string | null } {
  if (qty === null || unit === null) return { value: null, baseUnit: null }

  let value = qty
  let baseUnit = unit

  if (unit === 'l') {
    value = qty * 1000
    baseUnit = 'ml'
  }

  if (unit === 'kg') {
    value = qty * 1000
    baseUnit = 'g'
  }

  return { value, baseUnit }
}

/**
 * Encuentra canonicals que tienen productos matcheados con diferentes medidas
 */
async function findMismatchedCanonicals(): Promise<MismatchedGroup[]> {
  const canonicalsWithProducts = await db.canonicalProduct.findMany({
    where: {
      matches: {
        some: {
          product: {
            quantity: { not: null }
          }
        }
      }
    },
    include: {
      matches: {
        include: {
          product: {
            include: {
              store: { select: { name: true } }
            }
          }
        }
      }
    }
  })

  const mismatched: MismatchedGroup[] = []

  for (const canonical of canonicalsWithProducts) {
    const measurementGroups = new Map<string, typeof canonical.matches>()

    for (const match of canonical.matches) {
      const product = match.product
      const { value, baseUnit } = normalizeQuantity(product.quantity, product.unit)
      const key = value !== null ? `${value}-${baseUnit}` : 'null'

      if (!measurementGroups.has(key)) {
        measurementGroups.set(key, [])
      }
      measurementGroups.get(key)!.push(match)
    }

    const nonNullGroups = Array.from(measurementGroups.entries()).filter(([key]) => key !== 'null')

    if (nonNullGroups.length > 1) {
      mismatched.push({
        canonicalId: canonical.id,
        canonicalName: canonical.name,
        canonicalQty: canonical.quantity,
        canonicalUnit: canonical.unit,
        products: canonical.matches.map(m => ({
          id: m.product.id,
          matchId: m.id,
          name: m.product.name,
          storeName: m.product.store.name,
          quantity: m.product.quantity,
          unit: m.product.unit,
        }))
      })
    }
  }

  return mismatched
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const keepFirst = args.includes('--keep-first')

  logger.box([
    'FIX MEASUREMENT MISMATCHES',
    '',
    `Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`,
    `Strategy: ${keepFirst ? 'Keep products matching canonical qty' : 'Unmatch ALL mismatched products'}`,
  ].join('\n'))

  const mismatched = await findMismatchedCanonicals()
  logger.info(`Found ${mismatched.length} canonicals with measurement mismatches`)

  let totalToUnmatch = 0
  let totalKept = 0
  const matchIdsToDelete: string[] = []

  for (const group of mismatched) {
    const { value: canonicalValue, baseUnit: canonicalBaseUnit } = normalizeQuantity(
      group.canonicalQty,
      group.canonicalUnit
    )

    for (const product of group.products) {
      const { value: productValue, baseUnit: productBaseUnit } = normalizeQuantity(
        product.quantity,
        product.unit
      )

      // Si keepFirst está habilitado, mantener productos que coinciden con la medida del canonical
      if (keepFirst && canonicalValue !== null && productValue !== null) {
        if (canonicalBaseUnit === productBaseUnit && Math.abs(canonicalValue - productValue) < canonicalValue * 0.01) {
          totalKept++
          continue
        }
      }

      // Este producto tiene medida diferente al canonical, hay que desmatchearlo
      matchIdsToDelete.push(product.matchId)
      totalToUnmatch++
    }
  }

  logger.info(`\nProducts to unmatch: ${totalToUnmatch}`)
  logger.info(`Products to keep: ${totalKept}`)

  if (dryRun) {
    logger.info('\nDry run - no changes made')
    logger.info('Run without --dry-run to apply changes')
  } else {
    logger.info('\nDeleting product matches...')

    // Delete in batches
    const BATCH_SIZE = 100
    for (let i = 0; i < matchIdsToDelete.length; i += BATCH_SIZE) {
      const batch = matchIdsToDelete.slice(i, i + BATCH_SIZE)
      await db.productMatch.deleteMany({
        where: { id: { in: batch } }
      })

      const progress = Math.min(i + BATCH_SIZE, matchIdsToDelete.length)
      logger.info(`Deleted ${progress}/${matchIdsToDelete.length} matches`)
    }

    logger.box([
      'COMPLETED',
      '',
      `Unmatched: ${totalToUnmatch} products`,
      `Kept: ${totalKept} products`,
      '',
      'Run "npm run match:process" to re-match with new logic',
    ].join('\n'))
  }

  await db.$disconnect()
}

main().catch((error) => {
  logger.error('Fatal error:', error)
  process.exit(1)
})
