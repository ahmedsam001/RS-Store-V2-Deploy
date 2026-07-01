# Fix Available Items Exclude Completed Orders

## Problem

The SHEIN available order items API excluded cancelled orders only.

This meant order items from completed customer orders could still appear in the Ready Items list, even though the batch item creation flow later rejects completed orders.

## Fix

Updated `findAvailableOrderItems` to exclude both completed and cancelled orders from the initial query.

```ts
order: {
  status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
  paymentStatus: OrderPaymentStatus.DEPOSIT_APPROVED,
}
```

## Result

Completed customer orders no longer appear in the SHEIN ready items list.

The Ready Items UI is now aligned with the backend validation inside `createBatchItem`.

## Files Updated

- `apps/api/src/modules/shein-batches/shein-batches.service.ts`
- `apps/api/dist/modules/shein-batches/shein-batches.service.js`
