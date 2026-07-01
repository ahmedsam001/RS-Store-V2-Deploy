# Admin UX Simplification

Applied to:

- Admin Settings
- Admin Flash Sales
- Admin Payments Review

## Summary

This is a frontend/admin UX-only pass. It does not change pricing, flash-sale priority, payment review API calls, order status transitions, or final-payment logic.

## Settings

- Replaced the single long settings form with focused setting-area cards.
- Default area opens on Payment settings because it is the most operationally important.
- Only the active section is saved, so hidden fields are not accidentally overwritten.
- Added summary preview cards for each settings area.
- Kept Shipping and SHEIN settings available but treated them as less frequent/advanced areas.

## Flash Sales

- Collapsed new flash-sale creation behind a New Flash Sale button.
- Simplified filters into search + status first; date filters are hidden until needed.
- Removed duplicate Activate / Pause / Delete action group.
- Kept quick actions visible and moved full edit inputs into a collapsed section.
- Added a clear note that flash sales keep priority over normal product discounts.

## Payments Review

- Converted queue cards into compact queue pills.
- Kept only the next action and the amount to review visible first.
- Collapsed customer/order details behind a disclosure section.
- Kept approve/reject behavior and confirmation flow unchanged.

## Verification

Ran successfully:

```bash
npm run typecheck -w @rs-store/web
npm run build -w @rs-store/web
npm run lint -w @rs-store/web
```

Lint result: 0 errors, 19 warnings. The warnings are existing React hooks / Fast Refresh warnings and are not from this UX pass.
