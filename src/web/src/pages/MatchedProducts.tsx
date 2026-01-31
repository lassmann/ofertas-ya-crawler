import { useState, useEffect, useRef, useCallback } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { formatPrice, formatCategory } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  Loader2,
  Store,
} from 'lucide-react'

export function MatchedProducts() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['matched', debouncedSearch, category],
    queryFn: ({ pageParam = 1 }) =>
      api.getMatchedProducts({
        page: pageParam,
        limit: 30,
        search: debouncedSearch || undefined,
        category: category || undefined,
        minStores: 1,
        sort: 'discount',
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1
      }
      return undefined
    },
    initialPageParam: 1,
  })

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px',
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [handleObserver])

  // Flatten all pages data
  const products = data?.pages.flatMap((page) => page.data) ?? []
  const total = data?.pages[0]?.pagination.total ?? 0

  const categoryOptions = categories?.map((c) => ({ value: c, label: formatCategory(c) })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comparar Precios</h1>
        <p className="text-muted-foreground">
          Todos los productos disponibles para comparar precios
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          options={categoryOptions}
          placeholder="Todas las categorias"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron productos</p>
        </div>
      ) : (
        <>
          {/* Total count */}
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} productos encontrados
          </p>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <Link key={product.id} to={`/compare/${product.id}`}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer overflow-hidden">
                  {/* Imagen grande arriba */}
                  <div className="aspect-square bg-gray-50 p-4 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Store className="h-16 w-16 text-gray-300" />
                    )}
                  </div>

                  {/* Info abajo */}
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-medium line-clamp-2 text-sm leading-tight min-h-[2.5rem]">
                      {product.name}
                    </h3>

                    <p className="text-xl font-bold text-orange-500">
                      {formatPrice(product.minPrice)}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{product.storeCount} tiendas</span>
                      {product.priceDifferencePercent > 0 && (
                        <span className="text-green-600 font-medium">
                          -{product.priceDifferencePercent}%
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            )}
            {!hasNextPage && products.length > 0 && (
              <p className="text-sm text-muted-foreground">
                No hay mas productos
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
