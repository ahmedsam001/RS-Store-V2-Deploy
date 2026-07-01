ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sub_category" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "discount_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3, 2);

CREATE INDEX IF NOT EXISTS "idx_products_category_sub_category"
  ON "products"("category_id", "sub_category");
