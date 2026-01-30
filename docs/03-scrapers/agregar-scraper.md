# Guia: Agregar Nuevo Scraper

Esta guia explica como agregar un scraper para un nuevo supermercado.

## Paso 1: Analizar el Sitio Web

Antes de escribir codigo, analiza el sitio web:

1. **Identificar estructura de URLs**
   - Como estan organizadas las categorias?
   - Como funciona la paginacion? (`?page=2`, `/page/2`, scroll infinito?)

2. **Identificar selectores CSS**
   - Container de productos
   - Nombre del producto
   - Precio actual y precio anterior
   - Imagen
   - URL del producto

3. **Verificar si necesita JavaScript**
   - Si el contenido carga con JavaScript, Cheerio no funcionara
   - En ese caso, considera usar la API del sitio directamente

## Paso 2: Crear Configuracion

Crear archivo en `src/scrapers/config/{nombre}.ts`:

```typescript
// src/scrapers/config/nuevotienda.ts

export type RouteKey = 'lacteos' | 'bebidas' | 'carnes' | 'ofertas'

export const nuevotiendaConfig = {
  name: 'Nueva Tienda',
  slug: 'nuevatienda',
  baseUrl: 'https://www.nuevatienda.com.py',

  selectors: {
    // Container de cada producto
    productContainer: '.product-card',

    // Nombre del producto
    name: '.product-name',
    nameAttr: undefined,  // O 'title' si el nombre esta en un atributo

    // Precios
    priceNew: '.current-price',
    priceOld: '.original-price',
    discountPercent: '.discount-badge',

    // Imagen
    image: '.product-image img',

    // URL del producto
    url: 'a.product-link',

    // Tipo de venta (opcional)
    saleType: '.sale-type',

    // ID del producto (opcional)
    productId: '[data-id]',

    // Paginacion
    lastPage: '.pagination a:last-child',
  },

  parsePrice: (text: string): number | null => {
    // Adaptar segun formato del sitio
    // "Gs. 15.000" -> 15000
    // "₲ 15,000" -> 15000
    const cleaned = text.replace(/[^\d]/g, '')
    return cleaned ? parseInt(cleaned, 10) : null
  },

  parseDiscount: (text: string): number | null => {
    const match = text.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : null
  },

  extractPageNumber: (url: string): number => {
    // Adaptar segun URL del sitio
    const match = url.match(/page[=/](\d+)/)
    return match ? parseInt(match[1], 10) : 1
  },

  routes: {
    lacteos: {
      path: '/categoria/lacteos',
      category: 'lacteos',
    },
    bebidas: {
      path: '/categoria/bebidas',
      category: 'bebidas',
    },
    carnes: {
      path: '/categoria/carnes',
      category: 'carnes',
    },
    ofertas: {
      path: '/ofertas',
      category: 'ofertas',
    },
  },
}
```

## Paso 3: Crear Scraper

Crear archivo en `src/scrapers/supermercados/{nombre}.ts`:

