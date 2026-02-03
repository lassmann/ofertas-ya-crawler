# Scraper: Arete

## Informacion General

| Campo | Valor |
|-------|-------|
| **Nombre** | Arete |
| **Slug** | `arete` |
| **URL Base** | https://www.arete.com.py |
| **Estado** | Activo |

## Comandos

```bash
# Dry run (todas las categorias)
npm run scrape:arete

# Solo ofertas (productos con descuento)
npm run scrape:arete:ofertas

# Guardar en base de datos
npm run scrape:arete:save

# Ofertas + guardar
npm run scrape:arete:ofertas:save

# Categoria especifica
npm run scrape:arete -- --route=lacteos
npm run scrape:arete -- --route=bebidas --save
```

## Categorias Soportadas

| RouteKey | Path | Categoria |
|----------|------|-----------|
| `almacen` | /catalogo/almacen-c273 | almacen |
| `bebidasConAlcohol` | /catalogo/bebidas-con-alcohol-c266 | bebidas_con_alcohol |
| `bebidasSinAlcohol` | /catalogo/bebidas-sin-alcohol-c297 | bebidas_sin_alcohol |
| `carnes` | /catalogo/carnes-y-pescados-c261 | carnes |
| `chocolatesGolosinas` | /catalogo/chocolate-y-golosinas-c398 | golosinas |
| `confiteria` | /catalogo/confiteria-c420 | golosinas |
| `congelados` | /catalogo/congelados-c274 | congelados |
| `cuidadoHogar` | /catalogo/cuidado-del-hogar-c309 | limpieza |
| `cuidadoPersonal` | /catalogo/cuidado-personal-c322 | perfumeria |
| `desayuno` | /catalogo/desayuno-c287 | desayuno |
| `fiambres` | /catalogo/fiambres-c298 | fiambreria |
| `frutasVerduras` | /catalogo/frutas-y-verduras-c367 | frescos |
| `electrodomesticos` | /catalogo/electrodomesticos-c407 | electrodomesticos |
| `lacteos` | /catalogo/lacteos-c364 | lacteos |
| `mascotas` | /catalogo/mascotas-c399 | mascotas |
| `panaderia` | /catalogo/panaderia-c395 | panaderia |
| `pastasFrescas` | /catalogo/pastas-frescas-c385 | pastas |
| `quesos` | /catalogo/quesos-c366 | lacteos |
| `rotiseria` | /catalogo/rotiseria-c464 | fiambreria |
| `tienda` | /catalogo/tienda-c402 | hogar_y_bazar |
| `ferreteriaJardin` | /catalogo/ferreteria-y-jardin-c520 | ferreteria |
| `cotillon` | /catalogo/cotillon-c521 | hogar_y_bazar |

## Selectores CSS

```typescript
selectors: {
  productContainer: 'div.product',
  productLink: 'a.ecommercepro-LoopProduct-link',
  name: 'h2.ecommercepro-loop-product__title',
  image: '.product-list-image img',
  imageAttr: 'src',
  priceContainer: 'span.price',
  offerPrice: 'ins span.amount',      // Precio con descuento
  oldPrice: 'del span.amount',        // Precio anterior
  regularPrice: 'span.amount',        // Precio normal
  isOnSale: 'span.onsale',            // Badge de oferta
  nextPage: 'a.next.page-numbers',    // Paginacion
}
```

## Formato de Precios

- Input: `"₲. 14.950"`, `"₲. 2.500"`
- Output: `14950`, `2500` (integer)

## Paginacion

- Formato: `/catalogo/almacen-c273.2` (punto + numero de pagina)
- Deteccion: Link con clase `a.next.page-numbers`

## Extraccion de Datos Adicionales

- **External ID**: Se extrae del URL del producto (`-p12173` -> `12173`)
- **Barcode**: Se extrae del nombre de la imagen (`/5411188110835.jpg` -> `5411188110835`)

## Notas Especiales

- Los productos en oferta tienen el precio dentro de `<ins>` y el precio anterior en `<del>`
- Los productos sin oferta tienen el precio directamente en `span.amount`
- El flag `--ofertas` filtra solo productos que tienen `oldPrice` (productos con descuento)
- Delay de 400ms entre paginas

## Ejemplo de Producto Extraido

```json
{
  "name": "Coca Cola Original 2L",
  "price": 14950,
  "oldPrice": 16000,
  "imageUrl": "https://www.arete.com.py/wp-content/uploads/5411188110835.jpg",
  "sourceUrl": "https://www.arete.com.py/producto/coca-cola-original-2l-p12173",
  "category": "bebidas_sin_alcohol",
  "externalId": "12173",
  "barcode": "5411188110835"
}
```
