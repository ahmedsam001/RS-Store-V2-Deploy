# Phase 8 Distribution

## Goal

Make distribution simple after a SHEIN batch reaches the shop.

Customer orders stay independent. The batch is only the internal purchase and shipping group.

## Admin flow

1. Batch moves to `ARRIVED_STORE` or `READY_FOR_PICKUP`.
2. Items are synced to `SHOP` by the Phase 6 and Phase 7 tracking logic.
3. Orders whose items reached the shop move to final payment.
4. Final payments are reviewed from `Payments Review`.
5. Paid orders become deliverable from the new `Distribution` tab inside the batch details.

## UI changes

`SHEIN Batches -> Batch Details` now includes a new tab:

- Summary
- Orders
- Items Tracking
- Payments
- Distribution
- Timeline
- Notes

The Distribution tab shows four operational counters:

- Waiting final payment
- Ready to deliver
- Delivered
- Cancelled

Each customer order card shows:

- Order number
- Customer name
- Customer phone
- Items count from this batch
- Total EGP
- Paid EGP
- Remaining EGP
- Payment status
- Delivery status
- Next action

## Actions

If the order is not fully paid:

- The admin sees `Waiting final payment`.
- The action points to `Payments Review`.

If the order is fully paid but not ready for delivery:

- The admin sees `Payment completed`.
- The admin can click `Mark Ready To Deliver`.
- The frontend advances the order through the safe existing status flow until `SHIPPED`.

If the order is ready to deliver:

- The admin sees `Ready to deliver`.
- The admin can click `Mark Delivered`.
- The frontend advances the order to `COMPLETED` using the existing order status API.

## Backend changes

No database migration was added.

No new backend endpoint was required.

The existing admin order status endpoint is reused:

`PATCH /orders/:id/status`

A frontend helper was added to send an optional distribution note with the status change.

## Important rules

- Orders cannot be marked delivered unless payment is fully paid.
- Orders keep their normal order status flow.
- Cancelled orders do not show delivery actions.
- Completed orders are shown as delivered.
- Final payment review stays outside Orders and Batch details to keep the admin workflow simple.
