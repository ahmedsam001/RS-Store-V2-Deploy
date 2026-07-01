# Project Status

## Latest verified package

This package includes SHEIN Batch cycles 1 to 5 and cleanup after testing.

## Test results

The web workspace was installed and verified with:

```bash
npm ci --ignore-scripts
npm run typecheck -w @rs-store/web
npm run build -w @rs-store/web
npm run lint -w @rs-store/web
```

Result:

- Web typecheck passed
- Web production build passed
- Web lint passed with warnings only

API lint for the touched backend modules was also checked:

```bash
npm run lint -w @rs-store/api -- src/modules/shein-batches src/modules/orders
```

Result:

- API lint for touched modules passed

## Prisma note

`prisma generate` and `prisma validate` could not complete in the sandbox because Prisma tried to download engines from `binaries.prisma.sh` and the environment has no internet access.

Run these commands locally after extracting the package:

```bash
npm ci
npm run db:generate
npm run db:validate
npm run db:deploy
npm run typecheck --workspaces
npm run build --workspaces
```

## Fixes applied during test

- Fixed duplicate `CUSTOMS` key in admin status labels
- Removed stale `apps/web/vite.config.js` because the project uses `vite.config.ts`
- Fixed unused `mode` prop lint error in `SmartLoginPage`
- Added unit SAR input in the SHEIN batch admin item picker
- Updating a batch exchange rate now refreshes item EGP totals for SAR priced items
- Available order items now exclude cancelled items cancelled orders and orders without an approved deposit
- Creating a batch with terminal status now receives the correct terminal timestamp through the status timestamp patch

## Documentation cleanup

Old cycle specific markdown reports were removed and replaced by this status file plus the consolidated SHEIN batch documentation.
