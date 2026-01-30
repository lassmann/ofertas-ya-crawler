import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Link2,
  Store,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react'

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se pudieron cargar las estadisticas</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen del estado de productos y matching
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.overview.totalProducts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              En {stats.overview.totalStores} tiendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productos Matched
            </CardTitle>
            <Link2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.overview.matchedProducts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.matchPercentage}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sin Match
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.overview.unmatchedProducts.toLocaleString()}
            </div>
            <Link
              to="/unmatched"
              className="text-xs text-primary hover:underline"
            >
              Ver productos sin match
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productos Canonicos
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.overview.totalCanonicals.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.totalCategories} categorias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/unmatched">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Productos Sin Match</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.overview.unmatchedProducts.toLocaleString()} productos sin match
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/matched">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Link2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Comparar Precios</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.overview.totalCanonicals.toLocaleString()} productos para comparar
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Top Price Differences */}
      {stats.topPriceDifferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Mayores Diferencias de Precio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topPriceDifferences.map((item) => (
                <Link
                  key={item.id}
                  to={`/compare/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-green-600">
                        {formatPrice(item.minPrice)} ({item.cheapestStore})
                      </span>
                      <span>-</span>
                      <span className="text-red-600">
                        {formatPrice(item.maxPrice)} ({item.mostExpensiveStore})
                      </span>
                    </div>
                  </div>
                  <Badge variant={item.priceDifferencePercent > 30 ? 'destructive' : 'secondary'}>
                    +{item.priceDifferencePercent}%
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products per Store */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Productos por Tienda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.productsPerStore.map((store) => {
              const percentage = Math.round(
                (store.count / stats.overview.totalProducts) * 100
              )
              return (
                <div key={store.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{store.name}</span>
                    <span className="text-muted-foreground">
                      {store.count.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
