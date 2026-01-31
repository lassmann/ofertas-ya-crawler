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

## Plan de Migración (Gradual)

### Fase 1: Extraer utilidades comunes
1. Crear `src/scrapers/core/utils.ts` con `normalizeName`, `delay`
2. Crear `src/scrapers/core/ProductSaver.ts`
3. Migrar scrapers existentes uno a uno

### Fase 2: Clase base para HTML scrapers
1. Crear `HtmlScraper` extends `BaseScraper`
2. Migrar CasaRica y Areté primero (son casi idénticos)

### Fase 3: CLI genérico
1. Crear `runScraperCLI()`
2. Reemplazar CLI blocks duplicados

### Fase 4: Sistema de paginadores
1. Implementar paginadores como estrategias
2. Hacer scrapeRoute() parte del core

---

## Verificación

1. Correr tests existentes después de cada fase
2. Ejecutar cada scraper en modo dry-run
3. Comparar output antes/después para validar parsing

