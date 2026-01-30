# Fuzzy Matching con pg_trgm

## Que es pg_trgm?

`pg_trgm` es una extension de PostgreSQL que proporciona funciones para determinar la similitud de strings basado en trigramas.

Un **trigrama** es un grupo de 3 caracteres consecutivos:
```
"coca" → {"  c", " co", "coc", "oca", "ca "}
```

La **similitud** se calcula comparando los trigramas de dos strings.

## Instalacion

```sql
-- Habilitar extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

El job de matching lo hace automaticamente:
```typescript
await db.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm`
```

## Funciones Principales

### similarity(text, text)

Retorna un numero entre 0 y 1 indicando que tan similares son dos strings.

```sql
SELECT similarity('coca cola', 'coca-cola');
-- 0.714286

SELECT similarity('coca cola original', 'coca cola org');
-- 0.75

SELECT similarity('coca cola', 'pepsi');
-- 0.1
```

### Operador % (similitud)

Retorna true si la similitud esta por encima del threshold (default 0.3).

```sql
SELECT 'coca cola' % 'coca-cola';
-- true

SELECT 'coca cola' % 'pepsi';
-- false
```

### set_limit(real)

Configura el threshold para el operador %.

```sql
SELECT set_limit(0.5);  -- Mas estricto
SELECT set_limit(0.2);  -- Mas permisivo
```

## Indices GIN

Para busquedas rapidas, se usa un indice GIN:

```sql
CREATE INDEX idx_canonical_trgm
ON "CanonicalProduct"
USING gin("normalizedName" gin_trgm_ops);

CREATE INDEX idx_canonical_base_trgm
ON "CanonicalProduct"
USING gin("baseNormalizedName" gin_trgm_ops);
```

## Uso en el Proyecto

### Busqueda de productos canonicos

```typescript
async function findBestCanonicalMatch(
  normalizedName: string,
  threshold: number = 0.4
): Promise<CanonicalMatch | null> {
  // Configurar threshold
  await db.$executeRaw`SELECT set_limit(${threshold})`

  // Buscar con similitud
  const results = await db.$queryRaw`
    SELECT
      cp.id as "canonicalId",
      cp.name as "canonicalName",
      cp."normalizedName",
      similarity(cp."normalizedName", ${normalizedName}) as similarity
    FROM "CanonicalProduct" cp
    WHERE cp."normalizedName" % ${normalizedName}
    ORDER BY similarity DESC
    LIMIT 1
  `

  return results[0] ?? null
}
```

### Busqueda en API

```typescript
// GET /api/matches/canonical/search?q=coca+cola

const results = await db.$queryRaw`
  SELECT
    cp.id,
    cp.name,
    cp."normalizedName",
    similarity(cp."normalizedName", ${normalizedQuery}) as similarity
  FROM "CanonicalProduct" cp
  WHERE cp."normalizedName" % ${normalizedQuery}
     OR cp.name ILIKE ${'%' + query + '%'}
  ORDER BY similarity DESC
  LIMIT ${limit}
`
```

## Estrategia de Matching Mejorada

### Problema con medidas

```
"coca cola original 2l"   similarity con
"coca cola original 2000ml" = 0.78  (bajo por "2l" vs "2000ml")
```

### Solucion: baseNormalizedName

1. Extraer medida del nombre
2. Guardar nombre base sin medida
3. Buscar por nombre base
4. Validar medidas por separado

```sql
-- Buscar por base name
SELECT
  cp.id,
  similarity(cp."baseNormalizedName", 'coca cola original') as similarity,
  cp.quantity,
  cp.unit
FROM "CanonicalProduct" cp
WHERE cp."baseNormalizedName" % 'coca cola original'
ORDER BY similarity DESC;

-- Resultado:
-- id | similarity | quantity | unit
-- 1  | 0.95      | 2        | l
-- 2  | 0.90      | 1.5      | l
-- 3  | 0.85      | 500      | ml
```

Luego filtrar por `quantity` y `unit` compatibles.

## Thresholds Usados

| Contexto | Threshold | Razon |
|----------|-----------|-------|
| Matching automatico | 0.85 | Alta precision, evitar falsos positivos |
| Busqueda en API | 0.2 | Mas resultados para elegir manualmente |
| Base name matching | 0.7 | Mas tolerante porque se validan medidas aparte |

## Ejemplos de Similitud

| String A | String B | Similarity |
|----------|----------|------------|
| coca cola original | coca cola original | 1.0 |
| coca cola original | coca cola org | 0.75 |
| coca cola original | coca-cola original | 0.82 |
| coca cola original | pepsi original | 0.35 |
| coca cola original | fanta naranja | 0.12 |

## Limitaciones

1. **No entiende semantica**: "Coca Cola" y "Coke" tienen baja similitud
2. **Sensible a longitud**: Strings muy diferentes en longitud tienen baja similitud
3. **Numeros**: "2L" vs "2000ml" reduce la similitud significativamente

Por eso se complementa con:
- Aliases para nombres conocidos
- baseNormalizedName para ignorar medidas
- Validacion explicita de medidas
