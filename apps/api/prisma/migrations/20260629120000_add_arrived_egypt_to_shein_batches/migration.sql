-- Adds Egypt as a first-class SHEIN batch tracking stage between customs and shop arrival.

ALTER TYPE "SheinBatchStatus" ADD VALUE IF NOT EXISTS 'ARRIVED_EGYPT' BEFORE 'ARRIVED_STORE';

ALTER TABLE "shein_batches"
  ADD COLUMN IF NOT EXISTS "arrived_egypt_at" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "idx_shein_batches_arrived_egypt_at"
  ON "shein_batches"("arrived_egypt_at");
