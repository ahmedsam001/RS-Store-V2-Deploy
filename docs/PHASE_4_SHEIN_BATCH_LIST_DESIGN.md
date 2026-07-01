# Phase 4 - SHEIN Batch List Design

## Goal

Make the admin SHEIN Batches page easier to understand and faster to use.

The page now focuses on batch stages instead of showing all batches in one technical list.

## What changed

### 1. Batch stage tabs

The SHEIN Batches page now has clear stage tabs:

- Collecting
- Ordered From SHEIN
- In Shipping
- Arrived Shop
- Completed
- Cancelled

Each tab represents a business stage and loads its data from the backend using `statusGroup`.

### 2. Backend status group filter

Added query support:

```txt
GET /shein-batches?statusGroup=COLLECTING
GET /shein-batches?statusGroup=ORDERED
GET /shein-batches?statusGroup=IN_SHIPPING
GET /shein-batches?statusGroup=ARRIVED_SHOP
GET /shein-batches?statusGroup=COMPLETED
GET /shein-batches?statusGroup=CANCELLED
```

Status group mapping:

```txt
COLLECTING    -> DRAFT
ORDERED       -> ORDERED_FROM_SHEIN
IN_SHIPPING   -> SHIPPING CUSTOMS ARRIVED_EGYPT
ARRIVED_SHOP  -> ARRIVED_STORE READY_FOR_PICKUP
COMPLETED     -> DELIVERED
CANCELLED     -> CANCELLED
```

The old exact status filter is still supported using `status`.

### 3. Batch cards are easier

Each batch card now shows:

- Batch code
- Batch title
- Current status
- Orders count
- Pieces count
- Total SAR
- Total EGP
- Collection date
- Next action

This helps the admin understand what to do without opening every batch.

### 4. Real order count in list API

The list API now returns:

```txt
orderCount
itemsCount
```

`orderCount` is calculated from unique customer orders inside the batch.

### 5. Selected batch details improved

The selected batch details now start with:

- Next Action
- Progress steps
- Summary totals
- Status update form

The progress steps are:

```txt
Collecting -> Ordered From SHEIN -> In shipping -> In customs -> Arrived shop -> Ready for pickup -> Completed
```

### 6. SAR and EGP totals are kept visible

Both batch cards and batch details show:

```txt
Total SAR
Total EGP
Exchange rate
```

This keeps the SHEIN cost and Egyptian equivalent clear for every batch.

## Files changed

```txt
apps/web/src/features/admin/pages/AdminSheinBatchesPage.tsx
apps/web/src/features/admin/api/admin-api.ts
apps/api/src/modules/shein-batches/dto/shein-batches-query.dto.ts
apps/api/src/modules/shein-batches/shein-batches.service.ts
apps/api/dist/modules/shein-batches/dto/shein-batches-query.dto.js
apps/api/dist/modules/shein-batches/dto/shein-batches-query.dto.d.ts
apps/api/dist/modules/shein-batches/shein-batches.service.js
```

## Notes

No database migration was added in this phase.
