# Fix Admin Reports Prisma groupBy TypeScript Errors

## Problem

`apps/api/src/modules/admin/admin.service.ts` failed TypeScript compilation because Prisma `groupBy` calls were missing explicit `orderBy` fields and strict TypeScript treated `_count` and `_sum` as optional or union values.

Affected report queries:

- `sheinBatch.groupBy({ by: ['status'] })`
- `order.groupBy({ by: ['status'] })`
- `order.groupBy({ by: ['paymentStatus'] })`

## Fix

Added explicit `orderBy` to every groupBy call:

- `orderBy: { status: 'asc' }`
- `orderBy: { paymentStatus: 'asc' }`

Added a safe count helper:

```ts
const getAggregateCount = (value) => { ... }
```

Updated report mapping to safely read aggregate values:

- `getAggregateCount(row?._count)`
- `row?._sum?.totalAmount ?? 0`
- `row?._sum?.remainingAmount ?? 0`

## Files changed

- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/dist/modules/admin/admin.service.js`

## Notes

The separate error below is not caused by this code change:

```txt
Authentication failed against database server, the provided database credentials for `postgres` are not valid
```

That means the database connection environment variables do not match the running PostgreSQL credentials. Check `DATABASE_URL`, Docker Compose database username, password, database name, and container state.
