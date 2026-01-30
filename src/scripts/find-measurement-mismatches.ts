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

  // Convertir litros a ml
  if (unit === 'l') {
    value = qty * 1000
    baseUnit = 'ml'
  }

  // Convertir kg a g
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
  // Obtener canonicals que tienen múltiples productos con medidas
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
    // Agrupar productos por medida normalizada
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

    // Si hay más de un grupo de medidas (excluyendo null), hay mismatch
    const nonNullGroups = Array.from(measurementGroups.entries()).filter(([key]) => key !== 'null')

    if (nonNullGroups.length > 1) {
      mismatched.push({
        canonicalId: canonical.id,
        canonicalName: canonical.name,
        canonicalQty: canonical.quantity,
        canonicalUnit: canonical.unit,
        products: canonical.matches.map(m => ({
          id: m.product.id,
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
  const showAll = args.includes('--all')
  const unmatch = args.includes('--unmatch')

  logger.box([
    'FIND MEASUREMENT MISMATCHES',
    '',
    'Finding products matched to same canonical with different sizes...',
  ].join('\n'))

  const mismatched = await findMismatchedCanonicals()

  logger.info(`Found ${mismatched.length} canonicals with measurement mismatches\n`)

  // Ordenar por cantidad de productos (más problemáticos primero)
  mismatched.sort((a, b) => b.products.length - a.products.length)

  const toShow = showAll ? mismatched : mismatched.slice(0, 20)

  for (const group of toShow) {
    console.log(`\n${'─'.repeat(80)}`)
    console.log(`CANONICAL: ${group.canonicalName}`)
    console.log(`ID: ${group.canonicalId}`)
    console.log(`Canonical qty/unit: ${group.canonicalQty ?? 'null'} ${group.canonicalUnit ?? ''}`)
    console.log(`Products (${group.products.length}):`)

    // Agrupar por medida para mostrar mejor
    const byMeasure = new Map<string, typeof group.products>()
    for (const p of group.products) {
      const key = p.quantity !== null ? `${p.quantity}${p.unit}` : 'sin medida'
      if (!byMeasure.has(key)) byMeasure.set(key, [])
      byMeasure.get(key)!.push(p)
    }

    for (const [measure, products] of byMeasure) {
      console.log(`\n  [${measure}]`)
      for (const p of products) {
        console.log(`    - ${p.storeName}: "${p.name}"`)
        if (unmatch) {
          console.log(`      ID: ${p.id}`)
        }
      }
    }
  }

  if (!showAll && mismatched.length > 20) {
    console.log(`\n... y ${mismatched.length - 20} más. Usa --all para ver todos.`)
  }

  // Resumen por diferencia de medida
  console.log(`\n${'═'.repeat(80)}`)
  console.log('RESUMEN:')
  console.log(`Total canonicals con mismatch: ${mismatched.length}`)

  const totalProducts = mismatched.reduce((sum, g) => sum + g.products.length, 0)
  console.log(`Total productos afectados: ${totalProducts}`)

  if (unmatch) {
    console.log('\nPara des-matchear un producto específico, usa:')
    console.log('  npm run unmatch -- <product-id>')
  }

  await db.$disconnect()
}

main().catch((error) => {
  logger.error('Fatal error:', error)
  process.exit(1)
})
