# Comandos NPM

## Desarrollo

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Watch mode para scrape-all |
| `npm run dev:api` | Servidor API en modo watch (puerto 3001) |
| `npm run dev:web` | Frontend Vite en modo watch (puerto 5173) |
| `npm run dev:full` | API + Frontend en paralelo |

## Build

| Comando | Descripcion |
|---------|-------------|
| `npm run build:web` | Build de produccion del frontend |

## Scrapers

### Ejecutar todos los scrapers

| Comando | Descripcion |
|---------|-------------|
| `npm run scrape` | Ejecuta todos los scrapers (dry run) |

### Superseis

| Comando | Descripcion |
|---------|-------------|
| `npm run scrape:superseis` | Dry run (todas las categorias) |
| `npm run scrape:superseis:ofertas` | Solo ofertas (dry run) |
| `npm run scrape:superseis:save` | Todas las categorias + guardar en DB |
| `npm run scrape:superseis:ofertas:save` | Solo ofertas + guardar en DB |

**Opciones adicionales:**
```bash
# Categoria especifica
npm run scrape:superseis -- --route=lacteos
npm run scrape:superseis -- --route=bebidas --save
```

### Stock

| Comando | Descripcion |
|---------|-------------|
| `npm run scrape:stock` | Dry run |
| `npm run scrape:stock:save` | Guardar en DB |

### Fortis

| Comando | Descripcion |
|---------|-------------|
| `npm run scrape:fortis` | Dry run |
| `npm run scrape:fortis:save` | Guardar en DB |

### Casa Rica

| Comando | Descripcion |
|---------|-------------|
| `npm run scrape:casarica` | Dry run |
| `npm run scrape:casarica:save` | Guardar en DB |

### Biggie

| Comando | Descripcion |
|---------|-------------|
| `npm run scrape:biggie` | Dry run |
| `npm run scrape:biggie:save` | Guardar en DB |

### Salemma

| Comando | Descripcion |
|---------|-------------|
| `npm run scrape:salemma` | Dry run (todas las categorias) |
| `npm run scrape:salemma:ofertas` | Solo ofertas (dry run) |
| `npm run scrape:salemma:save` | Todas las categorias + guardar en DB |
| `npm run scrape:salemma:ofertas:save` | Solo ofertas + guardar en DB |

## Base de Datos

| Comando | Descripcion |
|---------|-------------|
| `npm run docker:up` | Iniciar PostgreSQL (puerto 5433) |
| `npm run docker:down` | Detener PostgreSQL |
| `npm run db:push` | Push del schema a la base de datos |
| `npm run db:generate` | Generar cliente Prisma |
| `npm run db:studio` | Abrir Prisma Studio (GUI) |

## Matching

| Comando | Descripcion |
|---------|-------------|
| `npm run match:process` | Procesar matching automatico |
| `npm run match:stats` | Mostrar estadisticas de matching |

## Utilidades

| Comando | Descripcion |
|---------|-------------|
| `npm run stats` | Estadisticas de la base de datos |
| `npm run compare` | Comparar precios entre tiendas |
| `npm run compare:lacteos` | Comparar precios de lacteos |
| `npm run compare:bebidas` | Comparar precios de bebidas |
| `npm run compare:v2` | Comparador version 2 |

## Mantenimiento

| Comando | Descripcion |
|---------|-------------|
| `npm run suspicious` | Encontrar matches sospechosos |
| `npm run unmatch` | Deshacer un match |
| `npm run migrate:measurements` | Extraer medidas de productos existentes |
| `npm run mismatches` | Encontrar mismatches por medidas |
| `npm run fix:mismatches` | Corregir mismatches automaticamente |

## Testing

| Comando | Descripcion |
|---------|-------------|
| `npm run test` | Tests en modo watch |
| `npm run test:run` | Tests una sola vez |
| `npm run test:matching` | Tests del sistema de matching |

## Ejemplos de Uso

### Flujo completo de scraping

```bash
# 1. Iniciar base de datos
npm run docker:up

# 2. Ejecutar scrapers (uno por uno)
npm run scrape:superseis:save
npm run scrape:stock:save
npm run scrape:fortis:save

# 3. Procesar matching
npm run match:process

# 4. Ver estadisticas
npm run match:stats
```

### Scraping rapido de ofertas

```bash
# Solo ofertas de todos los supermercados que lo soporten
npm run scrape:superseis:ofertas:save
npm run scrape:salemma:ofertas:save
```

### Debug de matching

```bash
# Ver estadisticas actuales
npm run match:stats

# Encontrar matches problematicos
npm run suspicious

# Deshacer un match especifico
npm run unmatch -- --productId=UUID-DEL-PRODUCTO
```

### Mantenimiento de medidas

```bash
# Migrar productos sin medidas extraidas
npm run migrate:measurements

# Encontrar mismatches por medidas
npm run mismatches

# Corregir automaticamente
npm run fix:mismatches
```
