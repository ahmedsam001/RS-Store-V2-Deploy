CREATE TYPE "PaymentMethod" AS ENUM ('INSTAPAY', 'VODAFONE', 'CASH_AT_SHOP');
CREATE TYPE "InventoryStatus" AS ENUM ('NONE', 'RESERVED', 'DEDUCTED', 'RELEASED');
CREATE TYPE "CheckoutIdempotencyStatus" AS ENUM ('STARTED', 'COMPLETED');

ALTER TABLE product_variants
  ADD COLUMN reserved_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN deposit_percent INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN deposit_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN remaining_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN deposit_payment_method "PaymentMethod" NOT NULL DEFAULT 'INSTAPAY',
  ADD COLUMN deposit_payment_fee_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN deposit_paid_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN final_payment_method "PaymentMethod",
  ADD COLUMN final_payment_fee_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN final_amount_due INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN final_paid_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN inventory_status "InventoryStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN deposit_approved_at TIMESTAMPTZ(3),
  ADD COLUMN final_payment_approved_at TIMESTAMPTZ(3);

UPDATE orders
SET deposit_amount = ROUND(total_amount * 0.5)::INTEGER,
    remaining_amount = GREATEST(0, total_amount - ROUND(total_amount * 0.5)::INTEGER),
    final_amount_due = GREATEST(0, total_amount - ROUND(total_amount * 0.5)::INTEGER),
    deposit_paid_amount = CASE WHEN payment_status IN ('DEPOSIT_APPROVED', 'FINAL_PAYMENT_PENDING', 'FINAL_PAYMENT_SUBMITTED', 'PAID') THEN ROUND(total_amount * 0.5)::INTEGER ELSE 0 END,
    final_paid_amount = CASE WHEN payment_status = 'PAID' THEN GREATEST(0, total_amount - ROUND(total_amount * 0.5)::INTEGER) ELSE 0 END,
    inventory_status = CASE WHEN payment_status IN ('DEPOSIT_APPROVED', 'FINAL_PAYMENT_PENDING', 'FINAL_PAYMENT_SUBMITTED', 'PAID') THEN 'DEDUCTED'::"InventoryStatus" ELSE 'NONE'::"InventoryStatus" END;

CREATE TABLE checkout_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  status "CheckoutIdempotencyStatus" NOT NULL DEFAULT 'STARTED',
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_checkout_idempotency_user_key UNIQUE (user_id, key)
);

CREATE INDEX idx_checkout_idempotency_order_id ON checkout_idempotency_keys(order_id);
CREATE INDEX idx_checkout_idempotency_created_at ON checkout_idempotency_keys(created_at);
CREATE INDEX idx_product_variants_available_stock ON product_variants(deleted_at, is_active, status, stock_quantity, reserved_quantity);
CREATE INDEX idx_orders_inventory_status_created_at ON orders(inventory_status, created_at);

ALTER TABLE product_variants
  ADD CONSTRAINT ck_product_variants_reserved_nonnegative CHECK (reserved_quantity >= 0),
  ADD CONSTRAINT ck_product_variants_reserved_not_above_stock CHECK (reserved_quantity <= stock_quantity);

ALTER TABLE orders
  ADD CONSTRAINT ck_orders_deposit_percent_choices CHECK (deposit_percent IN (50, 60, 70)),
  ADD CONSTRAINT ck_orders_payment_amounts_nonnegative CHECK (
    deposit_amount >= 0 AND remaining_amount >= 0 AND deposit_payment_fee_amount >= 0 AND
    deposit_paid_amount >= 0 AND final_payment_fee_amount >= 0 AND final_amount_due >= 0 AND final_paid_amount >= 0
  );
