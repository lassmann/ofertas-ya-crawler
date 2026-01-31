import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatPrice, formatDate, formatCategory, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  Store,
  Tag,
  Clock,
  X,
  Star,
  Pencil,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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

export function Compare() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [unmatchDialog, setUnmatchDialog] = useState<{
    open: boolean
    productId: string
    productName: string
    storeName: string
  } | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['compare', id],
    queryFn: () => api.getComparison(id!),
    enabled: !!id,
  })

  const unmatchMutation = useMutation({
    mutationFn: (productId: string) => api.deleteMatch(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compare', id] })
      setUnmatchDialog(null)
    },
  })

  const featuredMutation = useMutation({
    mutationFn: async ({ action, featuredId }: { action: 'create' | 'delete'; featuredId?: string }) => {
      if (action === 'create') {
        return api.createFeaturedOffer(id!)
      } else {
        return api.deleteFeaturedOffer(featuredId!)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compare', id] })
    },
  })

  const displayNameMutation = useMutation({
    mutationFn: (displayName: string) => api.updateCanonicalDisplayName(id!, displayName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compare', id] })
      setIsEditingName(false)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pudo cargar la comparacion</p>
        <Link to="/matched">
          <Button variant="link" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a productos
          </Button>
        </Link>
      </div>
    )
  }

  const { canonical, stores, cheapest, mostExpensive, priceDifference, priceDifferencePercent, featuredOffer } = data
  const isFeatured = !!featuredOffer

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/matched">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a productos
        </Button>
      </Link>

      {/* Product Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                placeholder={canonical.name}
                className="max-w-md"
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => displayNameMutation.mutate(displayNameInput)}
                disabled={displayNameMutation.isPending}
              >
                {displayNameMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Guardar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingName(false)}
                disabled={displayNameMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{canonical.displayName || canonical.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isFeatured) {
                    featuredMutation.mutate({ action: 'delete', featuredId: featuredOffer.id })
                  } else {
                    featuredMutation.mutate({ action: 'create' })
                  }
                }}
                disabled={featuredMutation.isPending}
                title={isFeatured ? 'Quitar de destacados' : 'Agregar a destacados'}
              >
                {featuredMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Star className={cn('h-5 w-5', isFeatured && 'fill-yellow-400 text-yellow-400')} />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDisplayNameInput(canonical.displayName || canonical.name)
                  setIsEditingName(true)
                }}
                title="Editar nombre"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canonical.category && (
            <Badge variant="secondary">{formatCategory(canonical.category)}</Badge>
          )}
          {canonical.brand && (
            <Badge variant="outline">{canonical.brand}</Badge>
          )}
          <Badge variant="outline" className="flex items-center gap-1">
            <Store className="h-3 w-3" />
            {stores.length} tiendas
          </Badge>
          {isFeatured && (
            <Badge variant="default" className="bg-yellow-500">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Destacado
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {cheapest && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Precio mas bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-700">
                {formatPrice(cheapest.price)}
              </p>
              <p className="text-sm text-green-600">{cheapest.storeName}</p>
            </CardContent>
          </Card>
        )}

        {mostExpensive && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Precio mas alto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-700">
                {formatPrice(mostExpensive.price)}
              </p>
              <p className="text-sm text-red-600">{mostExpensive.storeName}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Diferencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPrice(priceDifference)}
            </p>
            <p className="text-sm text-muted-foreground">
              {priceDifferencePercent}% de diferencia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comparacion de Precios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tienda</TableHead>
                <TableHead>Nombre del Producto</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead>Ultima actualizacion</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store, index) => {
                const isCheapest = index === 0
                const isMostExpensive = index === stores.length - 1 && stores.length > 1

                return (
                  <TableRow
                    key={store.productId}
                    className={cn(
                      isCheapest && 'bg-green-50',
                      isMostExpensive && 'bg-red-50'
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{store.storeName}</span>
                        {isCheapest && (
                          <Badge variant="success" className="text-xs">
                            Mas barato
                          </Badge>
                        )}
                        {isMostExpensive && (
                          <Badge variant="destructive" className="text-xs">
                            Mas caro
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {store.productName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span
                          className={cn(
                            'font-semibold',
                            isCheapest && 'text-green-700',
                            isMostExpensive && 'text-red-700'
                          )}
                        >
                          {formatPrice(store.price)}
                        </span>
                        {store.oldPrice && store.oldPrice > store.price && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(store.oldPrice)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {store.hasDiscount && store.discountPercent && (
                        <Badge variant="success">-{store.discountPercent}%</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(store.lastUpdated)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {store.sourceUrl && (
                          <a
                            href={store.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setUnmatchDialog({
                              open: true,
                              productId: store.productId,
                              productName: store.productName,
                              storeName: store.storeName,
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Match Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informacion de Match</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {stores.map((store) => (
              <div
                key={store.productId}
                className="flex items-center justify-between py-1 border-b last:border-0"
              >
                <span>{store.storeName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {store.matchType}
                  </Badge>
                  <span className="text-muted-foreground">
                    {Math.round(store.confidence * 100)}% confianza
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unmatch Confirmation Dialog */}
      <AlertDialog
        open={unmatchDialog?.open ?? false}
        onOpenChange={(open) => !open && setUnmatchDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar producto del agrupamiento</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a quitar <strong>{unmatchDialog?.productName}</strong> de{' '}
              <strong>{unmatchDialog?.storeName}</strong> de este agrupamiento.
              El producto aparecera en la lista de "Sin Match".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unmatchMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                unmatchDialog && unmatchMutation.mutate(unmatchDialog.productId)
              }
              disabled={unmatchMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unmatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
