# Flowboard

Real-time collaborative kanban board for small teams. A personal learning/portfolio
project focused on three things:

- A real-time Node.js backend deployed on AWS (EC2 + RDS PostgreSQL)
- Safe handling of concurrent writes (two people moving the same card at once) via
  optimistic locking on a `version` column
- Disciplined automated testing on both the frontend and backend

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4
- **Backend:** Node.js (Fastify) + WebSocket server, deployed on AWS EC2
- **Database:** PostgreSQL via Amazon RDS, accessed through Prisma
- **Infra:** AWS CDK (TypeScript)
- **Testing:** Vitest + Testing Library, Playwright (including two-browser-context
  real-time tests), backend integration tests against a real Postgres instance

## Repository structure

- `apps/web` — Next.js frontend
- `apps/server` — Node.js backend (Fastify REST API + WebSocket, Prisma schema/migrations)
- `packages/shared` — Shared TS types + Zod schemas for the WebSocket message contract
- `infra` — AWS CDK stacks
- `e2e` — Playwright end-to-end specs

See `CLAUDE.md` for full project conventions and architecture, and
`docs/2026-07-07-flowboard-roadmap.md` for the phased build plan and current status.

## Status

Phases 0–3 are done: monorepo bootstrap, the shared WebSocket message contract, the
Postgres/Prisma schema, and a Fastify REST API (auth, Board CRUD, Card CRUD). The
WebSocket layer with optimistic-concurrency card moves (Phase 4) is next — see the
roadmap for the full plan.

## Prerequisites

- Node.js >= 20
- Docker (for local Postgres)

## Setup

```bash
npm install
docker compose up -d db
```

This starts a local Postgres container (`flowboard-db`) and creates two databases on
first boot: `flowboard` (dev) and `flowboard_test` (used only by the automated test
suite).

### Environment variables

`apps/server` reads its config from `apps/server/.env` (gitignored — create it
yourself, it's not committed):

```bash
DATABASE_URL="postgresql://flowboard:flowboard@localhost:5432/flowboard?schema=public"
JWT_SECRET="pick-any-long-random-string-for-local-dev"
```

A separate `apps/server/.env.test` (same shape, pointing at `flowboard_test`) is used
automatically when running tests — see `docs/Phase2-tests.md` if you need to recreate
it.

### Database migrations & seed data

```bash
cd apps/server
npm run prisma:migrate:deploy   # apply migrations to the dev database
npm run prisma:seed             # optional: creates a demo user/board/columns/card
```

## Running the app

```bash
cd apps/server
npm run dev
```

Starts the Fastify server on `http://localhost:4000` (override with `PORT`). There's no
frontend yet (`apps/web` lands in Phase 5), so the backend is exercised directly via its
REST API for now.

## Trying out the API

A full walkthrough with `curl` (cookies are used to carry the JWT, so keep a cookie jar
across requests):

```bash
# 1. Sign up — creates the user and sets the auth cookie
curl -i -c cookies.txt -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","name":"Your Name","password":"correct-horse"}'

# 2. Log in (if you already have an account)
curl -i -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"correct-horse"}'

# 3. Create a board — auto-creates Todo/Doing/Done columns
curl -b cookies.txt -X POST http://localhost:4000/boards \
  -H "Content-Type: application/json" \
  -d '{"name":"Sprint 1"}'

# 4. List your boards
curl -b cookies.txt http://localhost:4000/boards

# 5. Create a card in a column (use a real boardId/columnId from step 3's response)
curl -b cookies.txt -X POST http://localhost:4000/boards/<boardId>/columns/<columnId>/cards \
  -H "Content-Type: application/json" \
  -d '{"title":"Set up CI"}'

# 6. Rename or delete
curl -b cookies.txt -X PATCH http://localhost:4000/cards/<cardId> \
  -H "Content-Type: application/json" -d '{"title":"Set up CI/CD"}'
curl -b cookies.txt -X DELETE http://localhost:4000/cards/<cardId>
```

Boards and cards are scoped to their owner: requests from a different authenticated user
(or with no cookie at all) get `404`/`401` rather than someone else's data.

| Route                                           | Auth required | Notes                                                 |
| ----------------------------------------------- | ------------- | ----------------------------------------------------- |
| `GET /health`                                   | no            | liveness check                                        |
| `POST /auth/signup`                             | no            | bcrypt-hashed password, sets `token` cookie           |
| `POST /auth/login`                              | no            | sets `token` cookie                                   |
| `POST /boards`                                  | yes           | creates board + default Todo/Doing/Done columns       |
| `GET /boards`                                   | yes           | lists boards owned by the caller                      |
| `GET /boards/:id`                               | yes           | 404 if not the owner                                  |
| `PATCH /boards/:id`                             | yes           | rename                                                |
| `DELETE /boards/:id`                            | yes           | cascades to its columns/cards                         |
| `POST /boards/:boardId/columns/:columnId/cards` | yes           | appends a card to the column                          |
| `PATCH /cards/:id`                              | yes           | rename/update description (not move — that's Phase 4) |
| `DELETE /cards/:id`                             | yes           |                                                       |

## Testing

```bash
npm test                               # every workspace: packages/shared + apps/server
npm run build                          # tsc --noEmit across all workspaces
npm run lint
npm run format:check
```

`apps/server`'s test command applies pending Prisma migrations to `flowboard_test`
first, then runs Vitest integration tests against that real database (no mocking) —
covering the Prisma schema, auth, and the Board/Card REST routes, including
cross-user authorization checks. `packages/shared` has unit tests for every WebSocket
message schema (accept + reject cases).

Playwright E2E tests (including the two-browser-context real-time checks) land in
Phase 8, once the frontend and WebSocket layer exist.

## Deploying

Via `cdk deploy` from `/infra` once the CDK stacks exist (Phase 9) — provisions
EC2/Elastic Beanstalk + RDS. Both fit in the AWS Free Tier for a project at this scale.
Not available yet.
