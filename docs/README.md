# Ofertas Ya Crawler - Documentacion

Sistema de scraping y comparacion de precios de supermercados paraguayos.

## Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar base de datos
npm run docker:up

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Inicializar schema
npm run db:push

# 5. Ejecutar scrapers
npm run scrape

# 6. Procesar matching
npm run match:process

# 7. Iniciar aplicacion
npm run dev:full
```

## Indice

### [01 - Arquitectura](./01-arquitectura/)
- [Overview del Sistema](./01-arquitectura/overview.md)
- [Stack Tecnologico](./01-arquitectura/stack-tecnologico.md)
- [Diagramas](./01-arquitectura/diagramas.md)

### [02 - Base de Datos](./02-base-de-datos/)
- [Schema y Modelos](./02-base-de-datos/schema.md)
- [Sistema de Matching](./02-base-de-datos/sistema-matching.md)
- [Queries Comunes](./02-base-de-datos/queries-comunes.md)

### [03 - Scrapers](./03-scrapers/)
- [Como Funciona un Scraper](./03-scrapers/como-funciona.md)
- [Agregar Nuevo Scraper](./03-scrapers/agregar-scraper.md)
- Scrapers individuales:
  - [Superseis](./03-scrapers/scrapers/superseis.md)
  - [Stock](./03-scrapers/scrapers/stock.md)
  - [Fortis](./03-scrapers/scrapers/fortis.md)
  - [Casa Rica](./03-scrapers/scrapers/casarica.md)
  - [Biggie](./03-scrapers/scrapers/biggie.md)
  - [Salemma](./03-scrapers/scrapers/salemma.md)
  - [Arete](./03-scrapers/scrapers/arete.md)

### [04 - API REST](./04-api/)
- [Endpoints](./04-api/endpoints.md)
- [Ejemplos](./04-api/ejemplos.md)

### [05 - Frontend](./05-frontend/)
- [Estructura](./05-frontend/estructura.md)
- [Flujos de Usuario](./05-frontend/flujos-usuario.md)

### [06 - Sistema de Matching](./06-sistema-matching/)
- [Como Funciona](./06-sistema-matching/como-funciona.md)
- [Fuzzy Matching con pg_trgm](./06-sistema-matching/fuzzy-matching.md)
- [Extraccion de Medidas](./06-sistema-matching/medidas.md)
- [Troubleshooting](./06-sistema-matching/troubleshooting.md)

### [07 - Scripts](./07-scripts/)
- [Comandos NPM](./07-scripts/comandos-npm.md)
- [Scripts de Mantenimiento](./07-scripts/mantenimiento.md)

### [08 - Desarrollo](./08-desarrollo/)
- [Setup Local](./08-desarrollo/setup-local.md)
- [Variables de Entorno](./08-desarrollo/variables-entorno.md)
- [Convenciones de Codigo](./08-desarrollo/convenciones.md)

## Supermercados Soportados

| Supermercado | Slug | Estado |
|-------------|------|--------|
| Superseis | `superseis` | Activo |
| Stock | `stock` | Activo |
| Fortis | `fortis` | Activo |
| Casa Rica | `casarica` | Activo |
| Biggie | `biggie` | Activo |
| Salemma | `salemma` | Activo |
| Arete | `arete` | Activo |

## Tecnologias Principales

- **Runtime**: Node.js con TypeScript (ESM)
- **Scraping**: Cheerio (HTML parsing)
- **Base de Datos**: PostgreSQL con Prisma ORM
- **API**: Express.js
- **Frontend**: React + Vite + TailwindCSS
- **Matching**: pg_trgm (PostgreSQL extension)

## Funcionalidades Principales

- **Scraping de productos**: Extrae precios y datos de 7 supermercados paraguayos
- **Sistema de Matching**: Identifica productos iguales en diferentes tiendas usando fuzzy matching
- **Comparacion de Precios**: Muestra el precio mas barato entre todas las tiendas
- **Ofertas Destacadas**: Sistema de administracion para destacar productos en la pagina principal

## Flujo General

```
Supermercados (web) --> Scrapers --> Products + Prices
                                          |
                                          v
                                    Matching System
                                          |
                                          v
                                  CanonicalProducts
                                          |
                                          v
                                   Comparacion de Precios
                                          |
                                          v
                                   Featured Offers (Admin)
```
