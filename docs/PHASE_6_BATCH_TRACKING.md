# Phase 6 - SHEIN Batch Tracking

## Goal

Phase 6 makes batch tracking easier for admins.

The admin can now move the whole SHEIN batch from one tracking stage to the next and the system automatically syncs the related order items.

Customer orders remain independent. The batch is only an internal SHEIN purchase and shipment tracking group.

## Main Workflow

```txt
Collecting
↓
Ordered from SHEIN
↓
Shipping
↓
Customs
↓
Arrived shop
↓
Ready for pickup
↓
Completed
```

## Bulk Batch Tracking

When an admin updates the batch status the backend now updates every non cancelled order item inside the batch.

Mapping used by the system:

```txt
DRAFT                → PENDING
ORDERED_FROM_SHEIN   → SHEIN
SHIPPING             → KUWAIT
CUSTOMS              → CUSTOMS
ARRIVED_EGYPT
ARRIVED_STORE        → SHOP
READY_FOR_PICKUP     → SHOP
DELIVERED            → SHOP
CANCELLED            → PENDING
```

The cancelled batch status releases items back to pending instead of cancelling customer order items.

## Individual Item Override

Admins can still update one item manually from the Items Tracking tab.

This is useful when one item is delayed cancelled or arrives in a different shipment stage from the rest of the batch.

Supported item statuses:

```txt
Pending
Ordered from SHEIN
Arrived Kuwait
In customs
Arrived Egypt
Arrived shop
Cancelled
```

## Backend Changes

Added endpoint:

```txt
PATCH /shein-batches/:id/items/:itemId/status
```

Request body:

```json
{
  "status": "EGYPT",
  "note": "Manual item tracking override"
}
```

Added DTO:

```txt
apps/api/src/modules/shein-batches/dto/update-shein-batch-item-status.dto.ts
```

Updated batch status logic:

```txt
apps/api/src/modules/shein-batches/shein-batches.service.ts
```

The batch status update now:

```txt
Updates the batch status
Syncs all non cancelled order items
Creates status history
Regenerates WhatsApp messages
Writes audit log metadata with synced item count
```

Terminal safety added:

```txt
Delivered or cancelled batches cannot be moved again
Items inside delivered or cancelled batches cannot be manually updated
```

## Frontend Changes

Updated:

```txt
apps/web/src/features/admin/pages/AdminSheinBatchesPage.tsx
apps/web/src/features/admin/api/admin-api.ts
```

The UI now includes:

```txt
Move To Next Stage button
Bulk Update Tracking form
Explanation of what item status will be synced
Individual item status selector
Save Item Status button per item
```

## No Database Migration

Phase 6 does not require a database migration.

It uses the existing OrderItemStatus enum and existing SHEIN batch status model.
