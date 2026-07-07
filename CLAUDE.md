# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Flowboard** is a real-time collaborative kanban board for small teams. It's a personal
learning/portfolio project focused on three things: a real-time Node.js backend deployed
on AWS (EC2 + RDS PostgreSQL), safe handling of concurrent writes (two people moving the
same card at once), and disciplined automated testing on both front-end and back-end.

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4
- **Backend:** Node.js (Express or Fastify) with a `ws`/Socket.io WebSocket server,
  deployed on AWS EC2 (or Elastic Beanstalk on top of EC2)
- **Database:** PostgreSQL via Amazon RDS, accessed through Prisma (schema, migrations,
  generated types)
- **Concurrency control:** optimistic locking with a `version` column
  (`UPDATE ... WHERE id = $1 AND version = $2`) — no last-write-wins on card moves
- **Infra as code:** AWS CDK (TypeScript, same language as the app) — provisions the
  EC2/Elastic Beanstalk environment and the RDS instance
- **Testing:**
  - Frontend: Vitest + Testing Library (unit/component), Playwright (E2E)
  - Backend: integration tests against the Express/Fastify routes + a real Postgres
    instance (Docker locally, RDS in CI)
  - Real-time-specific: Playwright tests using **two simultaneous browser contexts** to
    verify that an action from "user A" propagates live to "user B" without a refresh

- **Auth:** JWT issued on login, stored in an httpOnly, Secure, SameSite=Lax cookie
(not localStorage/Authorization header). REST middleware and the WebSocket
handshake both read the JWT from this cookie. Requires frontend and backend to
share a registrable domain (e.g. app.flowboard.dev / api.flowboard.dev) — see
Open Decision #2 (frontend hosting).

## Architecture (real-time flow)

```
Browser (persistent WebSocket connection)
  ↕
Node.js server — Express/Fastify + ws/Socket.io (running on EC2)
  ↕
PostgreSQL (Amazon RDS), via Prisma
```

- The Node process holds an in-memory map of `boardId → connected sockets`. When a card
  moves: the client sends the change → the server validates it and writes to Postgres
  using an optimistic-concurrency `UPDATE ... WHERE version = $N` → the server broadcasts
  the update directly to every other socket already subscribed to that board. There's no
  separate connection-tracking table needed (unlike the API Gateway WebSocket model)
  because the server itself owns the sockets.
- Non-real-time operations (auth, board CRUD, user management) can go through the same
  Express/Fastify app as regular REST routes — only card/board state changes need to go
  over the WebSocket path.
- **Known next-level limitation (fine for a single-instance MVP, worth knowing):** if this
  ever runs as more than one server instance behind a load balancer, broadcasts need a
  shared relay (e.g. Redis Pub/Sub via ElastiCache) so an update received by instance A
  reaches clients connected to instance B. Not needed until/unless the project scales
  past one instance.

## Repository structure

Monorepo using npm workspaces:

```
flowboard/
├── CLAUDE.md
├── package.json              # root — defines the workspaces
├── tsconfig.base.json        # shared TS config
├── skill/
├── apps/
│   ├── web/                  # Next.js frontend (App Router, Tailwind v4)
│   └── server/                # Node.js backend: Express/Fastify + ws/Socket.io,
│                               # Prisma schema + migrations live here
├── infra/
│   ├── bin/                   # CDK entrypoint
│   └── lib/                   # CDK stacks: EC2/Elastic Beanstalk env, RDS instance,
│                               # VPC/security groups
├── packages/
│   └── shared/                 # TS types + Zod schemas for the WebSocket message
│                                # contract, shared by apps/web and apps/server
└── e2e/                         # Playwright specs
```

`packages/shared` exists specifically so the frontend and the backend can't silently
drift on the shape of the WebSocket messages: both import the same types (and ideally a
Zod schema validated at runtime on the server), so a breaking change to the message
format fails the build on both sides immediately instead of surfacing as a live bug.

## Conventions

- TypeScript strict mode on.
- Default to Server Components in the App Router; use Client Components only where
  interactivity/state is required (drag-and-drop, the WebSocket connection itself).
- Tailwind v4: use the CSS-first config (`@theme` in `globals.css`); avoid legacy
  `tailwind.config.js` patterns unless there's a concrete reason to.
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Never commit AWS credentials — use environment variables / a local AWS profile.

## Local development

- Run PostgreSQL locally via Docker (`docker compose up db`) — no need to touch real AWS
  for day-to-day development.
- Run `apps/server` directly with `npm run dev` (Express/Fastify + WebSocket server on a
  local port); `apps/web` points at it via an env var (`NEXT_PUBLIC_WS_URL`,
  `NEXT_PUBLIC_API_URL`).
- Deploy via `cdk deploy` from `/infra` when testing against real AWS infrastructure
  (EC2/Elastic Beanstalk + RDS). Both are within the AWS Free Tier for a project at this
  scale — check the "Free Tier" widget in the AWS console, since the exact free-tier
  terms depend on when the AWS account was created.

## The skill workflow system

This repo vendors the `skill/using-superpowers` workflow system — if a skill has any
plausible relevance to the current task, it must be invoked before any other action,
including exploring the codebase or asking clarifying questions. Process skills take
priority over implementation skills:

- **New feature / creative work** → `skill/brainstorming` first, then implementation.
- **Bug / unexpected behavior** → `skill/systematic-debugging` first, before proposing a fix.
- **Any feature or bugfix implementation** → `skill/test-driven-development` before writing code.
  This matters especially for anything touching the optimistic-concurrency logic on card
  moves (the `version`-column `UPDATE`) — that's exactly the kind of concurrency bug
  that's easy to introduce and hard to catch without a test written first.
- **Multi-step work** → `skill/writing-plans` to produce the plan, then
  `skill/executing-plans` (or `skill/subagent-driven-development` for independent tasks)
  to carry it out.
- **Before claiming anything is done/fixed/passing** → `skill/verification-before-completion`
  requires running and showing the test output first — for this project that means both
  `npm test` (unit/component) and the Playwright E2E suite, since a real-time bug can look
  fine in a unit test and still break the moment two clients are connected at once.
- **Wrapping up** → `skill/finishing-a-development-branch`.

### Skills most relevant to this stack

- `nextjs-developer` — App Router, RSC, server actions
- `tailwindcss-v4` — CSS-first config conventions
- `frontend-testing` — Vitest + RTL, Playwright (including multi-context E2E patterns)
- `backend-testing` — Node API routes + Postgres integration tests (direct fit for
  `apps/server`)
- `typescript/boy-scout` — triggers on any TS edit, delegates to the `clean-*` skills
- `conventional-commit` — commit message format
- `sql-optimization` — query/index tuning for the Postgres schema (boards, cards, users)