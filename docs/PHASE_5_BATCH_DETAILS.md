# Phase 5 - SHEIN Batch Details

## Goal

Make every SHEIN batch easy to read and operate by splitting the selected batch details into simple tabs instead of one long complex admin screen.

Customer orders remain independent. The SHEIN batch is only an internal purchasing and tracking group.

## Admin UI Changes

The selected batch details now show a clear top summary with:

- Current next action
- Batch progress stepper
- Orders count
- Pieces count
- Total SAR
- Total EGP

The detailed view is split into these tabs:

1. Summary
2. Orders
3. Items Tracking
4. Payments
5. Timeline
6. Notes

## Summary Tab

Shows the main batch information and status controls:

- Title
- SHEIN reference
- Exchange rate
- Collection date
- Created by
- Updated by
- Customer paid total
- Customer remaining total
- Batch status update form

## Orders Tab

Groups batch items by customer order so the admin can understand which customer orders are inside the batch.

Each order card shows:

- Order number
- Customer name
- Customer phone
- Number of items inside the batch
- Order total
- Paid amount
- Remaining amount
- Order status
- Payment status

## Items Tracking Tab

Shows the actual products inside the batch.

Each item card shows:

- Order number
- Product name
- Variant name when available
- Customer name
- Customer phone
- Quantity
- Total SAR
- Total EGP
- Batch status
- Order item status
- WhatsApp copy and open actions
- Remove item action

Adding selected ready items to a collecting batch is now inside this tab.

## Payments Tab

Shows the financial state of all customer orders inside the batch.

The top summary shows:

- Orders total EGP
- Deposit paid EGP
- Final paid EGP
- Remaining EGP

Each order row shows:

- Customer order
- Customer name and phone
- Total EGP
- Deposit EGP
- Final paid EGP
- Remaining EGP

## Timeline Tab

Shows the status history of the selected batch with:

- Status label
- Note
- Admin who changed it when available
- Date and time

## Notes Tab

Adds a simple internal notes editor for the selected batch using the existing batch update endpoint.

## API Enrichment

The batch details API now includes more order fields for items inside a batch:

- totalAmount
- depositPaidAmount
- finalPaidAmount
- finalAmountDue
- remainingAmount
- customerNameSnapshot
- customerPhoneSnapshot

This supports the Orders and Payments tabs without adding a database migration.

## No Database Migration

This phase does not change the database schema.
