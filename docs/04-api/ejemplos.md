# API REST - Ejemplos

## Usando cURL

### Listar tiendas

```bash
curl http://localhost:3001/api/stores
```

### Obtener estadisticas

```bash
curl http://localhost:3001/api/stats
```

### Buscar productos sin match

```bash
# Todos los productos sin match
curl "http://localhost:3001/api/products/unmatched"

# Filtrar por tienda
curl "http://localhost:3001/api/products/unmatched?storeId=uuid-de-tienda"

# Filtrar por categoria
curl "http://localhost:3001/api/products/unmatched?category=bebidas"

# Buscar por nombre
curl "http://localhost:3001/api/products/unmatched?search=coca%20cola"

# Paginacion
curl "http://localhost:3001/api/products/unmatched?page=2&limit=20"

# Combinar filtros
curl "http://localhost:3001/api/products/unmatched?category=bebidas&search=cola&page=1&limit=50"
```

### Buscar productos matcheados

```bash
# Productos en al menos 2 tiendas
curl "http://localhost:3001/api/products/matched"

# Productos en al menos 3 tiendas
curl "http://localhost:3001/api/products/matched?minStores=3"

# Ordenar por mayor diferencia de precio
curl "http://localhost:3001/api/products/matched?sort=discount"

# Filtrar por categoria
curl "http://localhost:3001/api/products/matched?category=lacteos&minStores=2"
```

### Buscar productos canonicos

```bash
# Buscar "coca cola"
curl "http://localhost:3001/api/matches/canonical/search?q=coca%20cola"

# Limitar resultados
curl "http://localhost:3001/api/matches/canonical/search?q=leche&limit=10"
```

### Crear match manual

```bash
# Matchear producto existente con canonico existente
curl -X POST http://localhost:3001/api/matches \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "123e4567-e89b-12d3-a456-426614174000",
    "canonicalProductId": "987fcdeb-51a2-3bc4-d567-890123456789"
  }'
```

### Crear nuevo canonico + match

```bash
curl -X POST http://localhost:3001/api/matches/canonical \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Coca-Cola Original 2L",
    "category": "bebidas",
    "brand": "Coca-Cola"
  }'
```

### Comparar precios

```bash
curl http://localhost:3001/api/compare/987fcdeb-51a2-3bc4-d567-890123456789
```

---

## Usando JavaScript/TypeScript

### Setup con fetch

```typescript
const API_BASE = 'http://localhost:3001/api'

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}
```

### Obtener productos sin match

```typescript
interface UnmatchedProduct {
  id: string
  name: string
  normalizedName: string
  category: string | null
  store: { id: string; name: string; slug: string }
  price: number | null
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function getUnmatchedProducts(params?: {
  storeId?: string
  category?: string
  search?: string
  page?: number
  limit?: number
}): Promise<PaginatedResponse<UnmatchedProduct>> {
  const searchParams = new URLSearchParams()

  if (params?.storeId) searchParams.set('storeId', params.storeId)
  if (params?.category) searchParams.set('category', params.category)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())

  const query = searchParams.toString()
  return apiRequest(`/products/unmatched${query ? `?${query}` : ''}`)
}

// Uso
const result = await getUnmatchedProducts({
  category: 'bebidas',
  page: 1,
  limit: 20
})
console.log(`Total: ${result.pagination.total}`)
result.data.forEach(p => console.log(p.name))
```

### Buscar y crear match

```typescript
interface CanonicalSearchResult {
  id: string
  name: string
  normalizedName: string
  similarity: number
}

async function searchCanonicals(query: string): Promise<CanonicalSearchResult[]> {
  return apiRequest(`/matches/canonical/search?q=${encodeURIComponent(query)}`)
}

async function createMatch(productId: string, canonicalProductId: string) {
  return apiRequest('/matches', {
    method: 'POST',
    body: JSON.stringify({ productId, canonicalProductId }),
  })
}

// Uso: buscar y matchear
const canonicals = await searchCanonicals('coca cola 2l')
if (canonicals.length > 0 && canonicals[0].similarity > 0.9) {
  await createMatch('product-uuid', canonicals[0].id)
  console.log('Match creado!')
}
```

### Comparar precios

```typescript
interface CompareResult {
  canonical: {
    id: string
    name: string
    category: string | null
  }
  stores: Array<{
    storeName: string
    price: number
    hasDiscount: boolean
  }>
  cheapest: { storeName: string; price: number } | null
  priceDifferencePercent: number
}

async function comparePrices(canonicalId: string): Promise<CompareResult> {
  return apiRequest(`/compare/${canonicalId}`)
}

// Uso
const comparison = await comparePrices('canonical-uuid')
console.log(`${comparison.canonical.name}:`)
console.log(`  Mas barato: ${comparison.cheapest?.storeName} - ₲${comparison.cheapest?.price}`)
console.log(`  Diferencia: ${comparison.priceDifferencePercent}%`)
```

---

## Usando React Query

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Hook para productos sin match
function useUnmatchedProducts(params: {
  storeId?: string
  category?: string
  page?: number
}) {
  return useQuery({
    queryKey: ['unmatched', params],
    queryFn: () => getUnmatchedProducts(params),
  })
}

// Hook para buscar canonicos
function useCanonicalSearch(query: string) {
  return useQuery({
    queryKey: ['canonical-search', query],
    queryFn: () => searchCanonicals(query),
    enabled: query.length >= 2,
  })
}

// Mutation para crear match
function useCreateMatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, canonicalProductId }: {
      productId: string
      canonicalProductId: string
    }) => createMatch(productId, canonicalProductId),
    onSuccess: () => {
      // Invalidar cache de productos sin match
      queryClient.invalidateQueries({ queryKey: ['unmatched'] })
    },
  })
}

// Uso en componente
function MatchingPage() {
  const { data, isLoading } = useUnmatchedProducts({ category: 'bebidas' })
  const createMatch = useCreateMatch()

  const handleMatch = (productId: string, canonicalId: string) => {
    createMatch.mutate({ productId, canonicalProductId: canonicalId })
  }

  if (isLoading) return <div>Cargando...</div>

  return (
    <ul>
      {data?.data.map(product => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  )
}
```
