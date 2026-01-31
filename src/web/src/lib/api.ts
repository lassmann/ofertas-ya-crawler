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

export interface FeaturedOfferInfo {
  id: string
  displayOrder: number
  isActive: boolean
}

export interface CompareResponse {
  canonical: {
    id: string
    name: string
    displayName: string | null
    normalizedName: string
    category: string | null
    brand: string | null
  }
  featuredOffer: FeaturedOfferInfo | null
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

export interface ProductListItem {
  id: string
  name: string
  normalizedName: string
  category: string | null
  brand: string | null
  imageUrl: string | null
  storeId: string
  storeName: string
  hasMatch: boolean
  canonicalName: string | null
  otherMatches: {
    id: string
    name: string
    storeName: string
  }[]
}

export interface FeaturedOffer {
  id: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  canonicalProduct: {
    id: string
    name: string
    category: string | null
    brand: string | null
    imageUrl: string | null
  }
  storeCount: number
  minPrice: number | null
  maxPrice: number | null
  priceDifferencePercent: number
}

// API functions
export const api = {
  // Stores
  getStores: () => fetchApi<Store[]>('/stores'),

  // Products
  getAllProducts: (params: {
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
    return fetchApi<PaginatedResponse<ProductListItem>>(`/products?${query}`)
  },

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

  updateProductCategory: (productId: string, category: string) =>
    fetchApi<{ success: boolean; product: { id: string; category: string } }>(
      `/products/${productId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ category }),
      }
    ),

  // Compare
  getComparison: (canonicalId: string) =>
    fetchApi<CompareResponse>(`/compare/${canonicalId}`),

  // Stats
  getStats: () => fetchApi<StatsResponse>('/stats'),

  getPriceDifferences: (params: { page?: number; limit?: number }) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.limit) query.set('limit', params.limit.toString())
    return fetchApi<PaginatedResponse<{
      id: string
      name: string
      storeCount: number
      minPrice: number
      maxPrice: number
      cheapestStore: string
      mostExpensiveStore: string
      priceDifferencePercent: number
    }>>(`/stats/price-differences?${query}`)
  },

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

  deleteMatch: (productId: string, hide?: boolean) =>
    fetchApi<{ success: boolean; productId: string; hidden: boolean }>(
      `/matches/${productId}${hide ? '?hide=true' : ''}`,
      { method: 'DELETE' }
    ),

  // Featured Offers
  getFeaturedOffers: (includeInactive?: boolean) =>
    fetchApi<FeaturedOffer[]>(`/featured${includeInactive ? '?includeInactive=true' : ''}`),

  createFeaturedOffer: (canonicalProductId: string, displayOrder?: number) =>
    fetchApi<{ success: boolean; featured: { id: string; canonicalProductId: string; displayOrder: number; isActive: boolean } }>(
      '/featured',
      {
        method: 'POST',
        body: JSON.stringify({ canonicalProductId, displayOrder }),
      }
    ),

  updateFeaturedOffer: (id: string, data: { displayOrder?: number; isActive?: boolean }) =>
    fetchApi<{ success: boolean; featured: { id: string; displayOrder: number; isActive: boolean } }>(
      `/featured/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    ),

  reorderFeaturedOffers: (items: { id: string; displayOrder: number }[]) =>
    fetchApi<{ success: boolean }>('/featured/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  deleteFeaturedOffer: (id: string) =>
    fetchApi<{ success: boolean; id: string }>(`/featured/${id}`, {
      method: 'DELETE',
    }),

  // Canonical Products
  updateCanonicalDisplayName: (id: string, displayName: string) =>
    fetchApi<{ success: boolean; canonical: { id: string; name: string; displayName: string | null } }>(
      `/canonical/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ displayName }),
      }
    ),
}
