# Phase 3 Create SHEIN Batch

## Goal

Make SHEIN batch creation match the real admin workflow.

The admin collects approved-deposit customer order items together and creates one internal SHEIN purchase batch.
Customer orders remain separate. The batch is only an internal grouping used to purchase from SHEIN and track the big shipment.

## Admin UI Changes

### SHEIN Batches page

The page now starts with a simple Create Batch flow.

1. Enter batch title
2. Enter optional SHEIN reference
3. Enter SAR to EGP exchange rate
4. Select ready items
5. Enter unit SAR price for selected items
6. Review totals
7. Create batch

The admin sees live totals before creation:

- Selected customer orders count
- Selected pieces count
- Total SAR
- Total EGP

Each existing batch card now clearly shows:

- Total pieces
- Total SAR
- Total EGP
- Collection date
- Current status

## Backend Changes

`POST /shein-batches` now accepts optional `items`.

Example body:

```json
{
  "title": "June first SHEIN order",
  "exchangeRateSarToEgp": "13.00",
  "items": [
    {
      "orderItemId": "uuid",
      "unitSarAmount": "45.50"
    }
  ]
}
```

The backend creates the batch and attaches selected items in one transaction.

## Validation Rules

Only order items from approved-deposit orders can be added to a SHEIN batch.

Blocked cases:

- Deposit is not approved
- Order is cancelled
- Order is completed
- Order item is cancelled
- Order item already exists in another active SHEIN batch

## Totals

The batch stores totals in both currencies:

- `totalSarAmount`
- `exchangeRateSarToEgp`
- `totalEgpAmount`

Amounts are stored in minor units.
The exchange rate is saved on the batch so old batches remain financially stable even if the rate changes later.

## No Migration

This phase does not add database columns.
It uses the existing SHEIN batch and SHEIN batch item tables.
