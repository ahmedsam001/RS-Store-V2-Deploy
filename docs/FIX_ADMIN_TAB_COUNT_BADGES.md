# Fix Admin Tab Count Badges

## Goal

Make the admin screens easier to scan by showing live count badges on operational tabs.

Admins can now see where work is waiting before opening a tab.

## Updated screens

### Payments Review

Tabs now show queue counts from `GET /admin/reports`:

- Deposit Review
- Final Payment Review
- Cash Final Review
- Rejected Deposits
- Rejected Final Payments

### Orders

Workflow tabs now show counts from `GET /admin/reports`:

- Ready For SHEIN Batch
- In SHEIN Batch
- Waiting Final Payment
- Ready To Deliver
- Completed
- Cancelled

### SHEIN Batches

Stage tabs now show batch counts from `GET /admin/reports`:

- Collecting
- Ordered From SHEIN
- In Shipping
- Arrived Shop
- Completed
- Cancelled

The `In Shipping` badge includes `SHIPPING`, `CUSTOMS`, and `ARRIVED_EGYPT`.

The `Arrived Shop` badge includes `ARRIVED_STORE` and `READY_FOR_PICKUP`.

### Batch Details

Simplified detail tabs also show contextual counts:

- Overview shows timeline event count
- Orders shows customer order count
- Tracking shows item count
- Delivery shows actionable waiting or ready deliveries
- Notes shows 1 when notes exist

## Technical notes

- Added shared `AdminCountBadge` UI component
- Reused existing `adminApi.reports()` endpoint
- No database migration
- No backend API change
- Counts refresh on page load and after successful admin actions
