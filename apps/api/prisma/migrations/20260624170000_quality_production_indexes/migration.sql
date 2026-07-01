-- Quality-only production indexes for admin dashboards and operational read paths.
-- No business behavior change.

CREATE INDEX IF NOT EXISTS "idx_categories_deleted_active" ON "categories"("deleted_at", "is_active");
CREATE INDEX IF NOT EXISTS "idx_products_deleted_status" ON "products"("deleted_at", "status");
CREATE INDEX IF NOT EXISTS "idx_product_variants_low_stock" ON "product_variants"("deleted_at", "is_active", "stock_quantity", "updated_at");
CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders"("created_at", "id");
CREATE INDEX IF NOT EXISTS "idx_shein_imports_created_at" ON "shein_imports"("created_at", "id");
