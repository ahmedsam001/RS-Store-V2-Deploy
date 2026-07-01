-- Flash sale guardrails
-- Keep the same service rules enforced at database level for discount percent.
ALTER TABLE "flash_sales"
  DROP CONSTRAINT IF EXISTS "chk_flash_sales_discount_percent_range";

ALTER TABLE "flash_sales"
  ADD CONSTRAINT "chk_flash_sales_discount_percent_range"
  CHECK ("discount_percent" > 0 AND "discount_percent" <= 100);
