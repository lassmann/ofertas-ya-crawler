# Overview del Sistema

Ofertas Ya Crawler es un sistema de scraping y comparacion de precios de supermercados paraguayos. Permite recolectar precios de multiples supermercados, unificar productos equivalentes, y comparar precios entre tiendas.

## Que Hace el Sistema

1. **Scraping de Productos**: Extrae productos y precios de sitios web de supermercados
2. **Normalizacion**: Normaliza nombres de productos para facilitar comparaciones
3. **Matching**: Identifica productos equivalentes entre diferentes tiendas
4. **Comparacion**: Permite comparar precios del mismo producto en diferentes supermercados
5. **Historial**: Mantiene historial de precios para analisis de tendencias

## Componentes Principales

### Scrapers
Cada supermercado tiene su propio scraper que:
- Navega por categorias del sitio web
- Extrae informacion de productos (nombre, precio, imagen, etc.)
- Normaliza los datos
- Guarda en la base de datos

### Base de Datos
PostgreSQL con los siguientes modelos principales:
- `Store`: Supermercados
- `Product`: Productos por tienda
- `Price`: Historial de precios
- `CanonicalProduct`: Producto unico "real"
- `ProductMatch`: Relacion entre Product y CanonicalProduct

### Sistema de Matching
Proceso que unifica productos equivalentes:
1. Match por barcode (100% confianza)
2. Match por alias conocido (99% confianza)
3. Match por similitud fuzzy (60-95% confianza)
4. Creacion de nuevo producto canonico

### API REST
Endpoints para:
- Listar productos sin match
- Crear matches manuales
- Comparar precios
- Estadisticas del sistema

### Frontend
Interfaz web con:
- Dashboard de estadisticas
- Lista de productos sin match
- Herramienta de matching manual
- Comparador de precios

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS                              │
└─────────────────────────────────────────────────────────────────────┘

   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │Superseis │  │  Stock   │  │  Fortis  │  │   ...    │
   │  (web)   │  │  (web)   │  │  (web)   │  │  (web)   │
   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
        │             │             │             │
        v             v             v             v
   ┌─────────────────────────────────────────────────────┐
   │                    SCRAPERS                         │
   │  - Fetch HTML                                       │
   │  - Parse con Cheerio                                │
   │  - Normalizar nombres                               │
   │  - Extraer cantidad/unidad                          │
   └─────────────────────┬───────────────────────────────┘
                         │
                         v
   ┌─────────────────────────────────────────────────────┐
   │                 BASE DE DATOS                       │
   │  ┌─────────┐    ┌─────────┐    ┌─────────┐         │
   │  │  Store  │───▶│ Product │───▶│  Price  │         │
   │  └─────────┘    └────┬────┘    └─────────┘         │
   │                      │                              │
   │                      v                              │
   │              ┌──────────────┐                       │
   │              │ ProductMatch │                       │
   │              └──────┬───────┘                       │
   │                     │                               │
   │                     v                               │
   │           ┌─────────────────────┐                   │
   │           │  CanonicalProduct   │                   │
   │           └─────────────────────┘                   │
   └─────────────────────┬───────────────────────────────┘
                         │
                         v
   ┌─────────────────────────────────────────────────────┐
   │                    API REST                         │
   │  /api/products    /api/matches    /api/compare      │
   └─────────────────────┬───────────────────────────────┘
                         │
                         v
   ┌─────────────────────────────────────────────────────┐
   │                    FRONTEND                         │
   │  Dashboard  │  Unmatched  │  Matched  │  Compare    │
   └─────────────────────────────────────────────────────┘
```

## Modelo de Datos Simplificado

```
Store (Supermercado)
  └── Product (Producto en esa tienda)
        ├── Price (Historial de precios)
        └── ProductMatch ───┐
                            │
                            v
                   CanonicalProduct (Producto "real")
                            │
                            └── CanonicalAlias (Nombres alternativos)
```

## Casos de Uso

### 1. Usuario quiere comparar precios de Coca-Cola 2L
1. Frontend busca "coca cola 2l" en productos matched
2. API retorna CanonicalProduct con matches en multiples tiendas
3. Frontend muestra precios ordenados de menor a mayor

### 2. Operador quiere matchear un producto nuevo
1. Scraper guarda producto nuevo (sin match)
2. Operador ve producto en lista "Unmatched"
3. Operador busca producto canonico existente o crea uno nuevo
4. Sistema crea ProductMatch y CanonicalAlias

### 3. Sistema procesa matching automatico
1. Job `match:process` obtiene productos sin match
2. Para cada producto, intenta en orden:
   - Match por barcode
   - Match por alias
   - Match por similitud fuzzy
3. Si no encuentra match, crea nuevo CanonicalProduct
