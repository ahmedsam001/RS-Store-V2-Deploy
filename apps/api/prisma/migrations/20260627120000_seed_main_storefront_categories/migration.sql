INSERT INTO categories (id, slug, name_ar, name_en, description, sort_order, is_active, created_at, updated_at, deleted_at)
VALUES
  (gen_random_uuid(), 'women', 'Women', 'Women', 'Fashion pieces bags shoes and accessories for effortless everyday style', 10, true, now(), now(), NULL),
  (gen_random_uuid(), 'kids', 'Kids', 'Kids', 'Soft outfits and playful essentials for babies and kids', 20, true, now(), now(), NULL)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description = COALESCE(categories.description, EXCLUDED.description),
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  deleted_at = NULL,
  updated_at = now();
