-- Production readiness fixes for catalog, orders, variants, flash sale visibility and SHEIN workflow.

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
DO $$ BEGIN
  CREATE TYPE "ProductVariantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE "SheinImportStatus" ADD VALUE IF NOT EXISTS 'PREVIEW_READY';
ALTER TYPE "SheinImportStatus" ADD VALUE IF NOT EXISTS 'REVIEWING';
ALTER TYPE "SheinImportStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "SheinImportStatus" ADD VALUE IF NOT EXISTS 'PRODUCT_CREATED';

ALTER TABLE "products"
  ALTER COLUMN "price_amount" TYPE INTEGER USING ROUND("price_amount" * 100)::integer;

ALTER TABLE "product_variants"
  ALTER COLUMN "price_amount" TYPE INTEGER USING CASE WHEN "price_amount" IS NULL THEN NULL ELSE ROUND("price_amount" * 100)::integer END,
  ADD COLUMN IF NOT EXISTS "size" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "color" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "stock_quantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "status" "ProductVariantStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(3);

ALTER TABLE "orders"
  ALTER COLUMN "subtotal_amount" TYPE INTEGER USING ROUND("subtotal_amount" * 100)::integer,
  ALTER COLUMN "discount_amount" TYPE INTEGER USING ROUND("discount_amount" * 100)::integer,
  ALTER COLUMN "total_amount" TYPE INTEGER USING ROUND("total_amount" * 100)::integer;

ALTER TABLE "order_items"
  ALTER COLUMN "unit_price_amount" TYPE INTEGER USING ROUND("unit_price_amount" * 100)::integer,
  ALTER COLUMN "line_total_amount" TYPE INTEGER USING ROUND("line_total_amount" * 100)::integer;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "product_variant_size_snapshot" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "product_variant_color_snapshot" VARCHAR(80);

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_price_amount_non_negative_chk";
ALTER TABLE "products" ADD CONSTRAINT "products_price_amount_non_negative_chk" CHECK ("price_amount" >= 0);

ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_stock_quantity_non_negative_chk";
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_price_amount_non_negative_chk";
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_stock_quantity_non_negative_chk" CHECK ("stock_quantity" >= 0);
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_price_amount_non_negative_chk" CHECK ("price_amount" IS NULL OR "price_amount" >= 0);

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_amounts_non_negative_chk";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_discount_not_greater_than_subtotal_chk";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_total_matches_amounts_chk";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_total_non_negative_chk";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_total_amount_chk";
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_non_negative_chk" CHECK ("subtotal_amount" >= 0 AND "discount_amount" >= 0 AND "total_amount" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_not_greater_than_subtotal_chk" CHECK ("discount_amount" <= "subtotal_amount");
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_matches_amounts_chk" CHECK ("total_amount" = "subtotal_amount" - "discount_amount");

ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_amounts_non_negative_chk";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_line_total_matches_quantity_chk";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_line_total_chk";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_amounts_non_negative_chk" CHECK ("unit_price_amount" >= 0 AND "line_total_amount" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_line_total_matches_quantity_chk" CHECK ("line_total_amount" = "unit_price_amount" * "quantity");

CREATE TABLE IF NOT EXISTS "order_number_counters" (
  "order_date" DATE NOT NULL,
  "next_number" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("order_date")
);

WITH ranked_product_images AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY is_primary DESC, sort_order ASC, created_at ASC, id ASC) AS rn
  FROM product_images
)
UPDATE product_images pi
SET is_primary = (rpi.rn = 1)
FROM ranked_product_images rpi
WHERE pi.id = rpi.id;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_product_images_one_primary_per_product" ON "product_images"("product_id") WHERE "is_primary" = true;
CREATE INDEX IF NOT EXISTS "idx_product_variants_product_status_deleted_sort" ON "product_variants"("product_id", "status", "deleted_at", "sort_order");
CREATE INDEX IF NOT EXISTS "idx_orders_order_number" ON "orders"("order_number");

DELETE FROM flash_sale_products fsp
WHERE NOT EXISTS (
  SELECT 1
  FROM products p
  INNER JOIN categories c ON c.id = p.category_id
  WHERE p.id = fsp.product_id
    AND p.status = 'ACTIVE'::"ProductStatus"
    AND p.deleted_at IS NULL
    AND c.is_active = true
    AND c.deleted_at IS NULL
);

CREATE OR REPLACE FUNCTION rs_assert_flash_sale_product_visible()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.id = NEW.product_id
      AND p.status = 'ACTIVE'::"ProductStatus"
      AND p.deleted_at IS NULL
      AND c.is_active = true
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Flash sale products must be active visible catalog products';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flash_sale_products_visible ON "flash_sale_products";
CREATE TRIGGER trg_flash_sale_products_visible
BEFORE INSERT OR UPDATE ON "flash_sale_products"
FOR EACH ROW EXECUTE FUNCTION rs_assert_flash_sale_product_visible();

ALTER TABLE "shein_imports"
  ADD COLUMN IF NOT EXISTS "preview_payload" JSONB,
  ADD COLUMN IF NOT EXISTS "edited_payload" JSONB,
  ADD COLUMN IF NOT EXISTS "errors" JSONB,
  ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "idx_shein_imports_retry_count" ON "shein_imports"("retry_count");
