# Queries Comunes

## Estadisticas Generales

### Conteo total por entidad
```sql
SELECT 'Products' as entity, COUNT(*) as count FROM "Product"
UNION ALL
SELECT 'Prices', COUNT(*) FROM "Price"
UNION ALL
SELECT 'CanonicalProducts', COUNT(*) FROM "CanonicalProduct"
UNION ALL
SELECT 'ProductMatches', COUNT(*) FROM "ProductMatch"
UNION ALL
SELECT 'Aliases', COUNT(*) FROM "CanonicalAlias"
UNION ALL
SELECT 'Stores', COUNT(*) FROM "Store";
```

### Productos por tienda
```sql
SELECT
  s.name as store,
  COUNT(p.id) as products,
  s."lastScrapedAt"
FROM "Store" s
LEFT JOIN "Product" p ON p."storeId" = s.id
WHERE s."isActive" = true
GROUP BY s.id
ORDER BY products DESC;
```

### Porcentaje de matching por tienda
```sql
SELECT
  s.name as store,
  COUNT(p.id) as total,
  COUNT(pm.id) as matched,
  COUNT(p.id) - COUNT(pm.id) as unmatched,
  ROUND(COUNT(pm.id)::numeric / NULLIF(COUNT(p.id), 0) * 100, 1) as match_percent
FROM "Product" p
JOIN "Store" s ON s.id = p."storeId"
LEFT JOIN "ProductMatch" pm ON pm."productId" = p.id
GROUP BY s.id
ORDER BY match_percent DESC;
```

---

## Productos Sin Match

### Listar productos sin match
```sql
SELECT
  p.id,
  p.name,
  p."normalizedName",
  p.category,
  s.name as store
FROM "Product" p
JOIN "Store" s ON s.id = p."storeId"
LEFT JOIN "ProductMatch" pm ON pm."productId" = p.id
WHERE pm.id IS NULL
ORDER BY s.name, p.category, p.name
LIMIT 100;
```

### Contar sin match por categoria
```sql
SELECT
  p.category,
  COUNT(*) as unmatched
FROM "Product" p
LEFT JOIN "ProductMatch" pm ON pm."productId" = p.id
WHERE pm.id IS NULL
AND p.category IS NOT NULL
GROUP BY p.category
ORDER BY unmatched DESC;
```

---

## Matching y Comparacion

### Productos canonicos en multiples tiendas
```sql
SELECT
  cp.id,
  cp.name,
  COUNT(DISTINCT p."storeId") as store_count
FROM "CanonicalProduct" cp
JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
JOIN "Product" p ON p.id = pm."productId"
GROUP BY cp.id
HAVING COUNT(DISTINCT p."storeId") >= 2
ORDER BY store_count DESC
LIMIT 50;
```

### Comparar precios de un producto canonico
```sql
SELECT
  cp.name as canonical_name,
  s.name as store,
  p.name as product_name,
  pr.price,
  pr.oldPrice,
  pr."scrapedAt"
FROM "CanonicalProduct" cp
JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
JOIN "Product" p ON p.id = pm."productId"
JOIN "Store" s ON s.id = p."storeId"
JOIN LATERAL (
  SELECT price, "oldPrice", "scrapedAt"
  FROM "Price"
  WHERE "productId" = p.id
  ORDER BY "scrapedAt" DESC
  LIMIT 1
) pr ON true
WHERE cp.id = 'UUID_DEL_CANONICAL'
ORDER BY pr.price ASC;
```

### Productos con mayor diferencia de precio
```sql
WITH product_prices AS (
  SELECT
    cp.id as canonical_id,
    cp.name,
    MIN(pr.price) as min_price,
    MAX(pr.price) as max_price,
    COUNT(DISTINCT p."storeId") as store_count
  FROM "CanonicalProduct" cp
  JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
  JOIN "Product" p ON p.id = pm."productId"
  JOIN LATERAL (
    SELECT price FROM "Price"
    WHERE "productId" = p.id
    ORDER BY "scrapedAt" DESC
    LIMIT 1
  ) pr ON true
  GROUP BY cp.id
  HAVING COUNT(DISTINCT p."storeId") >= 2
)
SELECT
  name,
  min_price,
  max_price,
  max_price - min_price as difference,
  ROUND((max_price - min_price) / min_price * 100, 1) as diff_percent,
  store_count
FROM product_prices
WHERE min_price > 0
ORDER BY diff_percent DESC
LIMIT 20;
```

---

## Historial de Precios

### Historial de un producto
```sql
SELECT
  pr.price,
  pr."oldPrice",
  pr."scrapedAt",
  DATE(pr."scrapedAt") as date
FROM "Price" pr
WHERE pr."productId" = 'UUID_DEL_PRODUCTO'
ORDER BY pr."scrapedAt" DESC
LIMIT 30;
```

### Precio promedio por dia
```sql
SELECT
  DATE(pr."scrapedAt") as date,
  AVG(pr.price) as avg_price,
  MIN(pr.price) as min_price,
  MAX(pr.price) as max_price
FROM "Price" pr
WHERE pr."productId" = 'UUID_DEL_PRODUCTO'
GROUP BY DATE(pr."scrapedAt")
ORDER BY date DESC;
```

---

## Fuzzy Search

### Buscar productos similares
```sql
-- Requiere: CREATE EXTENSION pg_trgm;

-- Configurar threshold
SELECT set_limit(0.3);

-- Buscar por similitud
SELECT
  p.name,
  p."normalizedName",
  s.name as store,
  similarity(p."normalizedName", 'coca cola') as sim
FROM "Product" p
JOIN "Store" s ON s.id = p."storeId"
WHERE p."normalizedName" % 'coca cola'
ORDER BY sim DESC
LIMIT 20;
```

### Buscar canonicos similares
```sql
SELECT
  cp.name,
  cp."normalizedName",
  similarity(cp."normalizedName", 'coca cola original') as sim
FROM "CanonicalProduct" cp
WHERE cp."normalizedName" % 'coca cola original'
ORDER BY sim DESC
LIMIT 10;
```

---

## Mantenimiento

### Productos duplicados (mismo nombre, misma tienda)
```sql
SELECT
  p."storeId",
  p."normalizedName",
  COUNT(*) as duplicates
FROM "Product" p
GROUP BY p."storeId", p."normalizedName"
HAVING COUNT(*) > 1;
```

### Canonicos sin matches
```sql
SELECT cp.*
FROM "CanonicalProduct" cp
LEFT JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
WHERE pm.id IS NULL;
```

### Aliases huerfanos
```sql
SELECT ca.*
FROM "CanonicalAlias" ca
LEFT JOIN "CanonicalProduct" cp ON cp.id = ca."canonicalProductId"
WHERE cp.id IS NULL;
```

### Limpiar precios antiguos (mas de 30 dias)
```sql
-- Solo ejecutar si necesitas liberar espacio
DELETE FROM "Price"
WHERE "scrapedAt" < NOW() - INTERVAL '30 days'
AND id NOT IN (
  -- Mantener el precio mas reciente de cada producto
  SELECT DISTINCT ON ("productId") id
  FROM "Price"
  ORDER BY "productId", "scrapedAt" DESC
);
```
