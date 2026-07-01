# Fix Dangerous Action Confirmation Modals

## Problem

Some admin actions were too sensitive to run immediately after a single click:

- Bulk Update Tracking
- Move To Arrived Shop
- Move To Delivered
- Remove Item
- Cancel Batch through the batch status selector
- Reject Payment
- Reject Cash Payment
- Mark Delivered from Delivery

These actions can update many items, open final payment for customer orders, remove a product from a batch, close a customer order, or reject a customer payment.

## Solution

Added a reusable admin confirmation modal:

```txt
apps/web/src/features/admin/components/AdminConfirmationDialog.tsx
```

The modal shows:

- Clear title
- Direct warning message
- Action details
- Confirm button
- Cancel button
- Warning or danger tone

## SHEIN Batch confirmations

The batch details page now asks for confirmation before:

- Moving a batch to the next tracking stage
- Bulk updating tracking from the status form
- Moving to Arrived Shop or Ready For Pickup where final payment may open
- Moving to Delivered
- Cancelling a batch through the status selector
- Removing an item from a draft batch
- Marking a customer order Ready To Deliver
- Marking a customer order Delivered

The confirmation modal includes details such as:

- Batch code
- Customer orders affected
- Non-cancelled items affected
- Item tracking status that will be applied
- Whether final payment may open for customer orders

## Payment Review confirmations

Rejecting a payment proof now requires two steps:

1. Admin writes a rejection reason
2. Admin confirms the rejection in a modal

This applies to:

- Deposit proof rejection
- Final payment proof rejection
- Cash final payment rejection

The modal shows:

- Order number
- Customer name
- Payment type or affected amount
- Rejection reason
- Operational effect of the rejection

## Extra cleanup

Fixed a duplicate action call inside `AdminPaymentsReviewPage.run` so payment actions are no longer submitted twice.

## Database changes

No database migration was needed.
