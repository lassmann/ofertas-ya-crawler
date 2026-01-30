# Scraper: Biggie

## Informacion General

| Campo | Valor |
|-------|-------|
| **Nombre** | Biggie |
| **Slug** | `biggie` |
| **URL Base** | https://www.biggie.com.py |
| **Estado** | Activo |

## Comandos

```bash
# Dry run
npm run scrape:biggie

# Guardar en base de datos
npm run scrape:biggie:save
```

## Categorias Soportadas

| RouteKey | Path | Categoria |
|----------|------|-----------|
| `lacteos` | /categoria/lacteos | lacteos |
| `bebidas` | /categoria/bebidas | bebidas |
| ... | ... | ... |

## Selectores CSS

Los selectores especificos estan definidos en `src/scrapers/config/biggie.ts`.

## Notas Especiales

- Biggie es un supermercado mayorista
- Los precios pueden ser por unidad o por pack
- Prestar atencion al campo `unit` para interpretar correctamente
