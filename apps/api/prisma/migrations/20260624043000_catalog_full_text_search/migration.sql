-- Phase 6.6 catalog full text search indexes.
-- Uses the simple configuration so Arabic and English tokens are both indexed without stemming assumptions.

CREATE OR REPLACE FUNCTION rs_catalog_product_search_vector(
  name_ar TEXT,
  name_en TEXT,
  description TEXT,
  sku TEXT
) RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    setweight(to_tsvector('simple', coalesce(name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(sku, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C');
$$;

CREATE OR REPLACE FUNCTION rs_catalog_category_search_vector(
  name_ar TEXT,
  name_en TEXT,
  description TEXT,
  slug TEXT
) RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    setweight(to_tsvector('simple', coalesce(name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(slug, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C');
$$;

CREATE OR REPLACE FUNCTION rs_catalog_variant_search_vector(
  name_ar TEXT,
  name_en TEXT,
  sku TEXT
) RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    setweight(to_tsvector('simple', coalesce(name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(name_en, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(sku, '')), 'B');
$$;

CREATE INDEX IF NOT EXISTS idx_products_catalog_fts
  ON products USING GIN (rs_catalog_product_search_vector(name_ar, name_en, description, sku));

CREATE INDEX IF NOT EXISTS idx_categories_catalog_fts
  ON categories USING GIN (rs_catalog_category_search_vector(name_ar, name_en, description, slug));

CREATE INDEX IF NOT EXISTS idx_product_variants_catalog_fts
  ON product_variants USING GIN (rs_catalog_variant_search_vector(name_ar, name_en, sku));

CREATE INDEX IF NOT EXISTS idx_products_catalog_active_category_price
  ON products (status, deleted_at, category_id, price_amount);

CREATE INDEX IF NOT EXISTS idx_products_catalog_active_created_at
  ON products (status, deleted_at, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_categories_catalog_active_deleted_sort
  ON categories (is_active, deleted_at, sort_order, name_ar);
