# Phase 9 Reports

## Goal

Add a simple admin reporting layer that gives the store owner a clear overview of money, orders, and SHEIN batches without adding database migrations or changing the customer workflow.

## New Admin Page

A new admin page was added:

```txt
/admin/reports
```

The sidebar now includes:

```txt
Reports
```

## Backend Endpoint

A new admin endpoint was added:

```txt
GET /admin/reports
```

This endpoint is protected by the existing admin guards and returns operational summaries only for ADMIN and OWNER users.

## Report Sections

### Money Summary

The reports page shows:

```txt
SHEIN Total SAR
SHEIN Total EGP
Customers Paid EGP
Customers Remaining EGP
```

The SHEIN totals use active non-cancelled batches.

The customer paid amount is calculated from:

```txt
depositPaidAmount + finalPaidAmount
```

The customer remaining amount uses:

```txt
remainingAmount
```

## Batch Reports

The page shows:

```txt
Total batches
Open batches
Completed batches
Cancelled batches
```

It also shows batch status breakdown with:

```txt
Status
Count
Total SAR
Total EGP
```

Open batches list displays each batch with:

```txt
Batch code
Status
Orders count
Items count
Pieces count
Total SAR
Total EGP
Updated date
```

## Order Reports

The page shows:

```txt
Total orders
Active orders
Completed orders
Cancelled orders
Ready for batch
In batch
Waiting final payment
Ready to deliver
```

It also shows payment status breakdown with:

```txt
Payment status
Count
Paid EGP
Remaining EGP
```

## Payment Review Queue

A small queue section was added for quick access to:

```txt
Deposit review
Final payment review
Cash final review
Open SHEIN batches
```

## Design Approach

The design follows the same admin UI language already used in the project:

```txt
Simple metric cards
Clear status badges
Small tables
Quick action links
Mobile friendly layout
```

No charts were added in this phase to keep the interface simple and easy for non-technical admins.

## Files Changed

```txt
apps/api/src/modules/admin/admin.controller.ts
apps/api/src/modules/admin/admin.service.ts
apps/api/dist/modules/admin/admin.controller.js
apps/api/dist/modules/admin/admin.controller.d.ts
apps/api/dist/modules/admin/admin.service.js
apps/api/dist/modules/admin/admin.service.d.ts
apps/web/src/features/admin/pages/AdminDashboardPage.tsx
apps/web/src/features/admin/pages/AdminReportsPage.tsx
apps/web/src/features/admin/api/admin-api.ts
apps/web/src/routes/admin/admin-routes.tsx
apps/web/src/shared/constants/routes.ts
apps/web/src/features/admin/navigation/admin-navigation.ts
docs/PHASE_9_REPORTS.md
```

## Database Migration

No database migration was added in Phase 9.

All reports are calculated from the current existing data models:

```txt
Order
OrderItem
OrderPaymentProof
SheinBatch
SheinBatchItem
```
