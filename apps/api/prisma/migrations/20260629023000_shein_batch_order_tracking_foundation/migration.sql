-- Cycle Shein Batch 1 Database
-- Adds the database foundation for monthly SHEIN purchase batches and customer-facing shipment tracking.

CREATE TYPE "SheinBatchStatus" AS ENUM (
  'DRAFT',
  'ORDERED_FROM_SHEIN',
  'SHIPPING',
  'CUSTOMS',
  'ARRIVED_STORE',
  'READY_FOR_PICKUP',
  'DELIVERED',
  'CANCELLED'
);

CREATE TABLE "shein_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batch_code" VARCHAR(40) NOT NULL,
  "title" VARCHAR(180),
  "shein_order_reference" VARCHAR(120),
  "status" "SheinBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "exchange_rate_sar_to_egp" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "total_quantity" INTEGER NOT NULL DEFAULT 0,
  "total_sar_amount" INTEGER NOT NULL DEFAULT 0,
  "total_egp_amount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "ordered_at" TIMESTAMPTZ(3),
  "shipped_at" TIMESTAMPTZ(3),
  "customs_at" TIMESTAMPTZ(3),
  "arrived_store_at" TIMESTAMPTZ(3),
  "ready_for_pickup_at" TIMESTAMPTZ(3),
  "delivered_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shein_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_shein_batches_money_non_negative" CHECK (
    "exchange_rate_sar_to_egp" >= 0
    AND "total_quantity" >= 0
    AND "total_sar_amount" >= 0
    AND "total_egp_amount" >= 0
  ),
  CONSTRAINT "chk_shein_batches_terminal_timestamps" CHECK (
    ("status" <> 'DELIVERED' OR "delivered_at" IS NOT NULL)
    AND ("status" <> 'CANCELLED' OR "cancelled_at" IS NOT NULL)
  )
);

CREATE TABLE "shein_batch_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batch_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "order_item_id" UUID NOT NULL,
  "product_id" UUID,
  "product_variant_id" UUID,
  "order_number_snapshot" VARCHAR(40) NOT NULL,
  "customer_name_snapshot" VARCHAR(160) NOT NULL,
  "customer_phone_snapshot" VARCHAR(32) NOT NULL,
  "product_name_snapshot" VARCHAR(220) NOT NULL,
  "product_variant_name_snapshot" VARCHAR(160),
  "quantity" INTEGER NOT NULL,
  "unit_sar_amount" INTEGER NOT NULL DEFAULT 0,
  "total_sar_amount" INTEGER NOT NULL DEFAULT 0,
  "unit_egp_amount" INTEGER NOT NULL DEFAULT 0,
  "total_egp_amount" INTEGER NOT NULL DEFAULT 0,
  "whatsapp_message_template" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shein_batch_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_shein_batch_items_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "chk_shein_batch_items_money_non_negative" CHECK (
    "unit_sar_amount" >= 0
    AND "total_sar_amount" >= 0
    AND "unit_egp_amount" >= 0
    AND "total_egp_amount" >= 0
  ),
  CONSTRAINT "chk_shein_batch_items_sar_total" CHECK ("total_sar_amount" = "unit_sar_amount" * "quantity"),
  CONSTRAINT "chk_shein_batch_items_egp_total" CHECK ("total_egp_amount" = "unit_egp_amount" * "quantity")
);

CREATE TABLE "shein_batch_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batch_id" UUID NOT NULL,
  "from_status" "SheinBatchStatus",
  "to_status" "SheinBatchStatus" NOT NULL,
  "note" TEXT,
  "changed_by_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shein_batch_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shein_batch_number_counters" (
  "batch_month" DATE NOT NULL,
  "next_number" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shein_batch_number_counters_pkey" PRIMARY KEY ("batch_month")
);

CREATE UNIQUE INDEX "shein_batches_batch_code_key" ON "shein_batches"("batch_code");
CREATE INDEX "idx_shein_batches_status_created_at" ON "shein_batches"("status", "created_at");
CREATE INDEX "idx_shein_batches_created_at" ON "shein_batches"("created_at", "id");
CREATE INDEX "idx_shein_batches_ordered_at" ON "shein_batches"("ordered_at");
CREATE INDEX "idx_shein_batches_created_by_created_at" ON "shein_batches"("created_by_id", "created_at");

CREATE UNIQUE INDEX "uq_shein_batch_items_batch_order_item" ON "shein_batch_items"("batch_id", "order_item_id");
CREATE INDEX "idx_shein_batch_items_batch_id" ON "shein_batch_items"("batch_id");
CREATE INDEX "idx_shein_batch_items_order_id" ON "shein_batch_items"("order_id");
CREATE INDEX "idx_shein_batch_items_order_item_id" ON "shein_batch_items"("order_item_id");
CREATE INDEX "idx_shein_batch_items_product_id" ON "shein_batch_items"("product_id");
CREATE INDEX "idx_shein_batch_items_product_variant_id" ON "shein_batch_items"("product_variant_id");
CREATE INDEX "idx_shein_batch_items_customer_phone" ON "shein_batch_items"("customer_phone_snapshot");

CREATE INDEX "idx_shein_batch_status_history_batch_created" ON "shein_batch_status_history"("batch_id", "created_at");
CREATE INDEX "idx_shein_batch_status_history_to_status_created" ON "shein_batch_status_history"("to_status", "created_at");
CREATE INDEX "idx_shein_batch_status_history_changed_by_created" ON "shein_batch_status_history"("changed_by_id", "created_at");

ALTER TABLE "shein_batches"
  ADD CONSTRAINT "shein_batches_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shein_batches"
  ADD CONSTRAINT "shein_batches_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shein_batch_items"
  ADD CONSTRAINT "shein_batch_items_batch_id_fkey"
  FOREIGN KEY ("batch_id") REFERENCES "shein_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shein_batch_items"
  ADD CONSTRAINT "shein_batch_items_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shein_batch_items"
  ADD CONSTRAINT "shein_batch_items_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shein_batch_items"
  ADD CONSTRAINT "shein_batch_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shein_batch_items"
  ADD CONSTRAINT "shein_batch_items_product_variant_id_fkey"
  FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shein_batch_status_history"
  ADD CONSTRAINT "shein_batch_status_history_batch_id_fkey"
  FOREIGN KEY ("batch_id") REFERENCES "shein_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shein_batch_status_history"
  ADD CONSTRAINT "shein_batch_status_history_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
