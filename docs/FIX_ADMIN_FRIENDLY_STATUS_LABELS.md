# Fix Admin Friendly Status Labels

## Problem

Some admin screens still displayed technical enum names or developer-oriented labels such as:

- `DRAFT`
- `ORDERED_FROM_SHEIN`
- `FINAL_PAYMENT_PENDING`
- `ARRIVED_STORE`
- `READY_FOR_PICKUP`

This made the admin workflow harder to understand for non-technical users.

## Solution

Added centralized admin label helpers in:

```txt
apps/web/src/features/admin/components/AdminDesign.tsx
```

New helpers:

```ts
labelBatchStatus(value)
labelOrderItemStatus(value)
labelPaymentStatus(value)
```

Updated the shared `labelStatus` map to use clearer names for common payment and tracking states.

## Friendly Labels

### Batch statuses

```txt
DRAFT -> Collecting
ORDERED_FROM_SHEIN -> Ordered
SHIPPING -> In Shipping
CUSTOMS -> At Customs
ARRIVED_EGYPT -> Arrived Egypt
ARRIVED_STORE -> Arrived Shop
READY_FOR_PICKUP -> Ready To Deliver
DELIVERED -> Completed
CANCELLED -> Cancelled
```

### Order item tracking statuses

```txt
PENDING -> Pending
SHEIN -> Ordered
KUWAIT -> Arrived Kuwait
CUSTOMS -> At Customs
EGYPT -> Arrived Egypt
SHOP -> Arrived Shop
CANCELLED -> Cancelled
```

### Payment statuses

```txt
DEPOSIT_PENDING -> Waiting Deposit
DEPOSIT_SUBMITTED -> Deposit Review
DEPOSIT_APPROVED -> Deposit Approved
DEPOSIT_REJECTED -> Deposit Rejected
FINAL_PAYMENT_PENDING -> Waiting Final Payment
FINAL_PAYMENT_SUBMITTED -> Final Payment Review
FINAL_PAYMENT_APPROVED -> Final Payment Approved
FINAL_PAYMENT_REJECTED -> Final Payment Rejected
```

## Updated screens

- Admin shared status badge labels
- Orders page tracking labels
- SHEIN Batches page batch and item labels
- Reports page batch status labels
- Dashboard and any other page using `AdminStatusBadge`

## Notes

Product `DRAFT` remains `Draft` in generic labels to avoid confusing product management screens.
Batch `DRAFT` is shown as `Collecting` through the batch-specific `labelBatchStatus` helper.
