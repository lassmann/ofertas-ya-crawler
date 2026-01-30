import 'dotenv/config'
import { db } from '../lib/db.js'

interface SimilarityResult {
  name: string
  normalizedName: string
  store: string
  sim: number
}

async function main() {
  console.log('=== Test de pg_trgm para matching de productos ===\n')

  // 1. Habilitar pg_trgm
  console.log('1. Habilitando extensión pg_trgm...')
  try {
    await db.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm`
    console.log('   ✓ Extensión pg_trgm habilitada\n')
  } catch (error) {
    console.error('   ✗ Error habilitando pg_trgm:', error)
    process.exit(1)
  }

  // 2. Verificar cantidad de productos
  const productCount = await db.product.count()
  console.log(`2. Total de productos en la base: ${productCount}\n`)

  // 3. Probar búsqueda de "coca cola 2l"
  const query = 'gaseosa coca cola 2 litros'
  console.log(`3. Buscando productos similares a: "${query}"`)

  try {
    const results = await db.$queryRaw<SimilarityResult[]>`
      SELECT
        p.name,
        p."normalizedName",
        s.name as store,
        similarity(p."normalizedName", ${query}) as sim
      FROM "Product" p
      JOIN "Store" s ON s.id = p."storeId"
      WHERE p."normalizedName" % ${query}
      ORDER BY sim DESC
      LIMIT 20
    `

    if (results.length === 0) {
      console.log('   No se encontraron resultados. Probando con threshold más bajo...\n')

      // Intentar con threshold más bajo usando LIKE
      const fallbackResults = await db.$queryRaw<SimilarityResult[]>`
        SELECT
          p.name,
          p."normalizedName",
          s.name as store,
          similarity(p."normalizedName", ${query}) as sim
        FROM "Product" p
        JOIN "Store" s ON s.id = p."storeId"
        WHERE p."normalizedName" ILIKE '%coca%cola%'
        ORDER BY sim DESC
        LIMIT 20
      `
      console.table(fallbackResults)
    } else {
      console.table(results)
    }
  } catch (error) {
    console.error('   Error en búsqueda:', error)
  }

  // 4. Probar con diferentes productos
  const testQueries = [
    'leche descremada 1 litro',
    'arroz 5 kg',
    'aceite de girasol',
    'yerba mate',
    'azucar blanca',
  ]

  console.log('\n4. Probando múltiples búsquedas:\n')

  for (const q of testQueries) {
    console.log(`=== Buscando: "${q}" ===`)
    try {
      const results = await db.$queryRaw<SimilarityResult[]>`
        SELECT
          p.name,
          s.name as store,
          similarity(p."normalizedName", ${q}) as sim
        FROM "Product" p
        JOIN "Store" s ON s.id = p."storeId"
        WHERE p."normalizedName" % ${q}
        ORDER BY sim DESC
        LIMIT 5
      `

      if (results.length === 0) {
        console.log('   No se encontraron resultados con threshold default\n')
      } else {
        console.table(results)
      }
    } catch (error) {
      console.error('   Error:', error)
    }
  }

  // 5. Mostrar estadísticas de barcodes
  console.log('\n5. Estadísticas de barcodes por tienda:')
  const barcodeStats = await db.$queryRaw<{ store: string; total: bigint; with_barcode: bigint }[]>`
    SELECT
      s.name as store,
      COUNT(*) as total,
      COUNT(p.barcode) as with_barcode
    FROM "Product" p
    JOIN "Store" s ON s.id = p."storeId"
    GROUP BY s.name
    ORDER BY s.name
  `
  console.table(barcodeStats.map(s => ({
    store: s.store,
    total: Number(s.total),
    with_barcode: Number(s.with_barcode),
    percentage: `${((Number(s.with_barcode) / Number(s.total)) * 100).toFixed(1)}%`
  })))

  // 6. Verificar si hay productos con barcode duplicado (mismo producto en varias tiendas)
  console.log('\n6. Productos con barcode encontrado en múltiples tiendas:')
  const duplicateBarcodes = await db.$queryRaw<{ barcode: string; stores: string; count: bigint }[]>`
    SELECT
      p.barcode,
      string_agg(DISTINCT s.name, ', ') as stores,
      COUNT(DISTINCT s.id) as count
    FROM "Product" p
    JOIN "Store" s ON s.id = p."storeId"
    WHERE p.barcode IS NOT NULL
    GROUP BY p.barcode
    HAVING COUNT(DISTINCT s.id) > 1
    ORDER BY count DESC
    LIMIT 10
  `

  if (duplicateBarcodes.length === 0) {
    console.log('   No se encontraron barcodes compartidos entre tiendas')
  } else {
    console.table(duplicateBarcodes.map(d => ({
      barcode: d.barcode,
      stores: d.stores,
      store_count: Number(d.count)
    })))
  }

  await db.$disconnect()
  console.log('\n=== Test completado ===')
}

main().catch(console.error)
