# Fix: SHEIN Batch Item Removal Safety

## Problem

A SHEIN batch item could be removed after the batch had already moved beyond the collecting stage.

That created a risky state where an order item could be removed from a batch while its tracking status was already `KUWAIT`, `CUSTOMS`, `EGYPT`, or `SHOP`, then later appear again as available for another batch with stale tracking data.

## Fix

Removing an item from a SHEIN batch is now allowed only while the batch status is:

```txt
DRAFT
```

After the batch moves to any operational stage, the API rejects item removal.

Blocked statuses include:

```txt
ORDERED_FROM_SHEIN
SHIPPING
CUSTOMS
ARRIVED_EGYPT
ARRIVED_STORE
READY_FOR_PICKUP
DELIVERED
CANCELLED
```

## Backend Behavior

Endpoint:

```txt
DELETE /shein-batches/:id/items/:itemId
```

Now checks the parent batch status first.

If the batch is not `DRAFT`, it returns a bad request error.

When removing an item from a `DRAFT` batch, the related order item status is reset to `PENDING` unless the item was already cancelled.

## Admin UI Behavior

Inside Batch Details → Items Tracking:

- The `Remove` button is shown only for `DRAFT` batches
- For non-draft batches the UI shows `Locked after ordering`
- If a direct UI action somehow tries to remove after draft, the page shows an error notice

## Result

Batch item removal is safe and cannot corrupt shipment tracking after the batch has been ordered or shipped.
