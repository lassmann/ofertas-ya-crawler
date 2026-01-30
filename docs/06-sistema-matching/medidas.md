# Extraccion de Medidas

## El Problema

Los nombres de productos incluyen medidas en formatos variados:

```
"Coca Cola Original 2L"
"Coca Cola Original 2 Litros"
"Coca Cola Original 2000ml"
"Leche La Serenisima 1 Lt"
"Arroz 5 Kg"
"Huevos x12"
"Pack 6 Unidades"
```

Para hacer matching correcto, necesitamos:
1. Extraer cantidad y unidad
2. Normalizar unidades
3. Comparar productos con medidas equivalentes

## Funcion parseProductName

```typescript
interface ParsedProductName {
  baseName: string        // Nombre sin medida: "coca cola original"
  quantity: number | null // Valor numerico: 2
  unit: string | null     // Unidad normalizada: "l"
  originalMatch: string | null // Texto original: "2l"
}

function parseProductName(name: string): ParsedProductName {
  // Normalizar primero
  const normalized = normalizeProductName(name)
  // "Coca Cola Original 2L" → "coca cola original 2l"

  // Patrones de medidas (orden importa)
  const patterns = [
    // Volumen: 2000 ml, 2.5 l, 1 litro
    /(\d+(?:[.,]\d+)?)\s*(ml|l|lt|lts|litro|litros)\b/gi,

    // Peso: 500 g, 1 kg, 1.5kg
    /(\d+(?:[.,]\d+)?)\s*(g|gr|kg|kgs|gramo|gramos|kilo|kilos)\b/gi,

    // Unidades: 6 unidades, 12 un, x6
    /(?:x|pack\s*)?(\d+)\s*(un|und|unid|unidad|unidades)\b/gi,

    // Formato "x6" sin unidad
    /\bx(\d+)\b/gi,

    // Centimetros cubicos: 500cc
    /(\d+(?:[.,]\d+)?)\s*(cc)\b/gi,
  ]

  // ... extraer y normalizar
}
```

## Normalizacion de Unidades

| Input | Output |
|-------|--------|
| l, lt, lts, litro, litros | `l` |
| ml, cc | `ml` |
| kg, kgs, kilo, kilos | `kg` |
| g, gr, gramo, gramos | `g` |
| un, und, unid, unidad, unidades | `un` |

## Ejemplos de Parsing

| Nombre Original | baseName | quantity | unit |
|-----------------|----------|----------|------|
| Coca Cola Original 2L | coca cola original | 2 | l |
| Coca Cola 2000ml | coca cola | 2000 | ml |
| Leche 1 Litro | leche | 1 | l |
| Arroz 5 Kg | arroz | 5 | kg |
| Azucar 1kg | azucar | 1 | kg |
| Huevos x12 | huevos | 12 | un |
| Pack 6 Unidades | pack | 6 | un |
| Pan Frances | pan frances | null | null |

## Validacion de Compatibilidad

```typescript
function areMeasurementsCompatible(
  qty1: number | null,
  unit1: string | null,
  qty2: number | null,
  unit2: string | null
): boolean {
  // Caso 1: Ambos sin medida → compatibles
  if (qty1 === null && qty2 === null) return true

  // Caso 2: Uno con medida, otro sin → NO compatibles
  if ((qty1 === null) !== (qty2 === null)) return false

  // Caso 3: Ambos con medidas → normalizar y comparar

  // Convertir litros a ml
  if (unit1 === 'l') { qty1 *= 1000; unit1 = 'ml' }
  if (unit2 === 'l') { qty2 *= 1000; unit2 = 'ml' }

  // Convertir kg a g
  if (unit1 === 'kg') { qty1 *= 1000; unit1 = 'g' }
  if (unit2 === 'kg') { qty2 *= 1000; unit2 = 'g' }

  // Unidades deben ser iguales
  if (unit1 !== unit2) return false

  // Cantidades iguales (tolerancia 1%)
  const tolerance = Math.max(qty1, qty2) * 0.01
  return Math.abs(qty1 - qty2) <= tolerance
}
```

## Ejemplos de Compatibilidad

| Product | Canonical | Compatible? | Razon |
|---------|-----------|-------------|-------|
| 2l | 2l | Si | Iguales |
| 2l | 2000ml | Si | 2l = 2000ml |
| 500g | 0.5kg | Si | 500g = 0.5kg |
| 2l | 1.5l | **No** | Cantidades diferentes |
| 2l | null | **No** | Uno tiene medida, otro no |
| null | null | Si | Ambos sin medida |
| 12un | 12un | Si | Iguales |
| 6un | 12un | **No** | Cantidades diferentes |

## Uso en el Matching

```typescript
// En matchByFuzzy()

const baseResults = await db.$queryRaw`
  SELECT cp.*, similarity(...) as similarity
  FROM "CanonicalProduct" cp
  WHERE cp."baseNormalizedName" % ${product.baseNormalizedName}
  ORDER BY similarity DESC
  LIMIT 10
`

// Filtrar por medidas compatibles
for (const match of baseResults) {
  if (areMeasurementsCompatible(
    product.quantity, product.unit,
    match.quantity, match.unit
  )) {
    // Match valido
    return { canonical: match, confidence: match.similarity }
  }
}
```

## Migracion de Datos Existentes

Script para extraer medidas de productos existentes:

```typescript
// npm run migrate:measurements

const products = await db.product.findMany({
  where: { baseNormalizedName: null }
})

for (const product of products) {
  const parsed = parseProductName(product.name)

  await db.product.update({
    where: { id: product.id },
    data: {
      baseNormalizedName: parsed.baseName,
      quantity: parsed.quantity,
      unit: parsed.unit,
    }
  })
}
```

## Troubleshooting

### Medida no detectada

**Problema**: "Aceite 900cc" no extrae medida

**Solucion**: Agregar patron para "cc":
```typescript
/(\d+(?:[.,]\d+)?)\s*(cc)\b/gi
```

### Match incorrecto por medidas

**Problema**: "Coca Cola 2L" matchea con "Coca Cola 1.5L"

**Solucion**: Verificar que `areMeasurementsCompatible` esta siendo llamado y retorna false para medidas diferentes.

### Nombre base incorrecto

**Problema**: "Pack 6 Coca Cola" extrae baseName "pack coca cola"

**Solucion**: Revisar orden de patrones. Patrones mas especificos primero.
