# Footer Design Fix

Applied to the storefront layout only.

## Summary

- Added a real storefront footer under all public storefront pages.
- Footer uses public settings for store name, WhatsApp, phone, Instagram, currency, and estimated shipping days.
- Added compact brand copy, shop links, account links, SHEIN/custom order links, trust chips, and contact CTAs.
- Built responsive footer layout:
  - Mobile: stacked sections and full-width contact buttons.
  - Tablet: brand + links grid with contact row below.
  - Desktop: four-column footer.
- Kept price, cart, checkout, orders, admin, flash-sale priority, and payment logic unchanged.

## Verification

Ran successfully:

```bash
npm run typecheck -w @rs-store/web
npm run build -w @rs-store/web
npm run lint -w @rs-store/web
```

Lint result: 0 errors and the same existing warnings from previous passes.
