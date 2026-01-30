# Scraper: Casa Rica

## Informacion General

| Campo | Valor |
|-------|-------|
| **Nombre** | Casa Rica |
| **Slug** | `casarica` |
| **URL Base** | https://www.casarica.com.py |
| **Estado** | Activo |

## Comandos

```bash
# Dry run
npm run scrape:casarica

# Guardar en base de datos
npm run scrape:casarica:save
```

## Categorias Soportadas

| RouteKey | Path | Categoria |
|----------|------|-----------|
| `lacteos` | /categoria/lacteos | lacteos |
| `bebidas` | /categoria/bebidas | bebidas |
| ... | ... | ... |

## Selectores CSS

Los selectores especificos estan definidos en `src/scrapers/config/casarica.ts`.

## Notas Especiales

- Casa Rica proporciona `externalId` (ID interno de producto)
- Algunos productos incluyen `barcode` en los datos
- Estos campos adicionales mejoran la precision del matching
