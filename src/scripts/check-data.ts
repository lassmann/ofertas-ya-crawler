import 'dotenv/config'
import { db } from '../lib/db.js'

async function main() {
  // Buscar productos similares por nombre entre tiendas
  const keyword = 'coca cola'

  const products = await db.product.findMany({
    where: { normalizedName: { contains: keyword } },
    include: {
      store: { select: { name: true } },
      prices: { orderBy: { scrapedAt: 'desc' }, take: 1 }
    },
    take: 30
  })

  console.log(`Productos con '${keyword}':\n`)

  const byStore: Record<string, typeof products> = {}
  products.forEach(p => {
    if (!byStore[p.store.name]) byStore[p.store.name] = []
    byStore[p.store.name].push(p)
  })

  Object.entries(byStore).forEach(([store, prods]) => {
    console.log(`${store}:`)
    prods.forEach(p => {
      const price = p.prices[0]?.price
      console.log(`  ${p.normalizedName} - G${Number(price).toLocaleString()}`)
    })
    console.log()
  })

  await db.$disconnect()
}

main()
