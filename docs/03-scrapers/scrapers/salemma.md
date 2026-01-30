# Scraper: Salemma

## Informacion General

| Campo | Valor |
|-------|-------|
| **Nombre** | Salemma |
| **Slug** | `salemma` |
| **URL Base** | https://www.salemma.com.py |
| **Estado** | Activo |

## Comandos

```bash
# Dry run (todas las categorias)
npm run scrape:salemma

# Solo ofertas
npm run scrape:salemma:ofertas

# Guardar en base de datos
npm run scrape:salemma:save

# Ofertas + guardar
npm run scrape:salemma:ofertas:save
```

## Categorias Soportadas

| RouteKey | Path | Categoria |
|----------|------|-----------|
| `lacteos` | /categoria/lacteos | lacteos |
| `bebidas` | /categoria/bebidas | bebidas |
| `ofertas` | /ofertas | ofertas |
| ... | ... | ... |

## Selectores CSS

Los selectores especificos estan definidos en `src/scrapers/config/salemma.ts`.

## Notas Especiales

- Salemma soporta modo `--ofertas` para scrapear solo ofertas
- Similar a Superseis en estructura