```typescript
// src/scrapers/supermercados/nuevatienda.ts

import * as cheerio from 'cheerio'
import { nuevatiendaConfig, type RouteKey } from '../config/nuevatienda'
import { db } from '../../lib/db.js'
import { scraperLog, logger } from '../../lib/logger'
import type { ScrapedProduct, ScraperResult } from '../../types/index'

interface ScrapedProductWithCategory extends ScrapedProduct {
  category: string
}

export class NuevaTiendaScraper {
  private config = nuevatiendaConfig

  get name() { return this.config.name }
  get slug() { return this.config.slug }

  async scrapeRoute(routeKey: RouteKey): Promise<ScraperResult<ScrapedProductWithCategory>> {
    const startTime = Date.now()
    const allProducts: ScrapedProductWithCategory[] = []
    const errors: string[] = []
    const route = this.config.routes[routeKey]

    try {
      const firstPageUrl = `${this.config.baseUrl}${route.path}`
      const { products, totalPages } = await this.scrapePage(firstPageUrl, route.category)
      allProducts.push(...products)

      scraperLog.page(this.name, route.category, 1, products.length)

      for (let page = 2; page <= totalPages; page++) {
        try {
          const pageUrl = `${firstPageUrl}?page=${page}`
          const { products: pageProducts } = await this.scrapePage(pageUrl, route.category)
          allProducts.push(...pageProducts)

          scraperLog.page(this.name, route.category, page, pageProducts.length)

          await this.delay(300)
        } catch (error) {
          const msg = `Error in ${route.category} page ${page}: ${error instanceof Error ? error.message : 'Unknown'}`
          errors.push(msg)
          scraperLog.error(this.name, msg)
        }
      }
    } catch (error) {
      const msg = `Error in ${route.category}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(msg)
      scraperLog.error(this.name, msg)
    }

    return {
      success: errors.length === 0,
      data: allProducts,
      errors,
      scrapedAt: new Date(),
      duration: Date.now() - startTime,
    }
  }

  async scrapeAll(): Promise<ScraperResult<ScrapedProductWithCategory>> {
    const startTime = Date.now()
    const allProducts: ScrapedProductWithCategory[] = []
    const allErrors: string[] = []

    const routeKeys = Object.keys(this.config.routes) as RouteKey[]
    const BATCH_SIZE = 3
    const BATCH_DELAY_MS = 500

    scraperLog.start(this.name, routeKeys.length)

    for (let i = 0; i < routeKeys.length; i += BATCH_SIZE) {
      const batch = routeKeys.slice(i, i + BATCH_SIZE)

      const results = await Promise.all(
        batch.map(routeKey => this.scrapeRoute(routeKey))
      )

      for (const result of results) {
        allProducts.push(...result.data)
        allErrors.push(...result.errors)
      }

      if (i + BATCH_SIZE < routeKeys.length) {
        await this.delay(BATCH_DELAY_MS)
      }
    }

    return {
      success: allErrors.length === 0,
      data: allProducts,
      errors: allErrors,
      scrapedAt: new Date(),
      duration: Date.now() - startTime,
    }
  }

  async scrapePage(url: string, category: string): Promise<{ products: ScrapedProductWithCategory[]; totalPages: number }> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

      const name = selectors.nameAttr
        ? $el.find(selectors.name).attr(selectors.nameAttr)
        : $el.find(selectors.name).text().trim()

      const priceNew = parsePrice($el.find(selectors.priceNew).text())
      const priceOld = parsePrice($el.find(selectors.priceOld).text())

      if (!name || !priceNew) return

      products.push({
        name,
        price: priceNew,
        oldPrice: priceOld || undefined,
        discountPercent: parseDiscount($el.find(selectors.discountPercent).text()) || undefined,
        imageUrl: $el.find(selectors.image).attr('src') || undefined,
        sourceUrl: $el.find(selectors.url).attr('href') || sourceUrl,
        category,
      })
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
    const seen = new Set<string>()

    for (const product of products) {
      const normalizedName = this.normalizeName(product.name)

      if (seen.has(normalizedName)) continue
      seen.add(normalizedName)

      try {
        const existing = await db.product.findUnique({
          where: { storeId_normalizedName: { storeId: store.id, normalizedName } },
        })

        const dbProduct = await db.product.upsert({
          where: { storeId_normalizedName: { storeId: store.id, normalizedName } },
          update: {
            name: product.name,
            imageUrl: product.imageUrl,
            category: product.category,
          },
          create: {
            name: product.name,
            normalizedName,
            imageUrl: product.imageUrl,
            category: product.category,
            storeId: store.id,
          },
        })

        existing ? updated++ : saved++

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
        logger.error(`Error saving "${product.name}":`, error)
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
  const scraper = new NuevaTiendaScraper()
  const saveToDb = args.includes('--save')

  logger.box([
    `Nueva Tienda Scraper`,
    ``,
    `   Save: ${saveToDb ? 'Yes' : 'No (use --save to save)'}`,
  ].join('\n'))

  const result = await scraper.scrapeAll()

  scraperLog.summary(scraper.name, {
    total: result.data.length,
    errors: result.errors.length,
    duration: result.duration,
  })

  if (saveToDb && result.data.length > 0) {
    logger.start('Guardando en base de datos...')
    const { saved, updated } = await scraper.saveProducts(result.data)
    scraperLog.saved(scraper.name, saved, updated)
  }

  await db.$disconnect()
}
```

## Paso 4: Agregar Scripts NPM

Agregar en `package.json`:

```json
{
  "scripts": {
    "scrape:nuevatienda": "tsx src/scrapers/supermercados/nuevatienda.ts",
    "scrape:nuevatienda:save": "tsx src/scrapers/supermercados/nuevatienda.ts --save"
  }
}
```

## Paso 5: Agregar a scrape-all (Opcional)

Si quieres incluirlo en el job principal:

```typescript
// src/jobs/scrape-all.ts

import { NuevaTiendaScraper } from '../scrapers/supermercados/nuevatienda.js'

const scrapers = [
  new SuperseisScraper(),
  new StockScraper(),
  new NuevaTiendaScraper(),  // <-- Agregar aqui
]
```

## Paso 6: Crear Tests

Crear archivo en `src/scrapers/__tests__/nuevatienda.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { NuevaTiendaScraper } from '../supermercados/nuevatienda'

describe('NuevaTiendaScraper', () => {
  const scraper = new NuevaTiendaScraper()

  it('should have correct config', () => {
    expect(scraper.name).toBe('Nueva Tienda')
    expect(scraper.slug).toBe('nuevatienda')
  })

  it('should parse HTML correctly', () => {
    const html = `
      <div class="product-card">
        <a class="product-link" href="/producto/1">
          <span class="product-name">Producto Test</span>
          <span class="current-price">Gs. 15.000</span>
        </a>
      </div>
    `

    const { products } = scraper.parseHtml(html, 'http://test.com', 'test')

    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Producto Test')
    expect(products[0].price).toBe(15000)
  })
})
```

## Checklist Final

- [ ] Archivo de configuracion creado
- [ ] Clase scraper implementada
- [ ] Selectores CSS verificados
- [ ] Paginacion funcionando
- [ ] Normalizacion de nombres
- [ ] Scripts npm agregados
- [ ] Tests creados
- [ ] Probar dry run: `npm run scrape:nuevatienda`
- [ ] Probar con guardado: `npm run scrape:nuevatienda:save`
- [ ] Verificar datos en DB: `npm run db:studio`
