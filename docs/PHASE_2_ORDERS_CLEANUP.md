# Phase 2 Orders Cleanup

## Goal

Make the Admin Orders page easy to understand after Phase 1 moved payment proof approval into Payments Review.

Orders should now represent active customer work only, not deposit-review work.

## Business Rule

A customer order appears in Admin Orders only after the deposit has been approved.

Deposit pending, deposit submitted, and deposit rejected orders stay in Payments Review.

## Admin Orders Workflow Tabs

The Orders page now uses clear workflow tabs:

1. Ready For SHEIN Batch
   - Deposit approved
   - Not completed or cancelled
   - Has at least one non-cancelled item not currently inside an active SHEIN batch

2. In SHEIN Batch
   - Deposit approved
   - Not completed or cancelled
   - Has at least one item inside an active SHEIN batch

3. Waiting Final Payment
   - Final payment pending, submitted, or rejected
   - Not completed or cancelled

4. Ready To Deliver
   - Fully paid
   - Not completed or cancelled

5. Completed
   - Order status completed

6. Cancelled
   - Order status cancelled

## Design Changes

The Orders page now focuses on quick decisions:

- Workflow tabs at the top
- Search by order number, customer name, phone, or email
- Simple order cards
- Each card shows customer, items count, total, paid, remaining, and next action
- Order details start with a clear Next Action panel
- Payment proof actions are removed from Orders and stay in Payments Review

## Next Action Logic

The selected order shows one obvious next step:

- Add to SHEIN Batch
- Track in SHEIN Batch
- Waiting final payment
- Review final payment
- Ready to deliver
- Completed order
- Cancelled order

## Backend Changes

The orders query workflow filter now supports:

- ACTIVE_ORDERS
- PAYMENT_REVIEW
- READY_FOR_SHEIN_BATCH
- IN_SHEIN_BATCH
- WAITING_FINAL_PAYMENT
- READY_TO_DELIVER
- COMPLETED
- CANCELLED

This allows the frontend tabs to request the correct data directly from the API instead of doing only frontend filtering.

## No Database Migration

Phase 2 does not require a database migration.
