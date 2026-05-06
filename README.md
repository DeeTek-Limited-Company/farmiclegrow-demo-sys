# FarmicleGrow Platform Foundation

This repository contains the Phase 1 foundation for FarmicleGrow:
- Next.js (App Router, TypeScript)
- PostgreSQL
- Prisma ORM
- ESLint + Prettier
- GitHub Actions CI
- JWT-based authentication + RBAC for internal roles

## Prerequisites

- Node.js 20+
- Docker Desktop (for local PostgreSQL)

## Local setup

1. Install dependencies:
   - `npm install`
2. Copy environment values:
   - `copy .env.example .env` (Windows)
   - `cp .env.example .env` (macOS/Linux)
3. Start PostgreSQL:
   - `npm run db:up`
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Run initial migration:
   - `npm run prisma:migrate`
6. Seed default roles/admin account:
   - `npm run prisma:seed`
7. Start development server:
   - `npm run dev`

Open [http://localhost:3000](http://localhost:3000).

## Common scripts

- `npm run lint` - ESLint checks
- `npm run typecheck` - TypeScript checks
- `npm run format` - Prettier check
- `npm run format:write` - Prettier auto-fix
- `npm run build` - production build
- `npm run prisma:studio` - open Prisma Studio
- `npm run prisma:seed` - seed admin/agronomist/ops roles and default admin user

## Auth and role access

- Login endpoint: `POST /api/auth/login`
- Logout endpoint: `POST /api/auth/logout`
- Protected role routes:
  - `/admin` -> `admin`
  - `/agronomist` -> `admin` or `agronomist`
  - `/ops` -> `admin` or `ops`
- Required env var: `AUTH_SECRET` (used to sign JWT sessions)

## CI

GitHub Actions CI workflow runs on push/PR:
- install dependencies
- generate + validate Prisma schema
- lint
- typecheck
- build
