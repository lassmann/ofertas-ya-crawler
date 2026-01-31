import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type UnmatchedProduct, type CanonicalSearchResult } from '@/lib/api'
import { formatPrice, formatCategory } from '@/lib/utils'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  Loader2,
  Link2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'

export function UnmatchedProducts() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [storeId, setStoreId] = useState('')
  const [category, setCategory] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Match dialog state
  const [matchDialogOpen, setMatchDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<UnmatchedProduct | null>(null)
  const [canonicalSearch, setCanonicalSearch] = useState('')
  const [selectedCanonical, setSelectedCanonical] = useState<CanonicalSearchResult | null>(null)
  const [newCanonicalName, setNewCanonicalName] = useState('')

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
    queryKey: ['unmatched', page, debouncedSearch, storeId, category],
    queryFn: () =>
      api.getUnmatchedProducts({
        page,
        limit: 50,
        search: debouncedSearch || undefined,
        storeId: storeId || undefined,
        category: category || undefined,
      }),
  })

  const { data: canonicalResults, isLoading: isSearchingCanonical } = useQuery({
    queryKey: ['canonical-search', canonicalSearch],
    queryFn: () => api.searchCanonical(canonicalSearch),
    enabled: canonicalSearch.length >= 2,
  })

  // Mutations
  const createMatchMutation = useMutation({
    mutationFn: ({ productId, canonicalProductId }: { productId: string; canonicalProductId: string }) =>
      api.createMatch(productId, canonicalProductId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      closeMatchDialog()
    },
  })

  const createCanonicalMutation = useMutation({
    mutationFn: ({ productId, name }: { productId: string; name: string }) =>
      api.createCanonicalAndMatch(productId, name, selectedProduct?.category || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      closeMatchDialog()
    },
  })

  const openMatchDialog = (product: UnmatchedProduct) => {
    setSelectedProduct(product)
    setCanonicalSearch(product.name)
    setNewCanonicalName(product.name)
    setSelectedCanonical(null)
    setMatchDialogOpen(true)
  }

  const closeMatchDialog = () => {
    setMatchDialogOpen(false)
    setSelectedProduct(null)
    setCanonicalSearch('')
    setSelectedCanonical(null)
    setNewCanonicalName('')
  }

  const handleMatch = () => {
    if (!selectedProduct) return

    if (selectedCanonical) {
      createMatchMutation.mutate({
        productId: selectedProduct.id,
        canonicalProductId: selectedCanonical.id,
      })
    } else if (newCanonicalName.trim()) {
      createCanonicalMutation.mutate({
        productId: selectedProduct.id,
        name: newCanonicalName.trim(),
      })
    }
  }

  const storeOptions = stores?.map((s) => ({ value: s.id, label: s.name })) || []
  const categoryOptions = categories?.map((c) => ({ value: c, label: formatCategory(c) })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Productos Sin Match</h1>
        <p className="text-muted-foreground">
          Productos que no tienen match con un producto canonico
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
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
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
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
                  <TableHead>Producto</TableHead>
                  <TableHead>Tienda</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium line-clamp-2">{product.name}</p>
                          {product.brand && (
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.store.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="secondary">{formatCategory(product.category)}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.price ? (
                        <div>
                          <p className="font-medium">{formatPrice(product.price)}</p>
                          {product.oldPrice && product.oldPrice > product.price && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.oldPrice)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMatchDialog(product)}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Match
                      </Button>
                    </TableCell>
                  </TableRow>
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

      {/* Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent onClose={closeMatchDialog} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Match</DialogTitle>
            <DialogDescription>
              Asocia este producto con un producto canonico existente o crea uno nuevo
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Selected Product Info */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedProduct.store.name} - {formatCategory(selectedProduct.category || '')}
                </p>
              </div>

              {/* Search Canonical */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar producto canonico</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={canonicalSearch}
                    onChange={(e) => {
                      setCanonicalSearch(e.target.value)
                      setSelectedCanonical(null)
                    }}
                    className="pl-9"
                  />
                </div>

                {/* Search Results */}
                {isSearchingCanonical && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando...
                  </div>
                )}

                {canonicalResults && canonicalResults.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-auto">
                    {canonicalResults.map((result) => (
                      <button
                        key={result.id}
                        className={`w-full text-left p-3 hover:bg-muted transition-colors border-b last:border-0 ${
                          selectedCanonical?.id === result.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setSelectedCanonical(result)}
                      >
                        <p className="font-medium text-sm">{result.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCategory(result.category || '')} - Similitud: {Math.round(result.similarity * 100)}%
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {canonicalSearch.length >= 2 && !isSearchingCanonical && canonicalResults?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No se encontraron productos canonicos
                  </p>
                )}
              </div>

              {/* Create New Canonical */}
              {!selectedCanonical && (
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Crear nuevo producto canonico
                  </label>
                  <Input
                    placeholder="Nombre del producto canonico"
                    value={newCanonicalName}
                    onChange={(e) => setNewCanonicalName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeMatchDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleMatch}
              disabled={
                (!selectedCanonical && !newCanonicalName.trim()) ||
                createMatchMutation.isPending ||
                createCanonicalMutation.isPending
              }
            >
              {(createMatchMutation.isPending || createCanonicalMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedCanonical ? 'Crear Match' : 'Crear Canonico y Match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
