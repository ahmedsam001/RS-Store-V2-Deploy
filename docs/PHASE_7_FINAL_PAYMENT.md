# Phase 7 Final Payment Workflow

## Goal

Phase 7 opens the final payment step automatically after the SHEIN batch reaches the shop and keeps final payment review outside the main Orders page.

## Business workflow

1. Customer order is created
2. Deposit proof is reviewed in Payments Review
3. Approved orders enter Orders and can be added to a SHEIN Batch
4. Admin tracks the SHEIN Batch
5. When the batch moves to Arrived Store or Ready For Pickup the related items are synced to SHOP
6. If every active item in a customer order is at SHOP the order payment status becomes FINAL_PAYMENT_PENDING
7. Customer chooses final payment method
8. Uploaded Instapay or Vodafone final proofs are reviewed from Payments Review
9. Cash at store final payments are reviewed from Payments Review under Cash Final Review
10. Approved final payment moves the order to PAID and Ready To Deliver

## Backend changes

### SHEIN batch tracking

`SheinBatchesService.updateStatus` now opens final payment automatically for ready customer orders when batch status maps to item status SHOP.

Affected batch statuses:

- ARRIVED_STORE
- READY_FOR_PICKUP
- DELIVERED

The system only opens final payment when:

- Order is not cancelled
- Order is not completed
- Order payment status is DEPOSIT_APPROVED
- All active order items are SHOP or CANCELLED

### Manual item tracking

`SheinBatchesService.updateItemStatus` also opens final payment when a single item is manually moved to SHOP and the order becomes fully ready.

### Cash final payment review

A new admin workflow filter was added:

```txt
workflow=CASH_FINAL_PAYMENT_REVIEW
```

It returns only orders where:

- paymentStatus = FINAL_PAYMENT_PENDING
- finalPaymentMethod = CASH_AT_SHOP
- order is not completed or cancelled

## Frontend changes

### Payments Review

Payments Review now has five queues:

- Deposit Review
- Final Payment Review
- Cash Final Review
- Rejected Deposits
- Rejected Final Payments

Cash Final Review lets the admin approve or reject cash-at-store final payments without using the Orders page.

### Orders

Orders now recognizes cash final payment as a review action and points the admin back to Payments Review.

### SHEIN Batches

The batch details summary explains that final payment opens automatically after shop arrival.

## No database migration

Phase 7 uses the existing schema and does not add new tables or columns.
