-- Phase 8 owner workflow fixes

ALTER TYPE "OrderPaymentStatus" ADD VALUE IF NOT EXISTS 'DEPOSIT_APPROVED';

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "title_ar" VARCHAR(180) NOT NULL,
  "title_en" VARCHAR(180),
  "message_ar" TEXT NOT NULL,
  "message_en" TEXT,
  "type" VARCHAR(40) NOT NULL DEFAULT 'INFO',
  "entity_type" VARCHAR(120),
  "entity_id" VARCHAR(120),
  "read_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_read_created" ON "notifications"("user_id", "read_at", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_read_created" ON "notifications"("read_at", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_entity_created" ON "notifications"("entity_type", "entity_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
