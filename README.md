# صَون (Sawn) — Smart Salary Wallet

صَون is an Arabic-first, RTL-ready salary wallet for controlled spending periods, savings goals, family budgets, analytics, and AI recommendations. This monorepo contains a Flutter app, a TypeScript Express API, Supabase PostgreSQL migrations with RLS, workers, Docker, CI/CD, deployment templates, API docs, tests, and seed data.

## Architecture

- `apps/mobile`: Flutter 3 clean architecture application using Riverpod, GoRouter, Hive, secure storage, local auth, notifications, charts, PDF exports, and Material 3.
- `services/api`: Node.js 20 + Express 5 + TypeScript API using Supabase, Redis, BullMQ, Zod, Winston, Swagger, JWT middleware, and centralized errors.
- `supabase`: PostgreSQL schema, RLS policies, triggers, indexes, audit logging, seed data, and rollback migration.
- `deploy`: Railway and Render definitions.
- `scripts/ci.sh`: non-GitHub CI entrypoint for local, self-hosted, GitLab, Jenkins, Bitbucket, Railway, Render, or private runners.

## Quick start

```bash
cp services/api/.env.example services/api/.env
cp apps/mobile/.env.example apps/mobile/.env
docker compose up --build
```

This project is standalone and does not require a GitHub repository. Run `./scripts/ci.sh` or `make ci` for CI checks on any runner.

API: http://localhost:8080/api/v1/health
Swagger: http://localhost:8080/docs

## Local development

### Backend
```bash
cd services/api
npm install
npm run dev
npm test
npm run build
```

### Mobile
```bash
cd apps/mobile
flutter pub get
flutter test
flutter run
```

## Database

Apply `supabase/migrations/001_init.sql` to a Supabase project. Load `supabase/seed/001_seed.sql` for demo data. Roll back with `supabase/rollbacks/001_init_down.sql`.

## Security

Sawn implements JWT auth, RLS, rate limiting, Helmet security headers, request validation, PIN hashing, audit logs, secure storage, and least-privilege database policies.
