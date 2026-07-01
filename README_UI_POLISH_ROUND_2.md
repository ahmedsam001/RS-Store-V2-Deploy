# RS Store - Storefront UI Polish Round 2

This package builds on `RS_Store_storefront_redesign.zip` and only changes storefront UI files.

## Scope

- Product card polish
  - Better image hover overlay
  - Cleaner category pill
  - Clear sale price / old price / save amount hierarchy
  - Smaller, more premium CTA with icon
  - 5-column product grid on wide screens

- Flash sale strip polish
  - More compact copy
  - `Limited time` chip
  - `View deals` CTA
  - Max 5 preview items to reduce visual weight

- Filters polish
  - Advanced filters now close after Apply
  - Mobile filter bottom sheet with backdrop
  - Desktop filter remains inline/popover
  - Better filter header and close affordance

## Unchanged

- No API changes
- No pricing logic changes
- No flash sale priority changes
- No cart / checkout / order / admin changes

## Recommended local checks

```bash
npm install
npm run typecheck -w @rs-store/web
npm run build -w @rs-store/web
```
