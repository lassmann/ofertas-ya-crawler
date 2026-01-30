# Scraper: Superseis

## Informacion General

| Campo | Valor |
|-------|-------|
| **Nombre** | Superseis |
| **Slug** | `superseis` |
| **URL Base** | https://www.superseis.com.py |
| **Estado** | Activo |

## Comandos

```bash
# Dry run (todas las categorias)
npm run scrape:superseis

# Solo ofertas
npm run scrape:superseis:ofertas

# Guardar en base de datos
npm run scrape:superseis:save

# Ofertas + guardar
npm run scrape:superseis:ofertas:save

# Categoria especifica
npm run scrape:superseis -- --route=lacteos
npm run scrape:superseis -- --route=bebidas --save
```

## Categorias Soportadas

| RouteKey | Path | Categoria |
|----------|------|-----------|
| `lacteos` | /categoria/lacteos | lacteos |
| `bebidas` | /categoria/bebidas | bebidas |
| `carnes` | /categoria/carnes | carnes |
| `fiambres` | /categoria/fiambres | fiambres |
| `panaderia` | /categoria/panaderia | panaderia |
| `limpieza` | /categoria/limpieza | limpieza |
| `ofertas` | /ofertas | ofertas |
| ... | ... | ... |

## Selectores CSS

```typescript
selectors: {
  productContainer: '.product-item',
  name: '.product-title',
  nameAttr: 'title',
  priceNew: '.price-new',
  priceOld: '.price-old',
  discountPercent: '.discount',
  image: '.product-image img',
  url: '.product-link',
  saleType: '.sale-type',
  productId: '[data-product-id]',
  lastPage: '.pagination a:last-child',
}
```

## Formato de Precios

- Input: `"Gs. 15.000"`, `"₲ 15,000"`
- Output: `15000` (integer)

## Paginacion

- Formato: `?page=N`
- Deteccion: Link a ultima pagina en `.pagination a:last-child`

## Notas Especiales

- El nombre del producto a veces esta en el atributo `title` del elemento
- Procesa categorias en batches de 3 con 500ms de delay entre batches
- 300ms de delay entre paginas de la misma categoria

## Ejemplo de Producto Extraido

```json
{
  "name": "COCA COLA ORIGINAL 2LT",
  "price": 15000,
  "oldPrice": 18000,
  "discountPercent": 17,
  "imageUrl": "https://www.superseis.com.py/images/producto.jpg",
  "sourceUrl": "https://www.superseis.com.py/producto/coca-cola",
  "category": "bebidas"
}
```
