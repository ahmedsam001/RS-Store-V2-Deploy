# Fix Selected Items Totals And SHEIN Batch Tracking Fields

## Problem 7

Create Batch selected items were stored only as ids.
If an admin selected items from one ready-items search result and then searched for another result set, the selected ids stayed active while totals were calculated from the current readyItems list only.
That could show wrong SAR and EGP totals before creating a batch.

## Solution

The admin UI now stores selected ready items as stable objects in `selectedItemsById`.
Totals are calculated from the selected objects, not from the currently visible search results.

A Selected Items panel was added so admins can always see the selected items even after changing search terms.
Admins can clear the full selection from the panel.

## Problem 8

The UI mentioned adding tracking details, but the database only had `sheinOrderReference`.
There was no real tracking number, carrier, or tracking URL stored on the batch.

## Solution

Added real tracking fields to `SheinBatch`:

- `trackingNumber`
- `trackingCarrier`
- `trackingUrl`

Added migration:

`apps/api/prisma/migrations/20260629130000_add_shein_batch_tracking_fields/migration.sql`

The create and update SHEIN Batch APIs now accept these fields.
The admin UI now supports entering tracking details during batch creation and editing tracking details later from the Batch Summary tab.

Batch search now also searches tracking number and carrier.

## After pulling this version

Run:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```
