-- Order totals include the Vodafone Cash fee charged on the deposit.
-- The fee is stored separately in deposit_payment_fee_amount, while
-- final-payment fees remain outside total_amount and are represented by
-- final_payment_fee_amount/final_amount_due.

ALTER TABLE "orders"
  DROP CONSTRAINT IF EXISTS "orders_total_matches_amounts_chk",
  ADD CONSTRAINT "orders_total_matches_amounts_chk"
  CHECK (
    "total_amount" =
    "subtotal_amount"
    - "discount_amount"
    + "deposit_payment_fee_amount"
  );
