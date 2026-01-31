import { db } from '../db.js'

export interface FuzzyMatchResult {
  productId: string
  productName: string
  normalizedName: string
  storeId: string
  storeName: string
  similarity: number
}

export interface CanonicalMatch {
  canonicalId: string
  canonicalName: string
  normalizedName: string
  similarity: number
}

/**
 * Busca productos similares a un query usando pg_trgm
 */
export async function searchSimilarProducts(
  query: string,
  options: {
    limit?: number
    threshold?: number
    storeId?: string
  } = {}
): Promise<FuzzyMatchResult[]> {
  const { limit = 20, threshold = 0.3, storeId } = options

  // Normalizar el query
  const normalizedQuery = normalizeProductName(query)

  // Set threshold para esta búsqueda
  await db.$executeRaw`SELECT set_limit(${threshold})`

  const storeFilter = storeId ? `AND p."storeId" = '${storeId}'` : ''

  const results = await db.$queryRaw<FuzzyMatchResult[]>`
    SELECT
      p.id as "productId",
      p.name as "productName",
      p."normalizedName",
      p."storeId",
      s.name as "storeName",
      similarity(p."normalizedName", ${normalizedQuery}) as similarity
    FROM "Product" p
    JOIN "Store" s ON s.id = p."storeId"
    WHERE p."normalizedName" % ${normalizedQuery}
    ${storeId ? `AND p."storeId" = ${storeId}` : ''}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `

  // Prisma raw queries con condicionales no funcionan bien, usar SQL alternativo
  if (storeId) {
    return db.$queryRaw<FuzzyMatchResult[]>`
      SELECT
        p.id as "productId",
        p.name as "productName",
        p."normalizedName",
        p."storeId",
        s.name as "storeName",
        similarity(p."normalizedName", ${normalizedQuery}) as similarity
      FROM "Product" p
      JOIN "Store" s ON s.id = p."storeId"
      WHERE p."normalizedName" % ${normalizedQuery}
      AND p."storeId" = ${storeId}::uuid
      ORDER BY similarity DESC
      LIMIT ${limit}
    `
  }

  return results
}

/**
 * Busca el canonical product más similar a un query
 */
export async function findBestCanonicalMatch(
  normalizedName: string,
  threshold: number = 0.4
): Promise<CanonicalMatch | null> {
  await db.$executeRaw`SELECT set_limit(${threshold})`

  const results = await db.$queryRaw<CanonicalMatch[]>`
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

/**
 * Normaliza un nombre de producto para comparación
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    // Remover acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remover caracteres especiales excepto espacios
    .replace(/[^a-z0-9\s]/g, ' ')
    // Normalizar espacios
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrae cantidad y unidad de un nombre de producto
 */
export function extractQuantityUnit(name: string): { quantity: number | null; unit: string | null } {
  const parsed = parseProductName(name)
  return { quantity: parsed.quantity, unit: parsed.unit }
}

export interface ParsedProductName {
  baseName: string        // Name without measurement (e.g., "coca cola original")
  quantity: number | null // Numeric value (e.g., 2)
  unit: string | null     // Normalized unit (e.g., "l")
  originalMatch: string | null // The original measurement text that was removed
}

/**
 * Extrae medidas del nombre ORIGINAL (sin normalizar) para preservar decimales
 */
export function extractMeasurementFromOriginal(name: string): {
  quantity: number | null
  unit: string | null
  matchedText: string | null
} {
  // Patrones para detectar medidas (aplicados al nombre ORIGINAL con puntos/comas)
  const patterns = [
    // Volumen: 2000 ml, 2000ml, 2.5 l, 2,5l, 1 litro, etc.
    /(\d+(?:[.,]\d+)?)\s*(ml|l|lt|lts|litro|litros)\b/gi,
    // Peso: 500 g, 500gr, 1 kg, 1.5kg, etc.
    /(\d+(?:[.,]\d+)?)\s*(g|gr|kg|kgs|gramo|gramos|kilo|kilos)\b/gi,
    // Unidades: 6 unidades, 12 un, x6, x12, pack 6, etc.
    /(?:x|pack\s*)?(\d+)\s*(un|und|unid|unidad|unidades)\b/gi,
    // Formato "x6" o "x12" sin unidad explícita
    /\bx(\d+)\b/gi,
    // Centímetros cúbicos: 500cc, 1000 cc
    /(\d+(?:[.,]\d+)?)\s*(cc)\b/gi,
  ]

  // Patrón especial: "x unidad" o "x un" SIN número = 1 unidad
  // Ejemplo: "Chocolate Nucita crocante x unidad" → quantity: 1
  const singleUnitPattern = /\bx\s*(un|und|unid|unidad)\b/gi
  const singleMatch = name.match(singleUnitPattern)
  if (singleMatch) {
    return { quantity: 1, unit: 'un', matchedText: singleMatch[0] }
  }

  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      const fullMatch = match[0]

      // Extraer número y unidad del match
      const numMatch = fullMatch.match(/(\d+(?:[.,]\d+)?)/)
      const unitMatch = fullMatch.match(/(ml|l|lt|lts|litro|litros|g|gr|kg|kgs|gramo|gramos|kilo|kilos|un|und|unid|unidad|unidades|cc)/i)

      if (numMatch) {
        const quantity = parseFloat(numMatch[1].replace(',', '.'))
        let unit: string | null = null

        if (unitMatch) {
          const rawUnit = unitMatch[1].toLowerCase()

          // Normalizar unidades
          if (['l', 'lt', 'lts', 'litro', 'litros'].includes(rawUnit)) {
            unit = 'l'
          } else if (['ml', 'cc'].includes(rawUnit)) {
            unit = 'ml'
          } else if (['kg', 'kgs', 'kilo', 'kilos'].includes(rawUnit)) {
            unit = 'kg'
          } else if (['g', 'gr', 'gramo', 'gramos'].includes(rawUnit)) {
            unit = 'g'
          } else if (['un', 'und', 'unid', 'unidad', 'unidades'].includes(rawUnit)) {
            unit = 'un'
          }
        } else if (fullMatch.match(/^x\d+$/i)) {
          // Formato "x6" sin unidad = unidades
          unit = 'un'
        }

        return { quantity, unit, matchedText: fullMatch }
      }
    }
  }

  return { quantity: null, unit: null, matchedText: null }
}

/**
 * Parsea un nombre de producto extrayendo el nombre base y la medida
 *
 * IMPORTANTE: Extrae medidas del nombre ORIGINAL (antes de normalizar)
 * para preservar decimales como "1.5 Lt" o "2,5L"
 *
 * Ejemplo:
 *   "Coca Cola Original 2L" → { baseName: "coca cola original", quantity: 2, unit: "l" }
 *   "Jugo 1.5 Lt" → { baseName: "jugo", quantity: 1.5, unit: "l" }
 *   "Gaseosa 2,5L" → { baseName: "gaseosa", quantity: 2.5, unit: "l" }
 */
export function parseProductName(name: string): ParsedProductName {
  // 1. Extraer medidas del nombre ORIGINAL (antes de normalizar)
  const { quantity, unit, matchedText } = extractMeasurementFromOriginal(name)

  // 2. Normalizar el nombre completo
  const normalized = normalizeProductName(name)

  // 3. Calcular baseName removiendo la medida del nombre normalizado
  let baseName = normalized
  if (matchedText) {
    const normalizedMatch = normalizeProductName(matchedText)
    baseName = normalized.replace(normalizedMatch, ' ').replace(/\s+/g, ' ').trim()
  }

  return { baseName, quantity, unit, originalMatch: matchedText }
}
