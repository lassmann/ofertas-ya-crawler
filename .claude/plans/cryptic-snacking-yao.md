# Plan: Refactorización Arquitectónica de Scrapers

## Análisis del Estado Actual

### Código Duplicado Identificado

Después de analizar los 6 scrapers (Superseis, CasaRica, Fortis, Stock, Biggie, Areté), encontré:

| Método | Duplicación | LOC por scraper |
|--------|-------------|-----------------|
| `scrapeAll()` | 99% idéntico | ~40 líneas |
| `saveProducts()` | 95% idéntico | ~60 líneas |
| `normalizeName()` | 100% idéntico | 8 líneas |
| `delay()` | 100% idéntico | 3 líneas |
| CLI block | 90% idéntico | ~40 líneas |
| `scrapeRoute()` | 80% similar | ~45 líneas |

**Total duplicado estimado: ~200 líneas × 6 scrapers = 1,200 líneas que podrían ser ~250**

### Lo que VARÍA entre scrapers:

1. **Config** - selectores, rutas, parsePrice, baseUrl
2. **parseHtml()** - lógica específica de extracción HTML
3. **Paginación** - query param (`?page=2`), URL suffix (`.2`), API offset
4. **Campos extra** - `precioMayorista`, `inStock`, `oldPrice`
5. **Fuente de datos** - HTML (Cheerio) vs API JSON

---

## Propuesta: Arquitectura Nueva

### Estructura de Carpetas

```
src/scrapers/
├── core/
│   ├── BaseScraper.ts          # Clase abstracta con lógica común
│   ├── ProductSaver.ts         # Lógica de guardado en DB
│   ├── BatchProcessor.ts       # Procesamiento en batches
│   ├── cli.ts                  # CLI genérico reutilizable
│   └── types.ts                # Tipos compartidos
├── config/
│   ├── categories.ts           # (ya existe)
│   ├── superseis.ts
│   ├── casarica.ts
│   └── ...
├── supermercados/
│   ├── superseis.ts            # Solo parseHtml + config específico
│   ├── casarica.ts
│   └── ...
└── index.ts                    # Re-exports
```

### Diseño de BaseScraper

```typescript
// src/scrapers/core/BaseScraper.ts
export abstract class BaseScraper<
  TProduct extends ScrapedProduct,
  TRouteKey extends string
> {
  abstract readonly name: string
  abstract readonly slug: string
  abstract readonly baseUrl: string
  abstract readonly routes: Record<TRouteKey, RouteConfig>

  // ══════════════════════════════════════════
  // MÉTODOS IMPLEMENTADOS (no duplicar más)
  // ══════════════════════════════════════════

  async scrapeAll(options?: ScrapeOptions<TRouteKey>): Promise<ScraperResult<TProduct>> {
    // Batch processing idéntico para todos
  }

  async saveProducts(products: TProduct[]): Promise<SaveResult> {
    // Lógica de guardado idéntica
  }

  protected normalizeName(name: string): string {
    // Una sola implementación
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ══════════════════════════════════════════
  // MÉTODOS ABSTRACTOS (cada scraper implementa)
  // ══════════════════════════════════════════

  abstract scrapeRoute(routeKey: TRouteKey): Promise<ScraperResult<TProduct>>

  // Hook opcional para campos extra en Price
  protected getPriceData(product: TProduct): Partial<PriceCreateInput> {
    return { oldPrice: product.oldPrice }
  }
}
```

### Estrategia de Paginación

El mayor diferenciador es cómo se hace la paginación:

```typescript
// src/scrapers/core/paginators.ts

// Tipo 1: Query param (?page=2) - Superseis
export class QueryParamPaginator implements Paginator {
  getNextUrl(baseUrl: string, page: number): string {
    return `${baseUrl}?page=${page}`
  }
  extractTotalPages($: CheerioAPI): number { /* ... */ }
}

// Tipo 2: URL suffix (.2) - CasaRica, Areté
export class UrlSuffixPaginator implements Paginator {
  getNextUrl(baseUrl: string, page: number): string {
    return page === 1 ? baseUrl : `${baseUrl}.${page}`
  }
  hasNextPage($: CheerioAPI): boolean { /* ... */ }
}

// Tipo 3: Next link - Fortis, Stock
export class NextLinkPaginator implements Paginator {
  getNextUrl($: CheerioAPI): string | null { /* ... */ }
}

// Tipo 4: API offset - Biggie
export class ApiOffsetPaginator implements Paginator {
  getNextParams(skip: number, pageSize: number): { skip: number } { /* ... */ }
}
```

