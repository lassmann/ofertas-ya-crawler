# Schema de Base de Datos

## Modelos Principales

### Store (Supermercado)

Representa una tienda/supermercado.

```prisma
model Store {
  id            String    @id @default(uuid())
  name          String    @unique   // "Superseis"
  slug          String    @unique   // "superseis"
  type          StoreType           // SUPERMERCADO
  logoUrl       String?
  websiteUrl    String?
  promotionsUrl String?
  isActive      Boolean   @default(true)
  lastScrapedAt DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum StoreType {
  SUPERMERCADO
  FARMACIA
  RESTAURANTE
  ELECTRONICA
  OTRO
}
```

**Campos clave:**
- `slug`: Identificador URL-friendly usado en scrapers
- `lastScrapedAt`: Timestamp del ultimo scraping exitoso
- `isActive`: Para deshabilitar tiendas sin borrar datos

---

### Product (Producto por Tienda)

Un producto en una tienda especifica. El mismo producto fisico puede tener diferentes `Product` en diferentes tiendas.

```prisma
model Product {
  id                 String   @id @default(uuid())
  name               String                        // "Coca-Cola Original 2L"
  normalizedName     String                        // "coca cola original 2l"
  baseNormalizedName String?                       // "coca cola original"
  brand              String?
  category           String?                       // "bebidas"
  subcategory        String?
  unit               String?                       // "ml", "l", "g", "kg", "un"
  quantity           Float?                        // 2000 (para 2L)
  barcode            String?                       // EAN/UPC
  externalId         String?                       // ID interno de la tienda
  imageUrl           String?
  isHidden           Boolean  @default(false)      // Ocultar productos problematicos
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  store   Store  @relation(fields: [storeId], references: [id])
  storeId String

  @@unique([storeId, normalizedName])  // Un producto unico por tienda+nombre
  @@unique([storeId, externalId])      // Un producto unico por tienda+id externo
}
```

**Campos clave:**
- `normalizedName`: Nombre en minusculas, sin acentos ni caracteres especiales. Usado para deduplicacion y matching.
- `baseNormalizedName`: Nombre SIN la cantidad/unidad. Ej: "coca cola original" (sin "2l"). Usado para matching mejorado.
- `quantity` + `unit`: Medida extraida del nombre. Ej: 2 + "l" para "2L"
- `barcode`: Codigo EAN/UPC. No es unique porque el mismo producto puede estar en multiples tiendas.
- `isHidden`: Permite ocultar productos incorrectamente matcheados o problematicos sin eliminarlos.

**Indices:**
- `@@unique([storeId, normalizedName])`: Garantiza un producto unico por nombre normalizado por tienda
- `@@index([normalizedName])`: Busqueda rapida por nombre
- `@@index([baseNormalizedName])`: Busqueda por nombre base
- `@@index([barcode])`: Busqueda por codigo de barras

---

### Price (Historial de Precios)

Registro de precio en un momento dado. Se crea uno nuevo cada vez que se scrapea.

```prisma
model Price {
  id        String   @id @default(uuid())
  price     Decimal  @db.Decimal(10, 2)  // Precio actual
  oldPrice  Decimal? @db.Decimal(10, 2)  // Precio anterior (si hay descuento)
  currency  String   @default("PYG")      // Guaranies
  sourceUrl String?                       // URL donde se encontro
  scrapedAt DateTime @default(now())      // Cuando se scrapeo

  product   Product @relation(fields: [productId], references: [id])
  productId String
  store     Store   @relation(fields: [storeId], references: [id])
  storeId   String
}
```

**Campos clave:**
- `price`: Precio actual en Guaranies (PYG)
- `oldPrice`: Precio anterior si el producto esta en oferta
- `scrapedAt`: Timestamp del scraping, permite ver historial

**Indices:**
- `@@index([productId, scrapedAt])`: Obtener historial de precios de un producto
- `@@index([storeId, scrapedAt])`: Obtener todos los precios de una tienda en un rango

---

### CanonicalProduct (Producto Canonico)

Representa UN producto real unico. Multiples `Product` de diferentes tiendas pueden apuntar al mismo `CanonicalProduct`.

```prisma
model CanonicalProduct {
  id                 String  @id @default(uuid())
  name               String                         // "Coca-Cola Original 2L"
  displayName        String?                        // Nombre para mostrar al usuario (opcional)
  normalizedName     String  @unique                // "coca cola original 2l"
  baseNormalizedName String?                        // "coca cola original"
  brand              String?
  category           String?
  quantity           Float?                         // 2
  unit               String?                        // "l"
  primaryBarcode     String? @unique                // EAN/UPC principal
}
```

**Campos clave:**
- `displayName`: Nombre personalizado para mostrar al usuario final. Si es null, se usa `name`.

