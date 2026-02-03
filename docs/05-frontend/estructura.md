# Frontend - Estructura

## Stack Tecnologico

| Tecnologia | Uso |
|-----------|-----|
| React 19 | Framework UI |
| Vite | Build tool y dev server |
| TailwindCSS 4 | Estilos |
| React Router | Navegacion |
| TanStack Query | Estado del servidor |
| React Table | Tablas |
| React Hook Form | Formularios |
| Zod | Validacion |
| Lucide React | Iconos |

## Estructura de Directorios

```
src/web/
├── src/
│   ├── components/       # Componentes reutilizables
│   │   ├── ui/          # Componentes base (Button, Input, etc.)
│   │   └── ...
│   ├── lib/
│   │   └── api.ts       # Cliente API
│   ├── pages/           # Paginas/rutas
│   │   ├── Dashboard.tsx
│   │   ├── UnmatchedProducts.tsx
│   │   ├── MatchedProducts.tsx
│   │   ├── Products.tsx
│   │   ├── AdminFeatured.tsx
│   │   └── Compare.tsx
│   ├── App.tsx          # Componente raiz + rutas
│   ├── main.tsx         # Entry point
│   └── index.css        # Estilos globales
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Paginas

### Dashboard (`/`)

Pagina principal con estadisticas generales:
- Total de productos
- Productos matcheados vs sin match
- Productos por tienda
- Top productos con mayor diferencia de precio

### UnmatchedProducts (`/unmatched`)

Lista de productos que necesitan ser matcheados:
- Filtros por tienda y categoria
- Busqueda por nombre
- Paginacion
- Accion para matchear cada producto

### MatchedProducts (`/matched`)

Lista de productos canonicos con matches:
- Filtros por categoria
- Busqueda por nombre
- Ordenar por diferencia de precio
- Ver comparacion de cada producto

### Compare (`/compare/:id`)

Comparacion de precios de un producto especifico:
- Lista de precios por tienda
- Indicador del mas barato
- Descuentos actuales
- Links a fuente original

### Products (`/products`)

Pagina de busqueda de todos los productos:
- Busqueda por nombre
- Filtros por tienda y categoria
- Muestra estado de match de cada producto
- Expandible para ver matches en otras tiendas
- Paginacion

### AdminFeatured (`/admin/featured`)

Administracion de ofertas destacadas:
- Lista de productos destacados con orden
- Agregar nuevos productos (busqueda de canonicos)
- Reordenar con flechas arriba/abajo
- Activar/desactivar ofertas
- Eliminar ofertas

## Cliente API

```typescript
// src/web/src/lib/api.ts

const API_BASE = 'http://localhost:3001/api'

export const api = {
  // Stores
  getStores: () => fetch(`${API_BASE}/stores`).then(r => r.json()),

  // Stats
  getStats: () => fetch(`${API_BASE}/stats`).then(r => r.json()),

  // Products
  getUnmatched: (params) =>
    fetch(`${API_BASE}/products/unmatched?${new URLSearchParams(params)}`)
      .then(r => r.json()),

  getMatched: (params) =>
    fetch(`${API_BASE}/products/matched?${new URLSearchParams(params)}`)
      .then(r => r.json()),

  getCategories: () =>
    fetch(`${API_BASE}/products/categories`).then(r => r.json()),

  // Matches
  searchCanonical: (query) =>
    fetch(`${API_BASE}/matches/canonical/search?q=${query}`)
      .then(r => r.json()),

  createMatch: (productId, canonicalProductId) =>
    fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, canonicalProductId }),
    }).then(r => r.json()),

  createCanonical: (data) =>
    fetch(`${API_BASE}/matches/canonical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  // Compare
  getComparison: (canonicalId) =>
    fetch(`${API_BASE}/compare/${canonicalId}`).then(r => r.json()),

  // Featured offers
  getFeaturedOffers: (includeInactive = false) =>
    fetch(`${API_BASE}/featured${includeInactive ? '?includeInactive=true' : ''}`)
      .then(r => r.json()),

  createFeaturedOffer: (canonicalProductId) =>
    fetch(`${API_BASE}/featured`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canonicalProductId }),
    }).then(r => r.json()),

  updateFeaturedOffer: (id, data) =>
    fetch(`${API_BASE}/featured/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  deleteFeaturedOffer: (id) =>
    fetch(`${API_BASE}/featured/${id}`, { method: 'DELETE' })
      .then(r => r.json()),

  // All products
  getAllProducts: (params) =>
    fetch(`${API_BASE}/products?${new URLSearchParams(params)}`)
      .then(r => r.json()),
}
```

## Componentes Principales

### ProductCard

Muestra informacion basica de un producto:
```tsx
<ProductCard
  name="Coca-Cola Original 2L"
  price={15000}
  oldPrice={18000}
  imageUrl="https://..."
  store="Superseis"
/>
```

### PriceComparison

Tabla comparativa de precios:
```tsx
<PriceComparison
  stores={[
    { name: 'Stock', price: 14500, hasDiscount: true },
    { name: 'Superseis', price: 15000, hasDiscount: false },
  ]}
/>
```

### MatchDialog

Modal para matchear un producto:
```tsx
<MatchDialog
  product={selectedProduct}
  onMatch={(canonicalId) => handleMatch(canonicalId)}
  onCreateNew={(name) => handleCreateCanonical(name)}
/>
```

## Hooks Personalizados

```typescript
// Productos sin match con paginacion
function useUnmatchedProducts(filters) {
  return useQuery({
    queryKey: ['unmatched', filters],
    queryFn: () => api.getUnmatched(filters),
  })
}

// Busqueda de canonicos con debounce
function useCanonicalSearch(query) {
  return useQuery({
    queryKey: ['canonical-search', query],
    queryFn: () => api.searchCanonical(query),
    enabled: query.length >= 2,
  })
}

// Mutation para crear match
function useCreateMatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.createMatch,
    onSuccess: () => {
      queryClient.invalidateQueries(['unmatched'])
      queryClient.invalidateQueries(['matched'])
    },
  })
}
```

## Comandos

```bash
# Desarrollo
npm run dev:web           # Solo frontend (puerto 5173)
npm run dev:full          # Frontend + API

# Build
npm run build:web         # Build de produccion
```

## Configuracion Vite

```typescript
// src/web/vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/web',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
```
