# Scraper: Stock

## Informacion General

| Campo | Valor |
|-------|-------|
| **Nombre** | Stock |
| **Slug** | `stock` |
| **URL Base** | https://www.stock.com.py |
| **Estado** | Activo |

## Comandos

```bash
# Dry run
npm run scrape:stock

# Guardar en base de datos
npm run scrape:stock:save
```

## Categorias Soportadas

| RouteKey | Path | Categoria |
|----------|------|-----------|
| `lacteos` | /lacteos | lacteos |
| `bebidas` | /bebidas | bebidas |
| `carnes` | /carnes | carnes |
| `limpieza` | /limpieza | limpieza |
| ... | ... | ... |

## Selectores CSS

Los selectores especificos estan definidos en `src/scrapers/config/stock.ts`.

## Notas Especiales

- Stock tiene una estructura de pagina diferente a Superseis
- Algunos productos incluyen barcode/EAN en los datos
- La paginacion puede variar por categoria