**Diferencia con Product:**
- `Product`: Instancia de un producto en UNA tienda
- `CanonicalProduct`: Concepto abstracto del producto "real"

Ejemplo:
- CanonicalProduct: "Coca-Cola Original 2L" (uno solo)
- Product en Superseis: "COCA COLA ORIGINAL 2LT"
- Product en Stock: "Coca Cola Original 2 Litros"
- Product en Fortis: "COCA-COLA ORG. 2L"

Todos apuntan al mismo CanonicalProduct.

---

### ProductMatch (Match entre Product y CanonicalProduct)

Relacion entre un `Product` (de tienda) y un `CanonicalProduct`.

```prisma
model ProductMatch {
  id         String    @id @default(uuid())
  matchType  MatchType                    // BARCODE, ALIAS, FUZZY, MANUAL
  confidence Float                        // 0.0 - 1.0
  isVerified Boolean   @default(false)    // Verificado por humano

  product   Product @relation(fields: [productId], references: [id])
  productId String  @unique               // Un Product solo puede tener UN match

  canonicalProduct   CanonicalProduct @relation(fields: [canonicalProductId], references: [id])
  canonicalProductId String
}

enum MatchType {
  BARCODE  // Match por codigo de barras (100%)
  ALIAS    // Match por nombre conocido (99%)
  FUZZY    // Match por similitud (60-95%)
  MANUAL   // Match verificado manualmente (100%)
}
```

**Campos clave:**
- `matchType`: Como se determino el match
- `confidence`: Nivel de confianza (0.0 a 1.0)
- `isVerified`: True si un humano verifico el match

---

### CanonicalAlias (Alias de Nombres)

Nombres alternativos que mapean a un `CanonicalProduct`. Permite matching rapido sin fuzzy search.

```prisma
model CanonicalAlias {
  id             String @id @default(uuid())
  normalizedName String @unique  // Nombre normalizado de alguna tienda

  canonicalProduct   CanonicalProduct @relation(fields: [canonicalProductId], references: [id])
  canonicalProductId String
}
```

**Uso:**
Cuando se crea un match (fuzzy o manual), se guarda el `normalizedName` del Product como alias. La proxima vez que aparezca ese nombre, se puede matchear instantaneamente sin fuzzy search.

---

### FeaturedOffer (Oferta Destacada)

Productos canonicos destacados que aparecen en la pagina principal.

```prisma
model FeaturedOffer {
  id String @id @default(uuid())

  canonicalProduct   CanonicalProduct @relation(fields: [canonicalProductId], references: [id])
  canonicalProductId String           @unique  // Un producto solo puede destacarse una vez

  displayOrder Int     @default(0)            // Orden de aparicion
  isActive     Boolean @default(true)         // Activar/desactivar sin eliminar

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive, displayOrder])
}
```

**Campos clave:**
- `canonicalProductId`: Relacion unica - cada producto canonico solo puede estar destacado una vez
- `displayOrder`: Permite ordenar las ofertas destacadas en la UI
- `isActive`: Permite desactivar temporalmente sin eliminar el registro

---

### PromotionDuplicate (Duplicados de Promociones)

Detecta y registra posibles promociones duplicadas.

```prisma
model PromotionDuplicate {
  id              String   @id @default(uuid())
  promotionId1    String                        // Primera promocion
  promotionId2    String                        // Segunda promocion
  similarityScore Float                         // Score de similitud (0.0 - 1.0)
  isSamePromotion Boolean?                      // null = sin confirmar
  confirmedBy     String?                       // Usuario que confirmo
  createdAt       DateTime @default(now())

  @@unique([promotionId1, promotionId2])
}
```

**Uso:**
Detectar cuando la misma promocion bancaria aparece en multiples fuentes para evitar duplicados en la UI.

---

## Diagrama de Relaciones

```
Store
  │
  ├──< Product >──┐
  │       │       │
  │       │       ├── ProductMatch ──> CanonicalProduct ──> FeaturedOffer
  │       │                                   │
  │       v                                   │
  └──< Price                                  └──< CanonicalAlias
```

## Indices Importantes

```sql
-- Busqueda rapida por nombre normalizado
CREATE INDEX idx_product_normalized ON "Product"("normalizedName");
CREATE INDEX idx_product_base_normalized ON "Product"("baseNormalizedName");

-- Busqueda por barcode
CREATE INDEX idx_product_barcode ON "Product"("barcode");

-- Historial de precios
CREATE INDEX idx_price_product_date ON "Price"("productId", "scrapedAt");
CREATE INDEX idx_price_store_date ON "Price"("storeId", "scrapedAt");

-- Fuzzy matching (requiere extension pg_trgm)
CREATE INDEX idx_canonical_trgm ON "CanonicalProduct"
  USING gin("normalizedName" gin_trgm_ops);
```
