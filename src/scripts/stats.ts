import { db } from '../lib/db'

async function main() {
  const products = await db.product.count()
  const prices = await db.price.count()
  const stores = await db.store.count()

  console.log('\n📊 Estadísticas de la base de datos:\n')
  console.log(`  Tiendas:   ${stores}`)
  console.log(`  Productos: ${products}`)
  console.log(`  Precios:   ${prices}`)

  // Productos por tienda
  const byStore = await db.product.groupBy({
    by: ['storeId'],
    _count: true,
  })

  if (byStore.length > 0) {
    console.log('\n📦 Productos por tienda:')
    for (const group of byStore) {
      const store = await db.store.findUnique({ where: { id: group.storeId } })
      console.log(`  - ${store?.name}: ${group._count}`)
    }
  }

  // Productos por categoría (top 10)
  const byCategory = await db.product.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } },
    take: 10,
  })

  if (byCategory.length > 0) {
    console.log('\n🏷️  Top 10 categorías:')
    byCategory.forEach(c => {
      console.log(`  - ${c.category || 'sin categoría'}: ${c._count}`)
    })
  }

  console.log('')
  await db.$disconnect()
}

main().catch(console.error)