# SHEIN Batch Order Tracking

## Purpose

The SHEIN batch flow supports the real admin workflow where multiple customer order items are grouped into one external SHEIN purchase batch. A single customer order can have separate items assigned to different batches, so tracking is stored at order item level.

## Implemented cycles

### Cycle 1 Database

Implemented database foundation for:

- `SheinBatchStatus`
- `shein_batches`
- `shein_batch_items`
- `shein_batch_status_history`
- `shein_batch_number_counters`
- Relations with users orders order items products and product variants
- Batch code foundation such as `SH-2026-06-001`

### Cycle 2 Admin API

Implemented admin protected API for:

- Creating batches
- Listing and filtering batches
- Reading batch details
- Updating batch information
- Updating batch status
- Adding one or many order items
- Removing items
- Recalculating totals
- Listing available order items
- Generating WhatsApp notification payloads
- Regenerating WhatsApp messages
- Updating a custom WhatsApp message per item

### Cycle 3 Admin UI

Implemented admin dashboard page:

- `/admin/shein-batches`
- Create batch form
- Batch list with search and status filter
- Batch details panel
- Products and customers table cards
- Add available order items
- Unit SAR input when adding items
- WhatsApp button per customer item
- Copy WhatsApp message button
- Status dropdown
- Status timeline

### Cycle 4 Customer Tracking

Implemented customer facing tracking inside order details:

- Shows SHEIN shipment state inside order details
- Shows per item tracking
- Supports different batches for different order items
- Shows timeline for the customer
- Hides all other customer data

### Cycle 5 Notifications

Implemented WhatsApp notification foundation:

- WhatsApp message per order item
- WhatsApp URL per customer phone
- Messages regenerate when batch status changes
- Manual regenerate action in admin
- Manual message update endpoint
- Copy message button in admin UI

SMS and email are not implemented yet but the current structure can support them later.

## Batch statuses

```text
DRAFT
ORDERED_FROM_SHEIN
SHIPPING
CUSTOMS
ARRIVED_STORE
READY_FOR_PICKUP
DELIVERED
CANCELLED
```

## Main rules

- Batching works on order items not whole orders
- One order item cannot be assigned to more than one active batch
- Delivered and cancelled batches are terminal
- New items cannot be added to terminal batches
- Cancelled order items and cancelled orders are excluded from available batch items
- Orders with rejected or pending deposit are excluded from available batch items
- Customer tracking only exposes batch data for the customer own order items
- WhatsApp messages are generated per item
- Changing exchange rate recalculates EGP amounts for items with SAR values

## Admin flow

1. Admin creates a new batch
2. Admin selects available order items
3. Admin enters unit SAR cost for selected items if available
4. System calculates SAR and EGP totals
5. Admin updates status as the external order moves through the workflow
6. Customer sees the current state in order details
7. Admin can send or copy WhatsApp message for each item

## Customer flow

The customer opens order details and sees:

- Batch code
- Current shipment state
- Timeline
- Tracking per item

The customer does not see other customers names phones or order data.

## Next possible cycle

The next useful cycle is optional notification delivery:

- SMS provider integration
- Email provider integration
- Notification history per order item
- Bulk send WhatsApp reminder helper
