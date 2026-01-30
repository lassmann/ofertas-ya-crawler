# Convenciones de Codigo

## Lenguaje y Runtime

- **TypeScript** con tipos estrictos
- **ES Modules** (`"type": "module"` en package.json)
- **Node.js 20+**

## Estructura de Archivos

```
src/
├── api/              # API REST
│   ├── routes/       # Endpoints por recurso
│   └── server.ts     # Entry point
├── jobs/             # Jobs de background
├── lib/              # Librerias compartidas
├── scrapers/
│   ├── config/       # Configuracion por scraper
│   └── supermercados/# Implementacion de scrapers
├── scripts/          # Scripts de utilidad
├── types/            # Tipos compartidos
└── web/              # Frontend React
```

## Imports

### Path Alias

Usar `@/*` para imports desde `src/`:

```typescript
// Bien
import { db } from '@/lib/db.js'
import { logger } from '@/lib/logger.js'

// Evitar
import { db } from '../../../lib/db.js'
```

### Extension .js

Siempre incluir `.js` en imports (requerido por ESM):

```typescript
// Bien
import { db } from '@/lib/db.js'

// Error en runtime
import { db } from '@/lib/db'
```

## Nombres

### Archivos

- **kebab-case** para archivos: `fuzzy-matcher.ts`, `compare-prices.ts`
- **PascalCase** para componentes React: `ProductCard.tsx`

### Variables y Funciones

- **camelCase**: `normalizedName`, `scrapeRoute()`
- **UPPER_SNAKE_CASE** para constantes: `BATCH_SIZE`, `HIGH_CONFIDENCE_THRESHOLD`

### Clases

- **PascalCase**: `SuperseisScraper`, `CanonicalProduct`

### Tipos e Interfaces

- **PascalCase**: `ScrapedProduct`, `MatchStats`
- Preferir `interface` sobre `type` para objetos

```typescript
// Preferir
interface Product {
  id: string
  name: string
}

// Para unions o tipos complejos
type MatchType = 'BARCODE' | 'ALIAS' | 'FUZZY' | 'MANUAL'
```

## Base de Datos

### Nombres de Modelos

- **PascalCase** singular: `Product`, `CanonicalProduct`

### Nombres de Campos

- **camelCase**: `normalizedName`, `createdAt`
- IDs usan UUID

### Relaciones

```prisma
model Product {
  // FK con nombre del modelo + Id
  storeId String
  store   Store @relation(fields: [storeId], references: [id])
}
```

## Precios

- **Guaranies (PYG)** como moneda
- **Enteros** (sin decimales) para precios en Guaranies
- Usar `Decimal` en Prisma para precision

```typescript
// En codigo
const price = 15000  // ₲15.000

// En display
const formatted = `₲${price.toLocaleString()}`  // "₲15.000"
```

## Normalizacion de Nombres

```typescript
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()                          // Minusculas
    .normalize('NFD')                        // Descomponer acentos
    .replace(/[\u0300-\u036f]/g, '')        // Remover acentos
    .replace(/[^a-z0-9\s]/g, ' ')           // Solo alfanumerico
    .replace(/\s+/g, ' ')                    // Normalizar espacios
    .trim()
}
```

## Async/Await

- Preferir `async/await` sobre `.then()`
- Manejar errores con try/catch

```typescript
// Bien
async function fetchProducts() {
  try {
    const response = await fetch(url)
    return await response.json()
  } catch (error) {
    logger.error('Error fetching products:', error)
    throw error
  }
}

// Evitar
function fetchProducts() {
  return fetch(url)
    .then(r => r.json())
    .catch(error => {
      logger.error('Error:', error)
      throw error
    })
}
```

## Logging

Usar `consola` a traves de `@/lib/logger.js`:

```typescript
import { logger, scraperLog } from '@/lib/logger.js'

// General
logger.info('Processing...')
logger.error('Error:', error)
logger.success('Done!')

// Scrapers
scraperLog.start('Superseis', 10)
scraperLog.page('Superseis', 'bebidas', 1, 50)
scraperLog.error('Superseis', 'Failed to fetch')
```

## Comentarios

- Evitar comentarios obvios
- Documentar "por que", no "que"
- Usar JSDoc para funciones publicas

```typescript
/**
 * Busca el canonical product mas similar a un query.
 * Usa pg_trgm para fuzzy matching.
 *
 * @param normalizedName - Nombre normalizado del producto
 * @param threshold - Minima similitud requerida (default 0.4)
 */
export async function findBestCanonicalMatch(
  normalizedName: string,
  threshold: number = 0.4
): Promise<CanonicalMatch | null> {
  // ...
}
```

## Error Handling

```typescript
// Custom errors si es necesario
class ScraperError extends Error {
  constructor(
    message: string,
    public readonly scraper: string,
    public readonly url?: string
  ) {
    super(message)
    this.name = 'ScraperError'
  }
}

// Uso
try {
  await scraper.scrapePage(url)
} catch (error) {
  if (error instanceof ScraperError) {
    logger.error(`Scraper ${error.scraper} failed at ${error.url}`)
  }
  throw error
}
```

## Testing

- Archivos de test junto al codigo: `*.test.ts`
- O en carpeta `__tests__/`
- Usar `describe` y `it` de Vitest

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeProductName } from './fuzzy-matcher'

describe('normalizeProductName', () => {
  it('should lowercase the name', () => {
    expect(normalizeProductName('COCA COLA')).toBe('coca cola')
  })

  it('should remove accents', () => {
    expect(normalizeProductName('lácteos')).toBe('lacteos')
  })
})
```

## Git

### Commits

- Mensajes en ingles
- Formato: `tipo: descripcion`
- Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

```
feat: add Biggie supermarket scraper
fix: handle pagination edge case in Stock scraper
docs: update API endpoints documentation
```

### Branches

- `main`: Produccion
- `feature/nombre`: Nuevas features
- `fix/nombre`: Bug fixes
