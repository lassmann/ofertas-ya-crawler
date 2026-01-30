# API REST - Endpoints

Base URL: `http://localhost:3001/api`

## Resumen de Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/stores` | Lista de tiendas |
| GET | `/stats` | Estadisticas del dashboard |
| GET | `/products/unmatched` | Productos sin match |
| GET | `/products/matched` | Productos canonicos matcheados |
| GET | `/products/categories` | Lista de categorias |
| GET | `/matches/canonical/search` | Buscar productos canonicos |
| POST | `/matches` | Crear match manual |
| POST | `/matches/canonical` | Crear producto canonico + match |
| GET | `/compare/:canonicalId` | Comparar precios |

---

## Stores

### GET /api/stores

Lista todas las tiendas activas con conteo de productos.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Superseis",
    "slug": "superseis",
    "type": "SUPERMERCADO",
    "logoUrl": "https://...",
    "lastScrapedAt": "2024-01-15T10:30:00Z",
    "productCount": 1500
  }
]
```

---

## Stats

### GET /api/stats

Estadisticas generales del sistema.

**Response:**
```json
{
  "overview": {
    "totalProducts": 10000,
    "matchedProducts": 8500,
    "unmatchedProducts": 1500,
    "matchPercentage": 85,
    "totalCanonicals": 5000,
    "totalStores": 6,
    "totalCategories": 15
  },
  "topPriceDifferences": [
    {
      "id": "uuid",
      "name": "Coca-Cola Original 2L",
      "storeCount": 5,
      "minPrice": 14500,
      "maxPrice": 18000,
      "cheapestStore": "Stock",
      "mostExpensiveStore": "Fortis",
      "priceDifferencePercent": 24
    }
  ],
  "productsPerStore": [
    { "name": "Superseis", "count": 2500 },
    { "name": "Stock", "count": 2000 }
  ]
}
```

---

## Products

### GET /api/products/unmatched

Lista productos que no tienen match con un producto canonico.

**Query Parameters:**
| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `storeId` | string | - | Filtrar por tienda |
| `category` | string | - | Filtrar por categoria |
| `search` | string | - | Buscar por nombre |
| `page` | number | 1 | Pagina |
| `limit` | number | 50 | Items por pagina (max 100) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Producto Sin Match",
      "normalizedName": "producto sin match",
      "category": "bebidas",
      "brand": null,
      "imageUrl": "https://...",
      "store": {
        "id": "uuid",
        "name": "Superseis",
        "slug": "superseis"
      },
      "price": 15000,
      "oldPrice": null,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "totalPages": 30
  }
}
```

---

### GET /api/products/matched

Lista productos canonicos que tienen matches en multiples tiendas.

**Query Parameters:**
| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `category` | string | - | Filtrar por categoria |
| `search` | string | - | Buscar por nombre |
| `minStores` | number | 2 | Minimo de tiendas |
| `page` | number | 1 | Pagina |
| `limit` | number | 50 | Items por pagina (max 100) |
| `sort` | string | - | `discount` para ordenar por diferencia de precio |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Coca-Cola Original 2L",
      "normalizedName": "coca cola original 2l",
      "category": "bebidas",
      "storeCount": 5,
      "minPrice": 14500,
      "maxPrice": 18000,
      "cheapestStore": "Stock",
      "imageUrl": "https://...",
      "priceDifferencePercent": 24
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3000,
    "totalPages": 60
  }
}
```

---

### GET /api/products/categories

Lista todas las categorias unicas.

**Response:**
```json
["bebidas", "carnes", "fiambres", "lacteos", "limpieza", "ofertas", "panaderia"]
```

---

## Matches

### GET /api/matches/canonical/search

Busca productos canonicos por similitud de nombre.

**Query Parameters:**
| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `q` | string | **requerido** | Query de busqueda (min 2 chars) |
| `limit` | number | 20 | Limite de resultados (max 50) |

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Coca-Cola Original 2L",
    "normalizedName": "coca cola original 2l",
    "category": "bebidas",
    "similarity": 0.95
  }
]
```

---

### POST /api/matches

Crea un match manual entre un producto y un producto canonico existente.

**Request Body:**
```json
{
  "productId": "uuid-del-producto",
  "canonicalProductId": "uuid-del-canonico"
}
```

**Response:**
```json
{
  "success": true,
  "match": {
    "id": "uuid",
    "productId": "uuid",
    "canonicalProductId": "uuid",
    "matchType": "MANUAL",
    "confidence": 1.0
  }
}
```

**Errores:**
- `400`: productId o canonicalProductId faltante
- `400`: Producto ya tiene match
- `404`: Producto o canonico no encontrado

**Notas:**
- Crea automaticamente un `CanonicalAlias` con el `normalizedName` del producto

---

### POST /api/matches/canonical

Crea un nuevo producto canonico y lo matchea con el producto.

**Request Body:**
```json
{
  "productId": "uuid-del-producto",
  "name": "Nombre del Producto Canonico",
  "category": "bebidas",
  "brand": "Marca"
}
```

**Response:**
```json
{
  "success": true,
  "canonical": {
    "id": "uuid",
    "name": "Nombre del Producto Canonico",
    "normalizedName": "nombre del producto canonico"
  },
  "match": {
    "id": "uuid",
    "matchType": "MANUAL"
  }
}
```

**Errores:**
- `400`: productId o name faltante
- `400`: Producto ya tiene match
- `400`: Ya existe un canonico con ese nombre normalizado
- `404`: Producto no encontrado

---

## Compare

### GET /api/compare/:canonicalId

Obtiene comparacion de precios de un producto canonico en todas las tiendas.

**Response:**
```json
{
  "canonical": {
    "id": "uuid",
    "name": "Coca-Cola Original 2L",
    "normalizedName": "coca cola original 2l",
    "category": "bebidas",
    "brand": "Coca-Cola"
  },
  "stores": [
    {
      "storeId": "uuid",
      "storeName": "Stock",
      "storeSlug": "stock",
      "storeLogo": "https://...",
      "productId": "uuid",
      "productName": "Coca Cola Original 2 Litros",
      "price": 14500,
      "oldPrice": 16000,
      "hasDiscount": true,
      "discountPercent": 9,
      "lastUpdated": "2024-01-15T10:30:00Z",
      "sourceUrl": "https://...",
      "matchType": "FUZZY",
      "confidence": 0.92
    },
    {
      "storeId": "uuid",
      "storeName": "Superseis",
      "storeSlug": "superseis",
      "storeLogo": "https://...",
      "productId": "uuid",
      "productName": "COCA COLA ORIGINAL 2LT",
      "price": 15000,
      "oldPrice": null,
      "hasDiscount": false,
      "discountPercent": null,
      "lastUpdated": "2024-01-15T09:00:00Z",
      "sourceUrl": "https://...",
      "matchType": "ALIAS",
      "confidence": 0.99
    }
  ],
  "cheapest": { ... },
  "mostExpensive": { ... },
  "priceDifference": 3500,
  "priceDifferencePercent": 24,
  "storeCount": 5
}
```

**Notas:**
- `stores` esta ordenado por precio ascendente (mas barato primero)
- `cheapest` y `mostExpensive` son el primer y ultimo elemento de `stores`
