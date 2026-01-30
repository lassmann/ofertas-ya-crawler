-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on Product.normalizedName for fast trigram searches
CREATE INDEX IF NOT EXISTS idx_product_name_trgm
  ON "Product" USING GIN ("normalizedName" gin_trgm_ops);

-- Create GIN index on CanonicalProduct.normalizedName for fast trigram searches
CREATE INDEX IF NOT EXISTS idx_canonical_name_trgm
  ON "CanonicalProduct" USING GIN ("normalizedName" gin_trgm_ops);

-- Create GIN index on CanonicalAlias.normalizedName for fast alias lookups
CREATE INDEX IF NOT EXISTS idx_alias_name_trgm
  ON "CanonicalAlias" USING GIN ("normalizedName" gin_trgm_ops);

-- Set default similarity threshold (can be adjusted per-query)
-- Default is 0.3, we use 0.4 for slightly more strict matching
-- This can be changed at runtime with: SET pg_trgm.similarity_threshold = 0.5;
