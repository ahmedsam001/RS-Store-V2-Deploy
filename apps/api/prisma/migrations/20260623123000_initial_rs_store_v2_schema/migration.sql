CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN', 'OWNER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ImageSource" AS ENUM ('ADMIN_UPLOAD', 'SHEIN_IMPORT', 'MIGRATION');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'SHEIN', 'KUWAIT', 'CUSTOMS', 'EGYPT', 'SHOP', 'CANCELLED');
CREATE TYPE "FlashSaleStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "SettingScope" AS ENUM ('PUBLIC', 'ADMIN', 'SYSTEM');
CREATE TYPE "SheinImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(32),
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_or_phone_chk" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL)
);

CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(180) NOT NULL,
    "name_ar" VARCHAR(160) NOT NULL,
    "name_en" VARCHAR(160),
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "sku" VARCHAR(80),
    "slug" VARCHAR(220) NOT NULL,
    "name_ar" VARCHAR(220) NOT NULL,
    "name_en" VARCHAR(220),
    "description" TEXT,
    "price_amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EGP',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_price_amount_non_negative_chk" CHECK ("price_amount" >= 0)
);

CREATE TABLE "product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "secure_url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "byte_size" INTEGER,
    "format" VARCHAR(40),
    "alt_text_ar" VARCHAR(220),
    "alt_text_en" VARCHAR(220),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "source" "ImageSource" NOT NULL DEFAULT 'ADMIN_UPLOAD',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_images_width_positive_chk" CHECK ("width" IS NULL OR "width" > 0),
    CONSTRAINT "product_images_height_positive_chk" CHECK ("height" IS NULL OR "height" > 0),
    CONSTRAINT "product_images_byte_size_positive_chk" CHECK ("byte_size" IS NULL OR "byte_size" > 0)
);

CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" VARCHAR(40) NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "currency" CHAR(3) NOT NULL DEFAULT 'EGP',
    "subtotal_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_amounts_non_negative_chk" CHECK ("subtotal_amount" >= 0 AND "discount_amount" >= 0 AND "total_amount" >= 0),
    CONSTRAINT "orders_discount_not_greater_than_subtotal_chk" CHECK ("discount_amount" <= "subtotal_amount"),
    CONSTRAINT "orders_total_matches_amounts_chk" CHECK ("total_amount" = "subtotal_amount" - "discount_amount")
);

CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "product_name_snapshot" VARCHAR(220) NOT NULL,
    "product_sku_snapshot" VARCHAR(80),
    "quantity" INTEGER NOT NULL,
    "unit_price_amount" DECIMAL(12,2) NOT NULL,
    "line_total_amount" DECIMAL(12,2) NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_quantity_positive_chk" CHECK ("quantity" > 0),
    CONSTRAINT "order_items_amounts_non_negative_chk" CHECK ("unit_price_amount" >= 0 AND "line_total_amount" >= 0),
    CONSTRAINT "order_items_line_total_matches_quantity_chk" CHECK ("line_total_amount" = "unit_price_amount" * "quantity")
);

CREATE TABLE "flash_sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_ar" VARCHAR(180) NOT NULL,
    "title_en" VARCHAR(180),
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "FlashSaleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flash_sales_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flash_sales_discount_percent_range_chk" CHECK ("discount_percent" >= 0 AND "discount_percent" <= 100),
    CONSTRAINT "flash_sales_valid_time_window_chk" CHECK ("ends_at" > "starts_at")
);

CREATE TABLE "flash_sale_products" (
    "flash_sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flash_sale_products_pkey" PRIMARY KEY ("flash_sale_id", "product_id")
);

CREATE TABLE "settings" (
    "key" VARCHAR(120) NOT NULL,
    "value" JSONB NOT NULL,
    "scope" "SettingScope" NOT NULL DEFAULT 'SYSTEM',
    "description" TEXT,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(120) NOT NULL,
    "entity_id" VARCHAR(120),
    "ip_address" INET,
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shein_imports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requested_by_id" UUID,
    "source_url" TEXT NOT NULL,
    "normalized_url_key" VARCHAR(300),
    "status" "SheinImportStatus" NOT NULL DEFAULT 'PENDING',
    "raw_payload" JSONB,
    "created_product_id" UUID,
    "imported_images_count" INTEGER NOT NULL DEFAULT 0,
    "error_code" VARCHAR(80),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    CONSTRAINT "shein_imports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shein_imports_imported_images_count_non_negative_chk" CHECK ("imported_images_count" >= 0)
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "idx_users_role_status" ON "users"("role", "status");
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "idx_sessions_user_expires_at" ON "sessions"("user_id", "expires_at");
CREATE INDEX "idx_sessions_expires_at" ON "sessions"("expires_at");
CREATE INDEX "idx_sessions_revoked_at" ON "sessions"("revoked_at");

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "idx_categories_active_sort_order" ON "categories"("is_active", "sort_order");

CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "idx_products_status_category" ON "products"("status", "category_id");
CREATE INDEX "idx_products_category_id" ON "products"("category_id");
CREATE INDEX "idx_products_price_amount" ON "products"("price_amount");
CREATE INDEX "idx_products_created_at" ON "products"("created_at");

CREATE UNIQUE INDEX "product_images_cloudinary_public_id_key" ON "product_images"("cloudinary_public_id");
CREATE INDEX "idx_product_images_product_sort_order" ON "product_images"("product_id", "sort_order");
CREATE UNIQUE INDEX "uq_product_images_one_primary_per_product" ON "product_images"("product_id") WHERE "is_primary" = true;

CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE INDEX "idx_orders_user_created_at" ON "orders"("user_id", "created_at");
CREATE INDEX "idx_orders_status_created_at" ON "orders"("status", "created_at");

CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");
CREATE INDEX "idx_order_items_product_id" ON "order_items"("product_id");
CREATE INDEX "idx_order_items_status" ON "order_items"("status");

CREATE INDEX "idx_flash_sales_status_window" ON "flash_sales"("status", "starts_at", "ends_at");
CREATE INDEX "idx_flash_sales_ends_at" ON "flash_sales"("ends_at");
CREATE INDEX "idx_flash_sale_products_product_id" ON "flash_sale_products"("product_id");

CREATE INDEX "idx_settings_scope" ON "settings"("scope");

CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");
CREATE INDEX "idx_audit_logs_actor_created_at" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "idx_audit_logs_entity_created_at" ON "audit_logs"("entity_type", "entity_id", "created_at");
CREATE INDEX "idx_audit_logs_action_created_at" ON "audit_logs"("action", "created_at");

CREATE INDEX "idx_shein_imports_requested_by_created_at" ON "shein_imports"("requested_by_id", "created_at");
CREATE INDEX "idx_shein_imports_status_created_at" ON "shein_imports"("status", "created_at");
CREATE INDEX "idx_shein_imports_normalized_url_key" ON "shein_imports"("normalized_url_key");
CREATE INDEX "idx_shein_imports_created_product_id" ON "shein_imports"("created_product_id");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "flash_sale_products" ADD CONSTRAINT "flash_sale_products_flash_sale_id_fkey" FOREIGN KEY ("flash_sale_id") REFERENCES "flash_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "flash_sale_products" ADD CONSTRAINT "flash_sale_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shein_imports" ADD CONSTRAINT "shein_imports_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shein_imports" ADD CONSTRAINT "shein_imports_created_product_id_fkey" FOREIGN KEY ("created_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
