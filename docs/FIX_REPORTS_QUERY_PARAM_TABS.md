# Fix Reports query param tabs

## Problem

Reports had links like:

- `/admin/orders?workflow=WAITING_FINAL_PAYMENT`
- `/admin/payments-review?workflow=CASH_FINAL_PAYMENT_REVIEW`

But the destination pages always opened their default tab because the pages did not read query params from the URL.

## Fix

The following admin pages now read the URL on first render and use it to select the correct tab:

- `AdminOrdersPage` reads `workflow`
- `AdminPaymentsReviewPage` reads `queue`, `workflow`, and `paymentStatus`
- `AdminSheinBatchesPage` reads `statusGroup`

The tab handlers also update the URL when the admin changes tabs or pages, so the current view is shareable and works with browser history.

## Supported URLs

### Orders

```txt
/admin/orders?workflow=READY_FOR_SHEIN_BATCH
/admin/orders?workflow=IN_SHEIN_BATCH
/admin/orders?workflow=WAITING_FINAL_PAYMENT
/admin/orders?workflow=READY_TO_DELIVER
/admin/orders?workflow=COMPLETED
/admin/orders?workflow=CANCELLED
```

### Payments Review

```txt
/admin/payments-review?queue=DEPOSIT_SUBMITTED&workflow=PAYMENT_REVIEW&paymentStatus=DEPOSIT_SUBMITTED
/admin/payments-review?queue=FINAL_PAYMENT_SUBMITTED&workflow=PAYMENT_REVIEW&paymentStatus=FINAL_PAYMENT_SUBMITTED
/admin/payments-review?queue=CASH_FINAL_PAYMENT_PENDING&workflow=CASH_FINAL_PAYMENT_REVIEW
/admin/payments-review?queue=DEPOSIT_REJECTED&workflow=PAYMENT_REVIEW&paymentStatus=DEPOSIT_REJECTED
/admin/payments-review?queue=FINAL_PAYMENT_REJECTED&workflow=PAYMENT_REVIEW&paymentStatus=FINAL_PAYMENT_REJECTED
```

Backward compatibility is preserved for links that only pass:

```txt
/admin/payments-review?workflow=CASH_FINAL_PAYMENT_REVIEW
```

This still opens the Cash Final Review tab.

### SHEIN Batches

```txt
/admin/shein-batches?statusGroup=COLLECTING
/admin/shein-batches?statusGroup=ORDERED
/admin/shein-batches?statusGroup=IN_SHIPPING
/admin/shein-batches?statusGroup=ARRIVED_SHOP
/admin/shein-batches?statusGroup=COMPLETED
/admin/shein-batches?statusGroup=CANCELLED
```

## Reports updates

Reports links were updated to send more explicit query params:

- Deposit review opens the Deposit Review tab
- Final payment review opens the Final Payment Review tab
- Cash final review opens the Cash Final Review tab
- Order metrics open their matching Orders tab
- SHEIN batch links open the matching batch status group

## Files changed

```txt
apps/web/src/features/admin/pages/AdminOrdersPage.tsx
apps/web/src/features/admin/pages/AdminPaymentsReviewPage.tsx
apps/web/src/features/admin/pages/AdminSheinBatchesPage.tsx
apps/web/src/features/admin/pages/AdminReportsPage.tsx
docs/FIX_REPORTS_QUERY_PARAM_TABS.md
```
