# RS Store Storefront Redesign

This package applies a visual redesign to the public catalog/store entry page only.

## What changed

- Converted the catalog hero into a compact storefront hero.
- Moved category/subcategory circles out of the hero into a slim horizontal strip.
- Replaced the large flash sale block with a compact flash sale strip.
- Rebuilt search and filters as a sticky compact toolbar.
- Kept advanced price filters hidden until the customer opens them.
- Added active filter chips for search, price, sort, and subcategory state.
- Added a cleaner products heading with item count.
- Reduced vertical spacing so products appear earlier on mobile and desktop.

## Files changed

- `apps/web/src/features/catalog/pages/CatalogPage.tsx`
- `apps/web/src/features/catalog/components/CatalogFilters.tsx`
- `apps/web/src/features/catalog/components/FlashSaleHomeStrip.tsx`
- `apps/web/src/styles/storefront.css`

## Business logic

No pricing, flash sale priority, cart, checkout, final payment, admin, or API logic was changed.
This is a UI and responsive layout change only.

## Validation performed in this environment

- TSX syntax parse was checked for the three modified TSX files with the TypeScript compiler API.
- Full `npm run typecheck -w @rs-store/web` could not run here because this extracted package has no `node_modules`, so the environment is missing `node` and `vite/client` type definitions.

Run locally after installing dependencies:

```bash
npm install
npm run typecheck -w @rs-store/web
npm run build -w @rs-store/web
npm run lint -w @rs-store/web
```
