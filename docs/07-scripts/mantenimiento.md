# Scripts de Mantenimiento

## Ubicacion

Los scripts de mantenimiento estan en `src/scripts/`.

## Scripts Disponibles

### stats.ts

Muestra estadisticas generales de la base de datos.

```bash
npm run stats
```

**Output ejemplo:**
```
DATABASE STATS

Products: 10,000
Prices: 50,000
Stores: 6
CanonicalProducts: 5,000
ProductMatches: 8,500
Aliases: 6,500

Products by store:
  Superseis: 2,500
  Stock: 2,000
  Fortis: 1,800
  Casa Rica: 1,500
  Biggie: 1,200
  Salemma: 1,000
```

---

### compare-prices.ts

Compara precios de productos entre tiendas.

```bash
# Todos los productos
npm run compare

# Por categoria
npm run compare:lacteos
npm run compare:bebidas
```

**Output ejemplo:**
```
PRICE COMPARISON

Coca-Cola Original 2L
  Stock:     ₲14,500 (cheapest)
  Superseis: ₲15,000 (+3.4%)
  Fortis:    ₲16,000 (+10.3%)
  Biggie:    ₲18,000 (+24.1%)
```

---

### find-suspicious-matches.ts

Encuentra matches que podrian ser incorrectos.

```bash
npm run suspicious
```

**Criterios:**
- Confianza < 0.9
- Nombres con baja similitud
- Medidas potencialmente incompatibles

**Output ejemplo:**
```
SUSPICIOUS MATCHES

1. Product: "Coca Cola Zero 2L" (Superseis)
   Canonical: "Coca-Cola Original 2L"
   Confidence: 0.72
   Reason: Low similarity between names

2. Product: "Leche Descremada 1L" (Stock)
   Canonical: "Leche Entera 1L"
   Confidence: 0.85
   Reason: Different product variant
```

---

### unmatch-product.ts

Deshace un match entre un producto y su canonico.

```bash
# Por producto
npm run unmatch -- --productId=UUID

# Todos los matches de un canonico
npm run unmatch -- --canonicalId=UUID
```

**Efectos:**
1. Elimina el ProductMatch
2. El producto vuelve a aparecer en "unmatched"
3. NO elimina el CanonicalAlias (para evitar re-match automatico)

---

### migrate-extract-measurements.ts

Extrae quantity y unit de productos existentes que no los tienen.

```bash
npm run migrate:measurements
```

**Uso:**
- Correr despues de agregar un nuevo scraper
- Correr si se mejora el algoritmo de parsing

---

### find-measurement-mismatches.ts

Encuentra productos matcheados donde las medidas son diferentes.

```bash
npm run mismatches
```

**Output ejemplo:**
```
MEASUREMENT MISMATCHES

1. Canonical: "Coca-Cola Original 2L" (2L)
   - Product: "Coca Cola 1.5L" (Superseis) - 1.5L ❌

2. Canonical: "Leche Entera 1L" (1L)
   - Product: "Leche Entera 500ml" (Stock) - 500ml ❌
```

---

### fix-measurement-mismatches.ts

Deshace automaticamente matches con medidas incompatibles.

```bash
npm run fix:mismatches
```

**Precaucion:** Revisar primero con `npm run mismatches` antes de ejecutar.

---

## Queries SQL Utiles

### Limpiar precios antiguos

```sql
-- Mantener solo ultimos 30 dias de precios
DELETE FROM "Price"
WHERE "scrapedAt" < NOW() - INTERVAL '30 days'
AND id NOT IN (
  SELECT DISTINCT ON ("productId") id
  FROM "Price"
  ORDER BY "productId", "scrapedAt" DESC
);
```

### Encontrar productos duplicados

```sql
SELECT
  s.name as store,
  p."normalizedName",
  COUNT(*) as duplicates
FROM "Product" p
JOIN "Store" s ON s.id = p."storeId"
GROUP BY s.name, p."normalizedName"
HAVING COUNT(*) > 1;
```

### Limpiar canonicos huerfanos

```sql
-- Canonicos sin matches
DELETE FROM "CanonicalProduct"
WHERE id NOT IN (
  SELECT DISTINCT "canonicalProductId"
  FROM "ProductMatch"
);
```

### Limpiar aliases huerfanos

```sql
-- Aliases apuntando a canonicos que no existen
DELETE FROM "CanonicalAlias"
WHERE "canonicalProductId" NOT IN (
  SELECT id FROM "CanonicalProduct"
);
```

---

## Automatizacion con PM2

Para ejecutar scrapers automaticamente, se puede usar PM2 con cron:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'scraper-superseis',
      script: 'npm',
      args: 'run scrape:superseis:save',
      cron_restart: '0 */6 * * *', // Cada 6 horas
      autorestart: false,
    },
    {
      name: 'scraper-stock',
      script: 'npm',
      args: 'run scrape:stock:save',
      cron_restart: '0 */6 * * *',
      autorestart: false,
    },
    {
      name: 'matcher',
      script: 'npm',
      args: 'run match:process',
      cron_restart: '30 */6 * * *', // 30 min despues de scrapers
      autorestart: false,
    },
  ],
}
```

```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## Backups

### Backup completo

```bash
pg_dump -h localhost -p 5433 -U postgres ofertas_ya > backup.sql
```

### Restaurar

```bash
psql -h localhost -p 5433 -U postgres ofertas_ya < backup.sql
```

### Backup solo de productos y matches

```bash
pg_dump -h localhost -p 5433 -U postgres \
  -t "Product" -t "CanonicalProduct" -t "ProductMatch" -t "CanonicalAlias" \
  ofertas_ya > backup_matching.sql
```
