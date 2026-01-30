# Stack Tecnologico

## Runtime y Lenguaje

| Tecnologia | Version | Uso |
|-----------|---------|-----|
| Node.js | 20+ | Runtime |
| TypeScript | 5.x | Lenguaje |
| ESM | - | Sistema de modulos |

El proyecto usa ES Modules (`"type": "module"` en package.json) con TypeScript.

## Backend

### Scraping
| Tecnologia | Uso |
|-----------|-----|
| **Cheerio** | Parsing de HTML (no usa browser) |
| **fetch** | Requests HTTP nativos |

Los scrapers NO usan Playwright ni Puppeteer. Son scrapers basados en HTTP + parsing de HTML, lo que los hace rapidos y eficientes.

### Base de Datos
| Tecnologia | Uso |
|-----------|-----|
| **PostgreSQL** | Base de datos principal |
| **Prisma** | ORM y migraciones |
| **pg_trgm** | Extension para fuzzy matching |
| **Docker** | Contenedor para PostgreSQL local |

### API
| Tecnologia | Uso |
|-----------|-----|
| **Express.js** | Framework HTTP |
| **CORS** | Middleware para CORS |

## Frontend

| Tecnologia | Uso |
|-----------|-----|
| **React 19** | Framework UI |
| **Vite** | Build tool y dev server |
| **TailwindCSS 4** | Estilos |
| **React Router** | Navegacion |
| **TanStack Query** | Manejo de estado servidor |
| **React Table** | Tablas con sorting/filtering |
| **React Hook Form** | Formularios |
| **Zod** | Validacion de schemas |
| **Lucide React** | Iconos |

## Herramientas de Desarrollo

| Tecnologia | Uso |
|-----------|-----|
| **tsx** | Ejecutar TypeScript directamente |
| **Vitest** | Testing |
| **Concurrently** | Ejecutar multiples procesos |
| **Consola** | Logger con colores |

## Estructura de Directorios

```
ofertas-ya-crawler/
├── src/
│   ├── api/              # API REST (Express)
│   │   ├── routes/       # Endpoints
│   │   └── server.ts     # Entry point
│   ├── jobs/             # Jobs de background
│   │   ├── scrape-all.ts # Ejecutar todos los scrapers
│   │   └── process-matches.ts # Matching automatico
│   ├── lib/              # Librerias compartidas
│   │   ├── db.ts         # Cliente Prisma
│   │   ├── logger.ts     # Logger
│   │   └── matching/     # Funciones de matching
│   ├── scrapers/         # Scrapers
│   │   ├── config/       # Configuracion por supermercado
│   │   └── supermercados/# Implementacion de scrapers
│   ├── scripts/          # Scripts de utilidad
│   ├── types/            # Tipos compartidos
│   └── web/              # Frontend React
│       └── src/
│           ├── components/
│           ├── lib/
│           └── pages/
├── prisma/
│   └── schema.prisma     # Schema de base de datos
├── generated/
│   └── prisma/           # Cliente Prisma generado
└── docs/                 # Documentacion
```

## Path Aliases

El proyecto usa path alias `@/*` que mapea a `src/*`:

```typescript
// En vez de:
import { db } from '../../../lib/db.js'

// Usar:
import { db } from '@/lib/db.js'
```

## Puertos por Defecto

| Servicio | Puerto |
|----------|--------|
| API Express | 3001 |
| Frontend Vite | 5173 |
| PostgreSQL | 5433 |
| Prisma Studio | 5555 |

## Variables de Entorno

Ver [Variables de Entorno](../08-desarrollo/variables-entorno.md) para la lista completa.
