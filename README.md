# Flowboard

Real-time collaborative kanban board for small teams. A personal learning/portfolio
project focused on three things:

- A real-time Node.js backend deployed on AWS (EC2 + RDS PostgreSQL)
- Safe handling of concurrent writes (two people moving the same card at once) via
  optimistic locking on a `version` column
- Disciplined automated testing on both the frontend and backend

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4
- **Backend:** Node.js (Express/Fastify) + WebSocket server, deployed on AWS EC2
- **Database:** PostgreSQL via Amazon RDS, accessed through Prisma
- **Infra:** AWS CDK (TypeScript)
- **Testing:** Vitest + Testing Library, Playwright (including two-browser-context
  real-time tests), backend integration tests against a real Postgres instance

## Repository structure

- `apps/web` — Next.js frontend
- `apps/server` — Node.js backend (REST + WebSocket)
- `packages/shared` — Shared TS types + Zod schemas for the WebSocket message contract
- `infra` — AWS CDK stacks
- `e2e` — Playwright end-to-end specs

## Local development

> Status: bootstrap only. This section grows as each phase in
> `docs/2026-07-07-flowboard-roadmap.md` lands; full setup + deploy instructions are a
> Phase 10 deliverable.

```bash
npm install
docker compose up db   # local Postgres
```

See `CLAUDE.md` for full project conventions and architecture.
