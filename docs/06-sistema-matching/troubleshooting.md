# Troubleshooting del Sistema de Matching

## Problemas Comunes

### 1. Match incorrecto (falso positivo)

**Sintoma**: Dos productos diferentes estan matcheados al mismo CanonicalProduct

**Ejemplo**:
- "Coca Cola Original 2L" matchea con "Coca Cola Zero 2L"

**Causas posibles**:
- Threshold fuzzy muy bajo
- Medidas no se estan validando
- Alias incorrecto creado previamente

**Solucion**:

```bash
# 1. Encontrar el match incorrecto
npm run suspicious

# 2. Deshacer el match
npm run unmatch -- --productId=UUID

# 3. El producto volvera a aparecer en unmatched
# 4. Matchear manualmente desde el frontend
```

**SQL para investigar**:
```sql
-- Ver matches de un canonico
SELECT
  p.name as product_name,
  s.name as store,
  pm."matchType",
  pm.confidence
FROM "ProductMatch" pm
JOIN "Product" p ON p.id = pm."productId"
JOIN "Store" s ON s.id = p."storeId"
WHERE pm."canonicalProductId" = 'UUID-CANONICO'
ORDER BY s.name;
```

---

### 2. Producto no matchea (falso negativo)

**Sintoma**: Producto deberia matchear pero no lo hace

**Ejemplo**:
- "COCA-COLA ORG. 2L" no matchea con "Coca-Cola Original 2L"

**Causas posibles**:
- Similitud por debajo del threshold (0.85)
- Medidas incompatibles
- Normalizacion diferente

**Diagnostico**:

```sql
-- Ver similitud entre nombres
SELECT
  similarity('coca cola org 2l', 'coca cola original 2l') as sim;
-- Resultado: 0.72 (por debajo de 0.85)

-- Verificar si existe alias
SELECT * FROM "CanonicalAlias"
WHERE "normalizedName" = 'coca cola org 2l';
```

**Solucion**:
1. Matchear manualmente desde el frontend
2. Esto creara un alias automaticamente
3. Futuros productos con ese nombre matchearan

---

### 3. Medidas incompatibles

**Sintoma**: Productos con misma medida no matchean

**Ejemplo**:
- "Leche 1L" no matchea con "Leche 1000ml"

**Diagnostico**:

```sql
-- Ver medidas extraidas
SELECT
  name,
  "normalizedName",
  "baseNormalizedName",
  quantity,
  unit
FROM "Product"
WHERE "normalizedName" LIKE '%leche%';
```

**Posibles problemas**:
- Medida no fue extraida (quantity/unit null)
- Unidad no normalizada correctamente

**Solucion**:

```bash
# Re-procesar extraccion de medidas
npm run migrate:measurements
```

---

### 4. Alias duplicado o incorrecto

**Sintoma**: Producto matchea con canonico incorrecto por alias

**Diagnostico**:

```sql
-- Ver alias de un canonico
SELECT
  ca."normalizedName",
  cp.name as canonical_name
FROM "CanonicalAlias" ca
JOIN "CanonicalProduct" cp ON cp.id = ca."canonicalProductId"
WHERE ca."normalizedName" = 'nombre-normalizado-problematico';
```

**Solucion**:

```sql
-- Eliminar alias incorrecto
DELETE FROM "CanonicalAlias"
WHERE "normalizedName" = 'nombre-normalizado-incorrecto';
```

---

### 5. Performance lenta en matching

**Sintoma**: Job de matching tarda mucho

**Causas posibles**:
- Indice GIN no existe
- Muchos productos sin match
- Threshold muy bajo (muchos resultados)

**Diagnostico**:

```sql
-- Verificar indices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'CanonicalProduct';

-- Ver cantidad sin match
SELECT COUNT(*) FROM "Product" p
LEFT JOIN "ProductMatch" pm ON pm."productId" = p.id
WHERE pm.id IS NULL;
```

**Solucion**:

```sql
-- Crear indice si no existe
CREATE INDEX IF NOT EXISTS idx_canonical_trgm
ON "CanonicalProduct"
USING gin("normalizedName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_canonical_base_trgm
ON "CanonicalProduct"
USING gin("baseNormalizedName" gin_trgm_ops);
```

---

## Scripts de Utilidad

### Encontrar matches sospechosos

```bash
npm run suspicious
```

Busca matches donde:
- Confianza baja (< 0.9)
- Nombres muy diferentes
- Medidas potencialmente incompatibles

### Deshacer match

```bash
npm run unmatch -- --productId=UUID
# o
npm run unmatch -- --canonicalId=UUID  # Deshace todos los matches
```

### Ver estadisticas de matching

```bash
npm run match:stats
```

Muestra:
- Total de productos y matches
- Matches por tipo (BARCODE, ALIAS, FUZZY, MANUAL)
- Porcentaje de matching por tienda
- Canonicos en multiples tiendas

### Encontrar mismatches por medidas

```bash
npm run mismatches
```

Busca productos matcheados donde las medidas son diferentes.

### Corregir mismatches

```bash
npm run fix:mismatches
```

Deshace matches donde las medidas son incompatibles.

---

## Queries Utiles para Debug

### Ver productos de un canonico con sus medidas

```sql
SELECT
  s.name as store,
  p.name,
  p.quantity,
  p.unit,
  pm.confidence,
  pm."matchType"
FROM "ProductMatch" pm
JOIN "Product" p ON p.id = pm."productId"
JOIN "Store" s ON s.id = p."storeId"
WHERE pm."canonicalProductId" = 'UUID'
ORDER BY s.name;
```

### Comparar similitud de nombres

```sql
SELECT
  p1.name as name1,
  p2.name as name2,
  similarity(p1."normalizedName", p2."normalizedName") as sim
FROM "Product" p1
CROSS JOIN "Product" p2
WHERE p1.id = 'UUID1' AND p2.id = 'UUID2';
```

### Ver aliases de un canonico

```sql
SELECT ca."normalizedName"
FROM "CanonicalAlias" ca
WHERE ca."canonicalProductId" = 'UUID'
ORDER BY ca."createdAt";
```

### Productos sin match por tienda

```sql
SELECT
  s.name,
  COUNT(*) as unmatched
FROM "Product" p
JOIN "Store" s ON s.id = p."storeId"
LEFT JOIN "ProductMatch" pm ON pm."productId" = p.id
WHERE pm.id IS NULL
GROUP BY s.name
ORDER BY unmatched DESC;
```

---

## Prevencion

1. **Revisar matches de baja confianza** regularmente
2. **Verificar manualmente** productos de categorias criticas
3. **Monitorear** productos nuevos sin match despues de cada scraping
4. **Crear aliases** para variaciones conocidas de nombres
