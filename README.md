# RS Store V2 Foundation

Production grade monorepo foundation for RS Store V2

## Stack

Frontend React TypeScript Vite Tailwind shadcn/ui
Backend NestJS Prisma PostgreSQL Cloudinary
Infrastructure Docker Docker Compose

## Local setup

1 Copy environment file

```bash
cp .env.example .env
```

2 Install dependencies

```bash
npm install
```

3 Generate Prisma client

```bash
npm run db:generate
```

4 Start PostgreSQL and services with Docker

```bash
npm run docker:up
```

5 Validate the foundation

```bash
npm run typecheck
npm run lint
npm run build
```

## Workspace commands

```bash
npm run build -w @rs-store/api
npm run build -w @rs-store/web
npm run db:push -w @rs-store/api
```

## Architecture boundaries

- `domain` contains enterprise concepts only
- `application` contains orchestration boundaries only
- `infrastructure` contains external systems such as PostgreSQL Prisma and Cloudinary
- `interfaces` contains HTTP adapters only
- no feature module contains business behavior in this foundation

## Authentication implementation

Authentication V2 uses secure server side sessions with V1 compatible customer phone login and admin password login.

- Customer login: `POST /api/v1/auth/customer/login`
- Admin login: `POST /api/v1/auth/admin/login`
- V1 compatible login alias: `POST /api/v1/auth/login`
- Current profile: `GET /api/v1/auth/me`
- Logout: `POST /api/v1/auth/logout`
- Profile update: `PATCH /api/v1/auth/profile`

Session tokens are stored in HttpOnly cookies and only SHA256 hashes are persisted in PostgreSQL. CSRF uses the V1 compatible double submit pattern with `rs_csrf` cookie and `X-CSRF-Token` header.
