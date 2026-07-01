CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "guest_key" CHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "carts_owner_chk" CHECK ((("user_id" IS NOT NULL)::int + ("guest_key" IS NOT NULL)::int) = 1)
);

CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cart_items_quantity_chk" CHECK ("quantity" BETWEEN 1 AND 99)
);

CREATE TABLE "wishlists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "guest_key" CHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wishlists_owner_chk" CHECK ((("user_id" IS NOT NULL)::int + ("guest_key" IS NOT NULL)::int) = 1)
);

CREATE TABLE "wishlist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wishlist_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_carts_user_id" ON "carts"("user_id");
CREATE UNIQUE INDEX "uq_carts_guest_key" ON "carts"("guest_key");
CREATE INDEX "idx_carts_updated_at" ON "carts"("updated_at");
CREATE INDEX "idx_cart_items_cart_id" ON "cart_items"("cart_id");
CREATE INDEX "idx_cart_items_product_id" ON "cart_items"("product_id");
CREATE INDEX "idx_cart_items_product_variant_id" ON "cart_items"("product_variant_id");
CREATE UNIQUE INDEX "uq_cart_items_base_product" ON "cart_items"("cart_id", "product_id") WHERE "product_variant_id" IS NULL;
CREATE UNIQUE INDEX "uq_cart_items_product_variant" ON "cart_items"("cart_id", "product_id", "product_variant_id") WHERE "product_variant_id" IS NOT NULL;

CREATE UNIQUE INDEX "uq_wishlists_user_id" ON "wishlists"("user_id");
CREATE UNIQUE INDEX "uq_wishlists_guest_key" ON "wishlists"("guest_key");
CREATE INDEX "idx_wishlists_updated_at" ON "wishlists"("updated_at");
CREATE UNIQUE INDEX "uq_wishlist_items_wishlist_product" ON "wishlist_items"("wishlist_id", "product_id");
CREATE INDEX "idx_wishlist_items_product_id" ON "wishlist_items"("product_id");

ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_fkey" FOREIGN KEY ("wishlist_id") REFERENCES "wishlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
