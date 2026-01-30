# Scraper: Fortis

## Informacion General

| Campo | Valor |
|-------|-------|
| **Nombre** | Fortis |
| **Slug** | `fortis` |
| **URL Base** | https://www.fortis.com.py |
| **Estado** | Activo |

## Comandos

```bash
# Dry run
npm run scrape:fortis

# Guardar en base de datos
npm run scrape:fortis:save
```

## Categorias Soportadas

| RouteKey | Path | Categoria |
|----------|------|-----------|
| `lacteos` | /categoria/lacteos | lacteos |
| `bebidas` | /categoria/bebidas | bebidas |
| ... | ... | ... |

## Selectores CSS

Los selectores especificos estan definidos en `src/scrapers/config/fortis.ts`.

## Notas Especiales

- Fortis puede tener nombres de productos abreviados
- Ejemplo: "COCA-COLA ORG. 2L" en vez de "Coca-Cola Original 2L"
