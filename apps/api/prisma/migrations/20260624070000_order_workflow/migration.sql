CREATE TYPE "OrderPaymentStatus" AS ENUM (
  'DEPOSIT_PENDING',
  'DEPOSIT_SUBMITTED',
  'DEPOSIT_REJECTED',
  'FINAL_PAYMENT_PENDING',
  'FINAL_PAYMENT_SUBMITTED',
  'FINAL_PAYMENT_REJECTED',
  'PAID'
);

CREATE TYPE "PaymentProofType" AS ENUM ('DEPOSIT', 'FINAL_PAYMENT');
CREATE TYPE "PaymentProofStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

ALTER TABLE "orders"
  ADD COLUMN "payment_status" "OrderPaymentStatus" NOT NULL DEFAULT 'DEPOSIT_PENDING',
  ADD COLUMN "customer_name_snapshot" VARCHAR(160),
  ADD COLUMN "customer_phone_snapshot" VARCHAR(32),
  ADD COLUMN "customer_email_snapshot" VARCHAR(320),
  ADD COLUMN "shipping_address_snapshot" TEXT;

UPDATE "orders" o
SET
  "customer_name_snapshot" = u."name",
  "customer_phone_snapshot" = COALESCE(u."phone", ''),
  "customer_email_snapshot" = u."email",
  "shipping_address_snapshot" = COALESCE(u."address", '')
FROM "users" u
WHERE o."user_id" = u."id";

ALTER TABLE "orders"
  ALTER COLUMN "customer_name_snapshot" SET NOT NULL,
  ALTER COLUMN "customer_phone_snapshot" SET NOT NULL,
  ALTER COLUMN "shipping_address_snapshot" SET NOT NULL,
  ADD CONSTRAINT "orders_total_non_negative_chk" CHECK ("subtotal_amount" >= 0 AND "discount_amount" >= 0 AND "total_amount" >= 0),
  ADD CONSTRAINT "orders_total_amount_chk" CHECK ("total_amount" = "subtotal_amount" - "discount_amount");

ALTER TABLE "order_items"
  ALTER COLUMN "product_sku_snapshot" TYPE VARCHAR(100),
  ADD COLUMN "product_variant_id" UUID,
  ADD COLUMN "product_variant_name_snapshot" VARCHAR(160),
  ADD COLUMN "product_variant_sku_snapshot" VARCHAR(100),
  ADD CONSTRAINT "order_items_line_total_chk" CHECK ("line_total_amount" = "unit_price_amount" * "quantity");

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "order_payment_proofs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "type" "PaymentProofType" NOT NULL,
  "status" "PaymentProofStatus" NOT NULL DEFAULT 'SUBMITTED',
  "cloudinary_public_id" TEXT NOT NULL,
  "secure_url" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "byte_size" INTEGER,
  "format" VARCHAR(40),
  "rejection_reason" TEXT,
  "reviewed_by_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_payment_proofs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_payment_proofs_cloudinary_public_id_key" ON "order_payment_proofs"("cloudinary_public_id");
CREATE INDEX "idx_orders_payment_status_created_at" ON "orders"("payment_status", "created_at");
CREATE INDEX "idx_order_items_product_variant_id" ON "order_items"("product_variant_id");
CREATE INDEX "idx_order_payment_proofs_order_type_created" ON "order_payment_proofs"("order_id", "type", "created_at");
CREATE INDEX "idx_order_payment_proofs_status_created" ON "order_payment_proofs"("status", "created_at");
CREATE INDEX "idx_order_payment_proofs_reviewer_reviewed" ON "order_payment_proofs"("reviewed_by_id", "reviewed_at");

ALTER TABLE "order_payment_proofs"
  ADD CONSTRAINT "order_payment_proofs_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_payment_proofs"
  ADD CONSTRAINT "order_payment_proofs_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
