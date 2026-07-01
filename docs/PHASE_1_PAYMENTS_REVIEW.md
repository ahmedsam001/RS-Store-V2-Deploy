# Phase 1 Payments Review

## Goal

Separate payment proof review from active order management so the admin workflow becomes easier to understand.

## New Admin Flow

1. Customer creates an order and uploads a deposit proof.
2. The order appears in **Admin > Payments Review > Deposit Review**.
3. Admin approves or rejects the deposit proof.
4. If the deposit is approved the order moves to **Admin > Orders**.
5. Orders now focuses on batching tracking and delivery instead of payment proof review.

## Admin Navigation

A new sidebar entry was added:

- Payments Review

Existing Orders remains available but is now focused on active deposit approved orders.

## Payments Review Queues

- Deposit Review
- Final Payment Review
- Rejected Deposits
- Rejected Final Payments

## Orders Page Change

The Orders page now calls the orders API with:

```txt
workflow=ACTIVE_ORDERS
```

This excludes orders with these payment statuses from the active orders list when no explicit payment status is selected:

- DEPOSIT_PENDING
- DEPOSIT_SUBMITTED
- DEPOSIT_REJECTED

## Backend Change

The admin orders list supports a new query field:

```txt
workflow=ACTIVE_ORDERS
workflow=PAYMENT_REVIEW
```

No database migration is required for this phase.
