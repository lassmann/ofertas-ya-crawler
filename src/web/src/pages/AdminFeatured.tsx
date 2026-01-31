import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, FeaturedOffer, CanonicalSearchResult } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Star,
  Store,
  X,
} from 'lucide-react'

export function AdminFeatured() {
  const queryClient = useQueryClient()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CanonicalSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: featured, isLoading } = useQuery({
    queryKey: ['featured', true],
    queryFn: () => api.getFeaturedOffers(true),
  })

  const createMutation = useMutation({
    mutationFn: (canonicalProductId: string) => api.createFeaturedOffer(canonicalProductId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured'] })
      setShowAddDialog(false)
      setSearchQuery('')
      setSearchResults([])
      setHasSearched(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { displayOrder?: number; isActive?: boolean } }) =>
      api.updateFeaturedOffer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteFeaturedOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured'] })
      setDeleteId(null)
    },
  })

  // Auto-search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchCanonical(searchQuery)
        setSearchResults(results)
        setHasSearched(true)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleMoveUp = (offer: FeaturedOffer, index: number) => {
    if (index === 0 || !featured) return
    const prevOffer = featured[index - 1]
    // Swap display orders
    updateMutation.mutate({ id: offer.id, data: { displayOrder: prevOffer.displayOrder } })
    updateMutation.mutate({ id: prevOffer.id, data: { displayOrder: offer.displayOrder } })
  }

  const handleMoveDown = (offer: FeaturedOffer, index: number) => {
    if (!featured || index === featured.length - 1) return
    const nextOffer = featured[index + 1]
    // Swap display orders
    updateMutation.mutate({ id: offer.id, data: { displayOrder: nextOffer.displayOrder } })
    updateMutation.mutate({ id: nextOffer.id, data: { displayOrder: offer.displayOrder } })
  }

  const toggleActive = (offer: FeaturedOffer) => {
    updateMutation.mutate({ id: offer.id, data: { isActive: !offer.isActive } })
  }

  // Filter out already featured products from search results
  const filteredResults = searchResults.filter(
    (result) => !featured?.some((f) => f.canonicalProduct.id === result.id)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Ofertas Destacadas
          </h1>
          <p className="text-muted-foreground">
            Administra los productos destacados que aparecen en la pagina principal
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : featured?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted-foreground">No hay ofertas destacadas</p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar primera oferta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {featured?.map((offer, index) => (
            <Card
              key={offer.id}
              className={!offer.isActive ? 'opacity-50' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Order controls */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(offer, index)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === (featured?.length ?? 0) - 1}
                      onClick={() => handleMoveDown(offer, index)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    {offer.canonicalProduct.imageUrl ? (
                      <img
                        src={offer.canonicalProduct.imageUrl}
                        alt={offer.canonicalProduct.name}
                        className="w-full h-full object-contain rounded"
                      />
                    ) : (
                      <Store className="h-8 w-8 text-gray-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{offer.canonicalProduct.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {offer.canonicalProduct.category && (
                        <span>{offer.canonicalProduct.category}</span>
                      )}
                      <span>{offer.storeCount} tiendas</span>
                    </div>
                    {offer.minPrice && (
                      <p className="text-lg font-bold text-orange-500">
                        {formatPrice(offer.minPrice)}
                        {offer.priceDifferencePercent > 0 && (
                          <span className="text-sm text-green-600 ml-2">
                            -{offer.priceDifferencePercent}%
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(offer)}
                      title={offer.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {offer.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(offer.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-24 px-4 overflow-y-auto">
          <Card className="w-full max-w-lg mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Agregar Oferta Destacada</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddDialog(false)
                    setSearchQuery('')
                    setSearchResults([])
                    setHasSearched(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Busca productos que ya tengan match (productos canonicos)
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ej: coca cola, yerba, leche..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="max-h-64 overflow-auto">
                {hasSearched && filteredResults.length === 0 && searchResults.length > 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Todos los resultados ya estan destacados
                  </p>
                )}
                {hasSearched && filteredResults.length === 0 && searchResults.length === 0 && !isSearching && (
                  <p className="text-center text-muted-foreground py-4">
                    No se encontraron productos canonicos.
                    <br />
                    <span className="text-xs">Solo aparecen productos que ya tienen match.</span>
                  </p>
                )}
                <div className="space-y-2">
                  {filteredResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{result.name}</p>
                        {result.category && (
                          <p className="text-sm text-muted-foreground">{result.category}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => createMutation.mutate(result.id)}
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar oferta destacada</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El producto dejara de aparecer en las ofertas destacadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
