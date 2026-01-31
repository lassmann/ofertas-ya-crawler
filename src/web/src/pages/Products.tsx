import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type ProductListItem } from '@/lib/api'
import { formatCategory } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

function ProductRow({ product }: { product: ProductListItem }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasOtherMatches = product.hasMatch && product.otherMatches.length > 0

  return (
    <>
      <TableRow
        className={hasOtherMatches ? 'cursor-pointer' : ''}
        onClick={() => hasOtherMatches && setIsExpanded(!isExpanded)}
      >
        <TableCell>
          <div className="flex items-center gap-3">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-10 h-10 object-cover rounded"
              />
            )}
            <div className="min-w-0">
              <p className="font-medium line-clamp-2">{product.name}</p>
              {product.brand && (
                <p className="text-xs text-muted-foreground">{product.brand}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{product.storeName}</Badge>
        </TableCell>
        <TableCell>
          {product.category ? (
            <Badge variant="secondary">{formatCategory(product.category)}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </TableCell>
        <TableCell>
          {product.hasMatch ? (
            <div className="flex items-center gap-2">
              {hasOtherMatches ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(!isExpanded)
                  }}
                >
                  <Check className="h-3 w-3 text-green-600" />
                  {product.otherMatches.length + 1} tiendas
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              ) : (
                <Badge variant="success" className="flex items-center gap-1 w-fit">
                  <Check className="h-3 w-3" />
                  Match
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="secondary">Sin match</Badge>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded row showing related matches */}
      {isExpanded && hasOtherMatches && (
        <TableRow className="bg-slate-50">
          <TableCell colSpan={4} className="py-3">
            <div className="pl-4">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Mismo producto en otras tiendas:
              </p>
              <div className="space-y-2">
                {product.otherMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-3 text-sm py-2 px-3 bg-white rounded border"
                  >
                    <Badge variant="outline" className="flex-shrink-0">
                      {match.storeName}
                    </Badge>
                    <span className="text-slate-600 line-clamp-1">{match.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function Products() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [storeId, setStoreId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }

  // Queries
  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: api.getStores,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['all-products', page, debouncedSearch, storeId, categoryFilter],
    queryFn: () =>
      api.getAllProducts({
        page,
        limit: 50,
        search: debouncedSearch || undefined,
        storeId: storeId || undefined,
        category: categoryFilter || undefined,
      }),
  })

  const storeOptions = stores?.map((s) => ({ value: s.id, label: s.name })) || []
  const categoryOptions = categories?.map((c) => ({ value: c, label: formatCategory(c) })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Productos</h1>
        <p className="text-muted-foreground">
          Busca productos y visualiza sus matches. Prueba buscar "coca cola" o "alfajor".
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          options={storeOptions}
          placeholder="Todas las tiendas"
          value={storeId}
          onChange={(e) => {
            setStoreId(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-48"
        />
        <Select
          options={categoryOptions}
          placeholder="Todas las categorias"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          className="w-full sm:w-48"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data?.data.length ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron productos</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Producto</TableHead>
                  <TableHead>Tienda</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {((page - 1) * 50) + 1} - {Math.min(page * 50, data.pagination.total)} de {data.pagination.total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Pagina {page} de {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
