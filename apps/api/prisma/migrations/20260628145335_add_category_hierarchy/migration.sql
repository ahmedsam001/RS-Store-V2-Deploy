-- DropForeignKey
ALTER TABLE "checkout_idempotency_keys" DROP CONSTRAINT "checkout_idempotency_keys_order_id_fkey";

-- DropForeignKey
ALTER TABLE "checkout_idempotency_keys" DROP CONSTRAINT "checkout_idempotency_keys_user_id_fkey";

-- DropIndex
DROP INDEX "idx_categories_catalog_active_deleted_sort";

-- DropIndex
DROP INDEX "idx_orders_order_number";

-- DropIndex
DROP INDEX "idx_products_catalog_active_category_price";

-- DropIndex
DROP INDEX "idx_products_catalog_active_created_at";

-- DropIndex
DROP INDEX "idx_shein_imports_retry_count";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "parent_id" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_in_stock" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "idx_categories_parent_id" ON "categories"("parent_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_idempotency_keys" ADD CONSTRAINT "checkout_idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_idempotency_keys" ADD CONSTRAINT "checkout_idempotency_keys_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
