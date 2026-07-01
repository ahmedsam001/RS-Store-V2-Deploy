# Fix SHEIN Batch Arrived Egypt Stage

This fix adds `ARRIVED_EGYPT` as a first-class `SheinBatchStatus` between `CUSTOMS` and `ARRIVED_STORE`.

## New batch flow

```txt
DRAFT
ORDERED_FROM_SHEIN
SHIPPING
CUSTOMS
ARRIVED_EGYPT
ARRIVED_STORE
READY_FOR_PICKUP
DELIVERED
CANCELLED
```

## Tracking sync

When a batch is moved to `ARRIVED_EGYPT`, all active order items inside that batch are synced to `OrderItemStatus.EGYPT`.

Final payment is still opened only when the batch moves to `ARRIVED_STORE`, `READY_FOR_PICKUP`, or `DELIVERED`, because those statuses sync items to `SHOP`.

## Database changes

- Adds enum value `ARRIVED_EGYPT` to `SheinBatchStatus`
- Adds `shein_batches.arrived_egypt_at`
- Adds index `idx_shein_batches_arrived_egypt_at`

Run Prisma migration and generate after applying this zip:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```
