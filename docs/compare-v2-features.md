# Price Comparator V2 - New Features

## Summary

Two new features were added to the `npm run compare:v2` command:

1. **Group by category** (`--by-category`)
2. **Product URL display**

---

## Usage

```bash
# Show price differences (original behavior)
npm run compare:v2 -- --differences

# Show differences grouped by category (NEW)
npm run compare:v2 -- --differences --by-category

# Limit results per category
npm run compare:v2 -- --differences --by-category --top=10
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     compare-v2.ts (CLI)                         │
│                                                                 │
│  Arguments:                                                     │
│  --differences    → Enable price differences mode               │
│  --by-category    → Group results by category                   │
│  --top=N          → Limit results (default: 20)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      compare.ts (Lib)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Main functions:                                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ getTopPriceDifferences(limit)                             │  │
│  │ → Returns: ProductComparison[]                            │  │
│  │ → Usage: --differences (ungrouped)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ getTopPriceDifferencesByCategory(limitPerCategory)   NEW  │  │
│  │ → Returns: Map<string, ProductComparison[]>               │  │
│  │ → Usage: --differences --by-category                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Without `--by-category` (original)

```
┌──────────────┐    ┌─────────────────────────┐    ┌──────────────────┐
│   Database   │───▶│ getTopPriceDifferences  │───▶│ ProductComparison│
│              │    │ (searches ALL           │    │[] sorted by      │
│ - Products   │    │  categories)            │    │ % difference     │
│ - Prices     │    └─────────────────────────┘    └──────────────────┘
│ - Matches    │
└──────────────┘
```

### With `--by-category` (new)

```
┌──────────────┐    ┌────────────────────────────────┐    ┌─────────────────────────┐
│   Database   │───▶│ getTopPriceDifferencesByCategory│───▶│ Map<Category, Products> │
│              │    │                                │    │                         │
│ - Products   │    │ 1. Get unique categories       │    │ ALMACEN: [...]          │
│ - Prices     │    │ 2. For each category:          │    │ BEBIDAS: [...]          │
│ - Matches    │    │    - Find canonicals           │    │ LACTEOS: [...]          │
│              │    │    - Compare prices            │    │ ...                     │
│              │    │    - Sort by %                 │    │                         │
└──────────────┘    └────────────────────────────────┘    └─────────────────────────┘
```

---

## Data Model

### StorePrice (updated)

```typescript
interface StorePrice {
  storeName: string
  storeId: string
  productId: string
  productName: string
  price: number
  oldPrice: number | null
  hasDiscount: boolean
  discountPercent: number | null
  lastUpdated: Date
  sourceUrl: string | null  // ← NEW: Product URL in the store
}
```

---

## Output Example

### With `--by-category`

```
╭─────────────────────────────────────╮
│  TOP PRICE DIFFERENCES BY CATEGORY  │
╰─────────────────────────────────────╯

════════════════════════════════════════════════════════════════════════════════
📦 ALMACEN (3 products)
════════════════════════════════════════════════════════════════════════════════
1. Arroz tipo 3 selecta 1kg
   Stores: 2
   💚 Casa Rica: ₲ 6.200
      🔗 https://www.casarica.com.py/arroz-selecta-tipo-3-x-1k-p38004
   💸 Fortis: ₲ 8.850
      🔗 https://www.fortis.com.py/producto/arroz-tipo-3-selecta-1kg-7840078001089
   📉 Difference: ₲ 2.650 (43%)
────────────────────────────────────────────────────────────────────────────────

════════════════════════════════════════════════════════════════════════════════
📦 BEBIDAS-SIN-ALCOHOL (3 products)
════════════════════════════════════════════════════════════════════════════════
1. Gaseosa Coca Cola 2L
   Stores: 3
   💚 Fortis: ₲ 14.900
      🔗 https://fortis.com.py/producto/123
      Casa Rica: ₲ 15.200
      🔗 https://casarica.com.py/p/456
   💸 Biggie: ₲ 16.500
      🔗 https://biggie.com.py/item/789
   📉 Difference: ₲ 1.600 (11%)
────────────────────────────────────────────────────────────────────────────────
```

---

## Modified Files

| File | Changes |
|------|---------|
| `src/lib/compare.ts` | Added `getTopPriceDifferencesByCategory()` function, `sourceUrl` field in `StorePrice` |
| `src/scripts/compare-v2.ts` | Support for `--by-category`, display URLs in output |

---

## SQL Queries - getTopPriceDifferencesByCategory

```sql
-- 1. Get unique categories from matched products
SELECT DISTINCT p.category
FROM "Product" p
JOIN "ProductMatch" pm ON pm."productId" = p.id
WHERE p.category IS NOT NULL
ORDER BY p.category

-- 2. For each category, get canonicals with multiple stores
SELECT DISTINCT cp.id, cp.name
FROM "CanonicalProduct" cp
JOIN "ProductMatch" pm ON pm."canonicalProductId" = cp.id
JOIN "Product" p ON p.id = pm."productId"
WHERE p.category = $category
GROUP BY cp.id, cp.name
HAVING COUNT(DISTINCT p."storeId") >= 2
LIMIT 50
```
