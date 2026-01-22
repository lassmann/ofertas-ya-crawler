import * as cheerio from 'cheerio'
import { superseisConfig, type RouteKey } from '../config/superseis'
import { db } from '../../lib/db.js'
import type { ScrapedProduct, ScraperResult } from '../../types/index'

interface ScrapedProductWithCategory extends ScrapedProduct {
  category: string
}

export class SuperseisScraper {
  private config = superseisConfig

  get name() { return this.config.name }
  get slug() { return this.config.slug }

  // Scrapear una ruta específica
  async scrapeRoute(routeKey: RouteKey): Promise<ScraperResult<ScrapedProductWithCategory>> {
    const startTime = Date.now()
    const allProducts: ScrapedProductWithCategory[] = []
    const errors: string[] = []
    const route = this.config.routes[routeKey]

    try {
      const firstPageUrl = `${this.config.baseUrl}${route.path}`
      const { products, totalPages } = await this.scrapePage(firstPageUrl, route.category)
      allProducts.push(...products)

      console.log(`[${this.name}] ${route.category} - Página 1/${totalPages} - ${products.length} productos`)

      for (let page = 2; page <= totalPages; page++) {
        try {
          const pageUrl = `${firstPageUrl}?page=${page}`
          const { products: pageProducts } = await this.scrapePage(pageUrl, route.category)
          allProducts.push(...pageProducts)
          
          console.log(`[${this.name}] ${route.category} - Página ${page}/${totalPages} - ${pageProducts.length} productos`)
          
          await this.delay(300)
        } catch (error) {
          const msg = `Error en ${route.category} página ${page}: ${error instanceof Error ? error.message : 'Unknown'}`
          errors.push(msg)
          console.error(`[${this.name}] ${msg}`)
        }
      }

    } catch (error) {
      const msg = `Error en ${route.category}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      errors.push(msg)
      console.error(`[${this.name}] ${msg}`)
    }

    return {
      success: errors.length === 0,
      data: allProducts,
      errors,
      scrapedAt: new Date(),
      duration: Date.now() - startTime,
    }
  }

  // Scrapear todas las rutas
  async scrapeAll(options?: { 
    includeOfertas?: boolean 
    onlyCategories?: RouteKey[]
  }): Promise<ScraperResult<ScrapedProductWithCategory>> {
    const startTime = Date.now()
    const allProducts: ScrapedProductWithCategory[] = []
    const allErrors: string[] = []

    const routeKeys = options?.onlyCategories || 
      (Object.keys(this.config.routes) as RouteKey[])
    
    const routesToScrape = options?.includeOfertas === false
      ? routeKeys.filter(k => k !== 'ofertas')
      : routeKeys

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[${this.name}] Iniciando scrape de ${routesToScrape.length} rutas`)
    console.log(`${'='.repeat(60)}\n`)

    for (const routeKey of routesToScrape) {
      const result = await this.scrapeRoute(routeKey)
      allProducts.push(...result.data)
      allErrors.push(...result.errors)

      console.log(`[${this.name}] ✓ ${routeKey}: ${result.data.length} productos\n`)
      
      // Pausa entre categorías
      await this.delay(1000)
    }

    return {
      success: allErrors.length === 0,
      data: allProducts,
      errors: allErrors,
      scrapedAt: new Date(),
      duration: Date.now() - startTime,
    }
  }

  // Scrapear solo ofertas (para uso rápido)
  async scrapeOfertas(): Promise<ScraperResult<ScrapedProductWithCategory>> {
    return this.scrapeRoute('ofertas')
  }

