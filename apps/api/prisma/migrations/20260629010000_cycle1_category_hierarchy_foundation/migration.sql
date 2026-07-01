-- Cycle 1 foundation repair: make category hierarchy the canonical subcategory model.
-- Keeps legacy products.sub_category for backward compatibility while linking every legacy value to a child category.

-- Re-create raw catalog indexes that are not represented in Prisma schema and may have been dropped by generated migrations.
CREATE INDEX IF NOT EXISTS "idx_products_catalog_active_category_price"
  ON "products"("status", "deleted_at", "category_id", "price_amount");

CREATE INDEX IF NOT EXISTS "idx_products_catalog_active_created_at"
  ON "products"("status", "deleted_at", "created_at" DESC, "id");

CREATE INDEX IF NOT EXISTS "idx_categories_catalog_active_deleted_sort"
  ON "categories"("is_active", "deleted_at", "sort_order", "name_ar");

CREATE INDEX IF NOT EXISTS "idx_categories_deleted_active"
  ON "categories"("deleted_at", "is_active");

-- Add a real FK from products to child categories. The existing sub_category string remains as a denormalized display fallback.
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sub_category_id" UUID;

-- Default storefront child categories. Slugs are globally unique and parent-prefixed.
WITH defaults(parent_slug, child_slug, name_ar, name_en, sort_order) AS (
  VALUES
    ('women', 'women-shoes', 'Shoes', 'Shoes', 10),
    ('women', 'women-dresses', 'Dresses', 'Dresses', 20),
    ('women', 'women-t-shirts', 'T-Shirts', 'T-Shirts', 30),
    ('women', 'women-blouses', 'Blouses', 'Blouses', 40),
    ('women', 'women-hoodies', 'Hoodies', 'Hoodies', 50),
    ('women', 'women-jeans', 'Jeans', 'Jeans', 60),
    ('women', 'women-pants', 'Pants', 'Pants', 70),
    ('women', 'women-skirts', 'Skirts', 'Skirts', 80),
    ('women', 'women-bags', 'Bags', 'Bags', 90),
    ('women', 'women-accessories', 'Accessories', 'Accessories', 100),
    ('women', 'women-sandals', 'Sandals', 'Sandals', 110),
    ('women', 'women-sneakers', 'Sneakers', 'Sneakers', 120),
    ('women', 'women-slippers', 'Slippers', 'Slippers', 130),
    ('women', 'women-heels', 'Heels', 'Heels', 140),
    ('women', 'women-sleepwear', 'Sleepwear', 'Sleepwear', 150),
    ('kids', 'kids-shoes', 'Shoes', 'Shoes', 10),
    ('kids', 'kids-dresses', 'Dresses', 'Dresses', 20),
    ('kids', 'kids-t-shirts', 'T-Shirts', 'T-Shirts', 30),
    ('kids', 'kids-sets', 'Sets', 'Sets', 40),
    ('kids', 'kids-hoodies', 'Hoodies', 'Hoodies', 50),
    ('kids', 'kids-pants', 'Pants', 'Pants', 60),
    ('kids', 'kids-shorts', 'Shorts', 'Shorts', 70),
    ('kids', 'kids-sandals', 'Sandals', 'Sandals', 80),
    ('kids', 'kids-sneakers', 'Sneakers', 'Sneakers', 90),
    ('kids', 'kids-slippers', 'Slippers', 'Slippers', 100),
    ('kids', 'kids-accessories', 'Accessories', 'Accessories', 110),
    ('kids', 'kids-baby-clothing', 'Baby Clothing', 'Baby Clothing', 120)
)
INSERT INTO "categories" ("id", "slug", "name_ar", "name_en", "description", "sort_order", "is_active", "parent_id", "created_at", "updated_at", "deleted_at")
SELECT gen_random_uuid(), d.child_slug, d.name_ar, d.name_en, NULL, d.sort_order, true, parent.id, now(), now(), NULL
FROM defaults d
INNER JOIN "categories" parent ON parent.slug = d.parent_slug
ON CONFLICT ("slug") DO UPDATE SET
  "name_ar" = EXCLUDED."name_ar",
  "name_en" = EXCLUDED."name_en",
  "sort_order" = EXCLUDED."sort_order",
  "parent_id" = EXCLUDED."parent_id",
  "is_active" = true,
  "deleted_at" = NULL,
  "updated_at" = now();

-- Create child category rows for legacy product.sub_category values that are not in the default set.
WITH legacy_subcategories AS (
  SELECT DISTINCT
    p."category_id" AS parent_id,
    parent.slug AS parent_slug,
    trim(p."sub_category") AS name_ar,
    trim(p."sub_category") AS name_en,
    COALESCE(
      NULLIF(trim(both '-' FROM regexp_replace(lower(trim(p."sub_category")), '[^a-z0-9]+', '-', 'g')), ''),
      substring(md5(trim(p."sub_category")) from 1 for 8)
    ) AS slug_part
  FROM "products" p
  INNER JOIN "categories" parent ON parent.id = p."category_id"
  WHERE p."category_id" IS NOT NULL
    AND p."sub_category" IS NOT NULL
    AND trim(p."sub_category") <> ''
), deduped_legacy AS (
  SELECT DISTINCT ON (parent_slug || '-' || slug_part)
    parent_id,
    parent_slug,
    name_ar,
    name_en,
    parent_slug || '-' || slug_part AS child_slug
  FROM legacy_subcategories
  ORDER BY parent_slug || '-' || slug_part, lower(name_ar)
), numbered_legacy AS (
  SELECT
    parent_id,
    name_ar,
    name_en,
    child_slug,
    row_number() OVER (PARTITION BY parent_id ORDER BY lower(name_ar)) AS rn
  FROM deduped_legacy
)
INSERT INTO "categories" ("id", "slug", "name_ar", "name_en", "description", "sort_order", "is_active", "parent_id", "created_at", "updated_at", "deleted_at")
SELECT gen_random_uuid(), child_slug, name_ar, name_en, NULL, 1000 + rn, true, parent_id, now(), now(), NULL
FROM numbered_legacy
ON CONFLICT ("slug") DO UPDATE SET
  "name_ar" = EXCLUDED."name_ar",
  "name_en" = EXCLUDED."name_en",
  "parent_id" = EXCLUDED."parent_id",
  "is_active" = true,
  "deleted_at" = NULL,
  "updated_at" = now();

-- Backfill product FK from exact legacy display names under the selected parent category.
UPDATE "products" p
SET "sub_category_id" = child.id,
    "updated_at" = now()
FROM "categories" child
WHERE p."sub_category_id" IS NULL
  AND p."category_id" = child."parent_id"
  AND p."sub_category" IS NOT NULL
  AND lower(trim(p."sub_category")) = lower(trim(child."name_ar"));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_sub_category_id_fkey'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_sub_category_id_fkey"
      FOREIGN KEY ("sub_category_id") REFERENCES "categories"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_products_sub_category_id"
  ON "products"("sub_category_id");

CREATE INDEX IF NOT EXISTS "idx_products_category_sub_category_id"
  ON "products"("category_id", "sub_category_id");
