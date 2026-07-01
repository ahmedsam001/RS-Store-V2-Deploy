# Fix SHEIN Batch Create Wizard UI

## Problem

The admin SHEIN Batches page was too crowded because it included batch creation, ready item search, selected item totals, stage filters, batch search, batch list, and batch details in one screen.

This made the page harder for admins to understand and increased the risk of creating a batch with incorrect totals while searching and selecting items.

## Solution

Batch creation is now separated into its own page:

```txt
/admin/shein-batches/new
```

The main SHEIN Batches page now focuses on viewing and tracking existing batches.

## Main SHEIN Batches Page

The page now includes:

```txt
Create New Batch button
Stage tabs
Search existing batches
Batch list
Optional selected batch details after the admin opens a batch
```

It no longer includes:

```txt
Create batch form
Ready items search
Selected items drawer
SAR price entry
Inline batch creation flow
```

## Create New Batch Wizard

The new page uses four clear steps:

```txt
Step 1 Select ready items
Step 2 Enter SAR prices
Step 3 Review SAR EGP totals
Step 4 Create batch
```

## Selected Items Stability

Selected items are stored as full objects, not only IDs. This keeps totals correct even when the admin searches for different ready items during the wizard.

The wizard includes a persistent Selected Items panel with:

```txt
Selected products
Customer order number
Customer name
Quantity
Unit SAR
Line SAR
Line EGP
Total SAR
Total EGP
Clear Selection
```

## Validation

The admin cannot move to the review step or create the batch unless:

```txt
At least one item is selected
Every selected item has Unit SAR greater than zero
SAR to EGP exchange rate is greater than zero
```

## Files Changed

```txt
apps/web/src/features/admin/pages/AdminSheinBatchesPage.tsx
apps/web/src/features/admin/pages/AdminSheinBatchCreatePage.tsx
apps/web/src/routes/admin/admin-routes.tsx
apps/web/src/shared/constants/routes.ts
docs/FIX_SHEIN_BATCH_CREATE_WIZARD_UI.md
```

## No Backend Migration

This is a UI and routing improvement only. No database migration is required.
