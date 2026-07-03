ALTER TABLE "cart_items" ALTER COLUMN "product_id" DROP NOT NULL;

ALTER TABLE "cart_items" ADD COLUMN "custom_order_request_id" UUID;

CREATE UNIQUE INDEX "cart_items_custom_order_request_id_key" ON "cart_items"("custom_order_request_id");

CREATE INDEX "idx_cart_items_custom_order_request_id" ON "cart_items"("custom_order_request_id");

ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_custom_order_request_id_fkey"
  FOREIGN KEY ("custom_order_request_id")
  REFERENCES "custom_order_requests"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
