import { db } from '../lib/db'
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
  // Obtener el último precio de cada producto
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
    console.log('❌ Se necesitan al menos 2 tiendas para comparar')
    return []
  }

  // Agrupar productos por tienda
  const byStore = stores.reduce((acc, slug) => {
    acc[slug] = products.filter(p => p.storeSlug === slug)
    return acc
  }, {} as Record<string, ProductWithPrice[]>)

  // Comparar productos entre tiendas
  const store1 = stores[0]
  const store2 = stores[1]

  console.log(`\n🔍 Comparando ${byStore[store1].length} productos de ${store1} con ${byStore[store2].length} de ${store2}...\n`)

  for (const p1 of byStore[store1]) {
    // Buscar el producto más similar en la otra tienda
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

  console.log('📊 Comparador de Precios entre Supermercados')
  console.log(`   Similitud mínima: ${(minSimilarity * 100).toFixed(0)}%`)
  console.log(`   Mostrando top: ${showTop}`)
  if (category) console.log(`   Categoría: ${category}`)

  // Obtener productos
  let products = await getProductsWithLatestPrice()
  
  if (category) {
    products = products.filter(p => p.category?.toLowerCase().includes(category.toLowerCase()))
  }

  console.log(`\n📦 Total productos: ${products.length}`)

  // Encontrar matches
  const matches = findMatches(products, minSimilarity)

  console.log(`✅ Matches encontrados: ${matches.length}`)

  // Estadísticas generales
  const store1Cheaper = matches.filter(m => m.cheaper === 'store1').length
  const store2Cheaper = matches.filter(m => m.cheaper === 'store2').length
  const equal = matches.filter(m => m.cheaper === 'equal').length

  const stores = [...new Set(products.map(p => p.storeSlug))]
  
  console.log(`\n📈 Resumen:`)
  console.log(`   ${stores[0]} más barato: ${store1Cheaper} productos`)
  console.log(`   ${stores[1]} más barato: ${store2Cheaper} productos`)
  console.log(`   Mismo precio: ${equal} productos`)

  // Top diferencias de precio (ordenado por % de diferencia)
  const topDifferences = matches
    .filter(m => m.cheaper !== 'equal')
    .sort((a, b) => b.priceDiffPercent - a.priceDiffPercent)
    .slice(0, showTop)

  console.log(`\n🏷️  Top ${showTop} mayores diferencias de precio:\n`)
  console.log('─'.repeat(100))

  topDifferences.forEach((match, i) => {
    const cheaper = match.cheaper === 'store1' ? match.product1 : match.product2
    const expensive = match.cheaper === 'store1' ? match.product2 : match.product1

    console.log(`${i + 1}. ${match.product1.name}`)
    console.log(`   Similitud: ${(match.similarity * 100).toFixed(0)}%`)
    console.log(`   💚 ${cheaper.storeName}: ₲ ${cheaper.price.toLocaleString()}`)
    console.log(`   💸 ${expensive.storeName}: ₲ ${expensive.price.toLocaleString()}`)
    console.log(`   📉 Diferencia: ₲ ${match.priceDiff.toLocaleString()} (${match.priceDiffPercent.toFixed(1)}%)`)
    console.log('─'.repeat(100))
  })

  // Productos donde cada tienda es más barata
  console.log(`\n\n🛒 MEJORES OFERTAS POR TIENDA\n`)

  for (const storeSlug of stores) {
    const storeWins = matches
      .filter(m => 
        (m.cheaper === 'store1' && m.product1.storeSlug === storeSlug) ||
        (m.cheaper === 'store2' && m.product2.storeSlug === storeSlug)
      )
      .sort((a, b) => b.priceDiffPercent - a.priceDiffPercent)
      .slice(0, 5)

    const storeName = products.find(p => p.storeSlug === storeSlug)?.storeName
    console.log(`\n📍 ${storeName} - Top 5 productos más baratos vs competencia:`)
    
    storeWins.forEach((match, i) => {
      const ours = match.product1.storeSlug === storeSlug ? match.product1 : match.product2
      const theirs = match.product1.storeSlug === storeSlug ? match.product2 : match.product1
      
      console.log(`   ${i + 1}. ${ours.name}`)
      console.log(`      Aquí: ₲ ${ours.price.toLocaleString()} | Otro: ₲ ${theirs.price.toLocaleString()} (-${match.priceDiffPercent.toFixed(1)}%)`)
    })
  }

  await db.$disconnect()
}

main().catch(console.error)