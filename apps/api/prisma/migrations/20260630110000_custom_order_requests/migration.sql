CREATE TYPE "CustomOrderStatus" AS ENUM ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED');

CREATE TABLE "custom_order_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "product_url" TEXT NOT NULL,
  "requested_color" VARCHAR(80),
  "requested_size" VARCHAR(80),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "customer_note" TEXT,
  "customer_image_url" TEXT,
  "customer_image_public_id" TEXT,
  "status" "CustomOrderStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "admin_title" VARCHAR(220),
  "admin_image_url" TEXT,
  "admin_image_public_id" TEXT,
  "admin_price_amount" INTEGER,
  "admin_shipping_amount" INTEGER,
  "admin_total_amount" INTEGER,
  "admin_note" TEXT,
  "reviewed_by_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "converted_order_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_order_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_order_requests_customer_image_public_id_key" ON "custom_order_requests"("customer_image_public_id");
CREATE UNIQUE INDEX "custom_order_requests_admin_image_public_id_key" ON "custom_order_requests"("admin_image_public_id");
CREATE INDEX "idx_custom_order_requests_user_created" ON "custom_order_requests"("user_id", "created_at");
CREATE INDEX "idx_custom_order_requests_status_created" ON "custom_order_requests"("status", "created_at");
CREATE INDEX "idx_custom_order_requests_reviewed_by" ON "custom_order_requests"("reviewed_by_id");
CREATE INDEX "idx_custom_order_requests_converted_order" ON "custom_order_requests"("converted_order_id");

ALTER TABLE "custom_order_requests"
  ADD CONSTRAINT "custom_order_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "custom_order_requests"
  ADD CONSTRAINT "custom_order_requests_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "custom_order_requests"
  ADD CONSTRAINT "custom_order_requests_converted_order_id_fkey"
  FOREIGN KEY ("converted_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