  async scrapePage(url: string, category: string): Promise<{ products: ScrapedProductWithCategory[]; totalPages: number }> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    return this.parseHtml(html, url, category)
  }

  parseHtml(html: string, sourceUrl: string, category: string): { products: ScrapedProductWithCategory[]; totalPages: number } {
    const $ = cheerio.load(html)
    const products: ScrapedProductWithCategory[] = []
    const { selectors, parsePrice, parseDiscount, extractPageNumber } = this.config

    $(selectors.productContainer).each((_, element) => {
      const $el = $(element)

      const name = $el.find(selectors.name).attr(selectors.nameAttr) || 
                   $el.find(selectors.name).text().trim()
      
      const priceNew = parsePrice($el.find(selectors.priceNew).text())
      const priceOld = parsePrice($el.find(selectors.priceOld).text())
      
      if (!name || !priceNew) return

      const product: ScrapedProductWithCategory = {
        name,
        price: priceNew,
        oldPrice: priceOld || undefined,
        discountPercent: parseDiscount($el.find(selectors.discountPercent).text()) || undefined,
        imageUrl: $el.find(selectors.image).attr('src') || undefined,
        sourceUrl: $el.find(selectors.url).attr('href') || sourceUrl,
        unit: $el.find(selectors.saleType).text().trim() || undefined,
        productId: $el.find(selectors.productId).attr('data-product-id') || undefined,
        category,
      }

      products.push(product)
    })

    let totalPages = 1
    const lastPageLink = $(selectors.lastPage).attr('href')
    if (lastPageLink) {
      totalPages = extractPageNumber(lastPageLink) || 1
    }

    return { products, totalPages }
  }

  async saveProducts(products: ScrapedProductWithCategory[]): Promise<{ saved: number; updated: number }> {
    const store = await db.store.upsert({
      where: { slug: this.slug },
      update: { lastScrapedAt: new Date() },
      create: {
        name: this.name,
        slug: this.slug,
        type: 'SUPERMERCADO',
        websiteUrl: this.config.baseUrl,
        isActive: true,
      },
    })

    let saved = 0
    let updated = 0
    const seen = new Set<string>() // Para evitar duplicados en el mismo batch

    for (const product of products) {
      const normalizedName = this.normalizeName(product.name)
      
      // Skip si ya procesamos este producto en este batch
      if (seen.has(normalizedName)) continue
      seen.add(normalizedName)

      try {
        const existing = await db.product.findUnique({
          where: {
            storeId_normalizedName: {
              storeId: store.id,
              normalizedName,
            },
          },
        })

        const dbProduct = await db.product.upsert({
          where: {
            storeId_normalizedName: {
              storeId: store.id,
              normalizedName,
            },
          },
          update: {
            name: product.name,
            imageUrl: product.imageUrl,
            category: product.category,
            updatedAt: new Date(),
          },
          create: {
            name: product.name,
            normalizedName,
            imageUrl: product.imageUrl,
            category: product.category,
            storeId: store.id,
          },
        })

        if (existing) {
          updated++
        } else {
          saved++
        }

        // Crear registro de precio
        await db.price.create({
          data: {
            price: product.price,
            oldPrice: product.oldPrice,
            sourceUrl: product.sourceUrl,
            productId: dbProduct.id,
            storeId: store.id,
          },
        })

      } catch (error) {
        console.error(`Error guardando "${product.name}":`, error)
      }
    }

    return { saved, updated }
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// CLI
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  const args = process.argv.slice(2)
  const scraper = new SuperseisScraper()

  // Parsear argumentos
  const onlyOfertas = args.includes('--ofertas')
  const saveToDb = args.includes('--save')
  const specificRoute = args.find(a => a.startsWith('--route='))?.split('=')[1] as RouteKey | undefined

  console.log(`\n🛒 Superseis Scraper`)
  console.log(`   Modo: ${onlyOfertas ? 'Solo ofertas' : specificRoute ? `Ruta: ${specificRoute}` : 'Todas las categorías'}`)
  console.log(`   Guardar: ${saveToDb ? 'Sí' : 'No (usar --save para guardar)'}\n`)

  let result: ScraperResult<ScrapedProductWithCategory>

  if (onlyOfertas) {
    result = await scraper.scrapeOfertas()
  } else if (specificRoute) {
    result = await scraper.scrapeRoute(specificRoute)
  } else {
    result = await scraper.scrapeAll()
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`RESULTADO FINAL`)
  console.log(`${'='.repeat(60)}`)
  console.log(`- Éxito: ${result.success}`)
  console.log(`- Productos totales: ${result.data.length}`)
  console.log(`- Productos únicos: ${new Set(result.data.map(p => p.name)).size}`)
  console.log(`- Errores: ${result.errors.length}`)
  console.log(`- Duración: ${(result.duration / 1000 / 60).toFixed(1)} minutos`)

  // Resumen por categoría
  const byCategory = result.data.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log(`\nProductos por categoría:`)
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  - ${cat}: ${count}`))

  if (saveToDb && result.data.length > 0) {
    console.log(`\n💾 Guardando en base de datos...`)
    const { saved, updated } = await scraper.saveProducts(result.data)
    console.log(`✓ Nuevos: ${saved} | Actualizados: ${updated}`)
  }

  await db.$disconnect()
}