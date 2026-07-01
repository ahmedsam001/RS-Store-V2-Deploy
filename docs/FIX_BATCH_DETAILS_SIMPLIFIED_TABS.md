# Fix Batch Details Simplified Tabs

## Goal

Reduce the SHEIN Batch details complexity for admin users.

The previous details area had seven tabs:

- Summary
- Orders
- Items Tracking
- Payments
- Distribution
- Timeline
- Notes

This was technically complete but too heavy for day to day admin use.

## New tabs

The details area now has five tabs only:

- Overview
- Orders
- Tracking
- Delivery
- Notes

## Changes

### Overview

Overview now contains the main batch information, tracking details form, batch status update form, and a compact Timeline section at the bottom.

Timeline is no longer a separate top level tab.

### Orders

Orders now contains customer order cards and the payment totals that were previously in the Payments tab.

This keeps customer orders and their paid remaining balances in one place.

### Tracking

Tracking replaces Items Tracking.

It still shows every product in the batch and allows individual item status exceptions when allowed.

### Delivery

Delivery replaces Distribution.

It keeps the customer delivery workflow but uses simpler wording.

### Notes

Notes remains separate because it is an admin only editable area.

## Database changes

No database migration is required.

This is a UI and UX cleanup only.