### CLI Genérico

```typescript
// src/scrapers/core/cli.ts
export async function runScraperCLI<T extends ScrapedProduct>(
  scraper: BaseScraper<T, string>,
  args: string[]
) {
  const { saveToDb, specificRoute, onlyOfertas } = parseArgs(args)

  logBox(scraper.name, { specificRoute, saveToDb, onlyOfertas })

  const result = specificRoute
    ? await scraper.scrapeRoute(specificRoute)
    : await scraper.scrapeAll({ onlyOfertas })

  logSummary(scraper.name, result)
  logExamples(result.data)
  logByCategory(result.data)

  if (saveToDb && result.data.length > 0) {
    const stats = await scraper.saveProducts(result.data)
    logSaved(scraper.name, stats)
  }

  await db.$disconnect()
}
```

### Ejemplo: Scraper Simplificado

```typescript
// src/scrapers/supermercados/arete.ts (DESPUÉS)
import { HtmlScraper } from '../core/HtmlScraper'
import { UrlSuffixPaginator } from '../core/paginators'
import { areteConfig } from '../config/arete'

export class AreteScraper extends HtmlScraper<AreteProduct, AreteRouteKey> {
  readonly name = areteConfig.name
  readonly slug = areteConfig.slug
  readonly baseUrl = areteConfig.baseUrl
  readonly routes = areteConfig.routes

  protected paginator = new UrlSuffixPaginator('a.next.page-numbers')

  // ÚNICO método que necesita implementar
  protected parseHtml($: CheerioAPI, sourceUrl: string, category: string): AreteProduct[] {
    const products: AreteProduct[] = []

    $('div.product').each((_, el) => {
      // Lógica específica de Areté
      products.push({ name, price, oldPrice, ... })
    })

    return products
  }
}

// CLI en 2 líneas
if (import.meta.url === `file://${process.argv[1]}`) {
  runScraperCLI(new AreteScraper(), process.argv.slice(2))
}
```

**Resultado: De ~400 líneas a ~50 líneas por scraper**

---

## Beneficios

| Aspecto | Antes | Después |
|---------|-------|---------|
| Líneas por scraper | ~400 | ~50 |
| Agregar nuevo scraper | Copiar 400 líneas | Solo parseHtml + config |
| Cambiar lógica de batch | 6 archivos | 1 archivo |
| Cambiar lógica de guardado | 6 archivos | 1 archivo |
| Tests | Repetitivos | Tests del core + tests específicos |

---

## Plan de Migración Gradual (Seleccionado)

### Fase 1: Crear core sin romper nada existente

**Archivos a crear:**

```
src/scrapers/core/
├── index.ts                    # Re-exports
├── types.ts                    # Tipos compartidos
├── utils.ts                    # normalizeName, delay, slugify
├── ProductSaver.ts             # Clase para guardar productos
├── BatchProcessor.ts           # Lógica de batches
└── cli.ts                      # CLI genérico
```

**Paso 1.1: utils.ts**
```typescript
export function normalizeName(name: string): string { /* ... */ }
export function delay(ms: number): Promise<void> { /* ... */ }
export function slugify(text: string): string { /* ... */ }
```

**Paso 1.2: ProductSaver.ts**
```typescript
export class ProductSaver {
  constructor(private storeSlug: string, private storeName: string, private baseUrl: string) {}

