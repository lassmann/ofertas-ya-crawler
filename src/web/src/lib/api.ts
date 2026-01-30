const API_BASE = '/api'

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return res.json()
}

// Types
export interface Store {
  id: string
  name: string
  slug: string
  type: string
  logoUrl: string | null
  lastScrapedAt: string | null
  productCount: number
}

export interface UnmatchedProduct {
  id: string
  name: string
  normalizedName: string
  category: string | null
  brand: string | null
  imageUrl: string | null
  store: {
    id: string
    name: string
    slug: string
  }
  price: number | null
  oldPrice: number | null
  lastUpdated: string
}

export interface MatchedProduct {
  id: string
  name: string
  normalizedName: string
  category: string | null
  storeCount: number
  minPrice: number
  maxPrice: number
  cheapestStore: string | null
  imageUrl: string | null
  priceDifferencePercent: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface StorePrice {
  storeId: string
  storeName: string
  storeSlug: string
  storeLogo: string | null
  productId: string
  productName: string
  price: number
  oldPrice: number | null
  hasDiscount: boolean
  discountPercent: number | null
  lastUpdated: string
  sourceUrl: string | null
  matchType: string
  confidence: number
}

export interface CompareResponse {
  canonical: {
    id: string
    name: string
    normalizedName: string
    category: string | null
    brand: string | null
  }
  stores: StorePrice[]
  cheapest: StorePrice | null
  mostExpensive: StorePrice | null
  priceDifference: number
  priceDifferencePercent: number
  storeCount: number
}

export interface StatsResponse {
  overview: {
    totalProducts: number
    matchedProducts: number
    unmatchedProducts: number
    matchPercentage: number
    totalCanonicals: number
    totalStores: number
    totalCategories: number
  }
  topPriceDifferences: {
    id: string
    name: string
    storeCount: number
    minPrice: number
    maxPrice: number
    cheapestStore: string
    mostExpensiveStore: string
    priceDifferencePercent: number
  }[]
  productsPerStore: {
    name: string
    count: number
  }[]
}

export interface CanonicalSearchResult {
  id: string
  name: string
  normalizedName: string
  category: string | null
  similarity: number
}

// API functions
export const api = {
  // Stores
  getStores: () => fetchApi<Store[]>('/stores'),

  // Products
  getUnmatchedProducts: (params: {
    page?: number
    limit?: number
    storeId?: string
    category?: string
    search?: string
  }) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.limit) query.set('limit', params.limit.toString())
    if (params.storeId) query.set('storeId', params.storeId)
    if (params.category) query.set('category', params.category)
    if (params.search) query.set('search', params.search)
    return fetchApi<PaginatedResponse<UnmatchedProduct>>(`/products/unmatched?${query}`)
  },

  getMatchedProducts: (params: {
    page?: number
    limit?: number
    category?: string
    search?: string
    minStores?: number
    sort?: 'discount'
  }) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.limit) query.set('limit', params.limit.toString())
    if (params.category) query.set('category', params.category)
    if (params.search) query.set('search', params.search)
    if (params.minStores) query.set('minStores', params.minStores.toString())
    if (params.sort) query.set('sort', params.sort)
    return fetchApi<PaginatedResponse<MatchedProduct>>(`/products/matched?${query}`)
  },

  getCategories: () => fetchApi<string[]>('/products/categories'),

  // Compare
  getComparison: (canonicalId: string) =>
    fetchApi<CompareResponse>(`/compare/${canonicalId}`),

  // Stats
  getStats: () => fetchApi<StatsResponse>('/stats'),

  // Matches
  searchCanonical: (query: string) =>
    fetchApi<CanonicalSearchResult[]>(`/matches/canonical/search?q=${encodeURIComponent(query)}`),

  createMatch: (productId: string, canonicalProductId: string) =>
    fetchApi<{ success: boolean }>('/matches', {
      method: 'POST',
      body: JSON.stringify({ productId, canonicalProductId }),
    }),

  createCanonicalAndMatch: (productId: string, name: string, category?: string, brand?: string) =>
    fetchApi<{ success: boolean; canonical: { id: string; name: string } }>('/matches/canonical', {
      method: 'POST',
      body: JSON.stringify({ productId, name, category, brand }),
    }),
}
