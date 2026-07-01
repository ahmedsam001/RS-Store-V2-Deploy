CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(100),
    "name_ar" VARCHAR(160) NOT NULL,
    "name_en" VARCHAR(160),
    "price_amount" DECIMAL(12,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_variants_price_amount_non_negative_chk" CHECK ("price_amount" IS NULL OR "price_amount" >= 0)
);

CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE INDEX "idx_product_variants_product_active_sort_order" ON "product_variants"("product_id", "is_active", "sort_order");

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