  async save(products: ScrapedProduct[]): Promise<{ saved: number; updated: number }> {
    // Lógica extraída de saveProducts()
  }
}
```

**Paso 1.3: BatchProcessor.ts**
```typescript
export async function processInBatches<TRouteKey extends string, TProduct>(
  routeKeys: TRouteKey[],
  scrapeRoute: (key: TRouteKey) => Promise<ScraperResult<TProduct>>,
  options?: { batchSize?: number; delayMs?: number }
): Promise<ScraperResult<TProduct>> { /* ... */ }
```

**Paso 1.4: cli.ts**
```typescript
export interface ScraperCLI<TRouteKey> {
  name: string
  scrapeRoute(key: TRouteKey): Promise<ScraperResult<any>>
  scrapeAll(options?: any): Promise<ScraperResult<any>>
  saveProducts(products: any[]): Promise<{ saved: number; updated: number }>
}

export async function runScraperCLI<TRouteKey extends string>(
  scraper: ScraperCLI<TRouteKey>,
  args: string[],
  routeKeys: TRouteKey[]
): Promise<void> { /* ... */ }
```

### Fase 2: Migrar un scraper como prueba (Areté)

Areté es el más nuevo, así que es el candidato ideal para probar la nueva arquitectura:

```typescript
// src/scrapers/supermercados/arete.ts (migrado)
import { normalizeName, delay } from '../core/utils'
import { ProductSaver } from '../core/ProductSaver'
import { processInBatches } from '../core/BatchProcessor'
import { runScraperCLI } from '../core/cli'

export class AreteScraper {
  private saver = new ProductSaver('arete', 'Areté', 'https://www.arete.com.py')

  // scrapeAll() ahora usa processInBatches()
  async scrapeAll(options?: { onlyOfertas?: boolean }) {
    const routeKeys = Object.keys(areteConfig.routes) as AreteRouteKey[]
    const result = await processInBatches(routeKeys, (k) => this.scrapeRoute(k))

    if (options?.onlyOfertas) {
      result.data = result.data.filter(p => p.oldPrice !== undefined)
    }
    return result
  }

  // saveProducts() ahora delega al ProductSaver
  async saveProducts(products: AreteProduct[]) {
    return this.saver.save(products)
  }

  // parseHtml() sigue siendo específico de Areté
  parseHtml(html: string, sourceUrl: string, category: string) { /* ... */ }
}

// CLI reducido a 1 línea
if (import.meta.url === `file://${process.argv[1]}`) {
  runScraperCLI(new AreteScraper(), process.argv.slice(2), Object.keys(areteConfig.routes))
}
```

### Fase 3: Migrar scrapers similares (CasaRica)

CasaRica y Areté comparten la misma estructura HTML (WooCommerce). Migrar CasaRica usando el mismo patrón.

### Fase 4: Crear HtmlScraper base

Una vez que Areté y CasaRica funcionen, extraer la lógica común a una clase base:

```typescript
export abstract class HtmlScraper<TProduct extends ScrapedProduct, TRouteKey extends string> {
  protected abstract parseHtml($: CheerioAPI, sourceUrl: string, category: string): TProduct[]
  protected abstract get config(): ScraperConfig<TRouteKey>

  // Todo lo demás es heredado
  async scrapeAll() { /* ... */ }
  async scrapeRoute(routeKey: TRouteKey) { /* ... */ }
  async saveProducts(products: TProduct[]) { /* ... */ }
}
```

### Fase 5: Migrar el resto

Orden sugerido:
1. **Stock** - Similar a CasaRica (HTML + next link)
2. **Superseis** - HTML con paginación query param
3. **Fortis** - HTML con cookies
4. **Biggie** - API JSON (necesita ApiScraper base diferente)

---

## Archivos a Modificar/Crear

| Archivo | Acción |
|---------|--------|
| `src/scrapers/core/index.ts` | Crear |
| `src/scrapers/core/types.ts` | Crear |
| `src/scrapers/core/utils.ts` | Crear |
| `src/scrapers/core/ProductSaver.ts` | Crear |
| `src/scrapers/core/BatchProcessor.ts` | Crear |
| `src/scrapers/core/cli.ts` | Crear |
| `src/scrapers/supermercados/arete.ts` | Migrar primero |

---

## Verificación

Después de cada fase:
1. `npm run scrape:arete -- --route=lacteos` (dry-run)
2. `npm run scrape:arete:save -- --route=panaderia` (con guardado)
3. Comparar output antes/después
4. Verificar en `npm run db:studio` que los datos se guardan igual

