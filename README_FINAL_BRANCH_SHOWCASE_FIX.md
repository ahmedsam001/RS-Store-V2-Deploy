# Final Branch Showcase Design Fix

Applied updates:

- Moved the hero and subcategories into one shared premium container.
- Matched the background palette to the branch artwork colors:
  - Cream: `#fffdfb`
  - Warm cream: `#fff8f3`
  - Petal: `#f7dac3`
  - Peach: `#f0c9ad`
  - Warm gold: `#d9965d`
  - Brown: `#3a2b24`
- Added a safe decorative line above the subcategories.
- Fixed the showcase height so the hero/subcategory block stays compact on mobile and tablet.
- Kept the existing subcategory image/logo behavior unchanged.
- Improved footer into a compact glass/petal design with branch artwork and mobile-friendly horizontal trust badges.
- Switched the main header desktop breakpoint from `sm` to `lg` so tablet/mobile widths do not show cramped desktop navigation.

Changed files:

- `apps/web/src/features/catalog/pages/CatalogPage.tsx`
- `apps/web/src/features/catalog/components/StorefrontNavbar.tsx`
- `apps/web/src/styles/storefront.css`
