ALTER TABLE "shein_batches"
  ADD COLUMN IF NOT EXISTS "tracking_number" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "tracking_carrier" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "tracking_url" VARCHAR(500);
