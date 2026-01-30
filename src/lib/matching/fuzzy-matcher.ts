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
  const patterns = [
    // 2000 ml, 2000ml, 2.5 l, 2,5l
    /(\d+(?:[.,]\d+)?)\s*(ml|l|lt|lts|litro|litros)/i,
    // 500 g, 500gr, 1 kg, 1.5kg
    /(\d+(?:[.,]\d+)?)\s*(g|gr|kg|kgs|gramo|gramos|kilo|kilos)/i,
    // 6 unidades, 12 un
    /(\d+)\s*(un|und|unid|unidad|unidades)/i,
  ]

  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      let quantity = parseFloat(match[1].replace(',', '.'))
      let unit = match[2].toLowerCase()

      // Normalizar unidades
      if (['l', 'lt', 'lts', 'litro', 'litros'].includes(unit)) {
        unit = 'l'
      } else if (['ml'].includes(unit)) {
        unit = 'ml'
      } else if (['kg', 'kgs', 'kilo', 'kilos'].includes(unit)) {
        unit = 'kg'
      } else if (['g', 'gr', 'gramo', 'gramos'].includes(unit)) {
        unit = 'g'
      } else if (['un', 'und', 'unid', 'unidad', 'unidades'].includes(unit)) {
        unit = 'un'
      }

      return { quantity, unit }
    }
  }

  return { quantity: null, unit: null }
}
