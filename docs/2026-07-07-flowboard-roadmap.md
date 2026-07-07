## Status
- [x] Phase 0 — Repo & Monorepo Bootstrap (done, commit abc1234)
- [x] Phase 1 — packages/shared (done)


> **For agentic workers:** This is an INDEX/ROADMAP document, not a bite-sized execution
> plan. The project spans multiple independent subsystems (monorepo scaffold, DB, REST
> API, WebSocket/concurrency core, frontend UI, auth, E2E, AWS infra). Per
> `superpowers:writing-plans` scope-check guidance, each phase below gets its own
> detailed bite-sized plan (with real code, real commands, TDD steps) generated with
> `superpowers:writing-plans` **when that phase starts** — do not attempt to execute
> straight from this document.

**Goal:** Build Flowboard — a real-time collaborative kanban board — from an empty
directory to a deployed, tested MVP on AWS, per `CLAUDE.md`.

**Architecture:** Next.js (App Router) frontend talks to a Node.js (Express/Fastify)
backend over REST (CRUD) and a persistent WebSocket (card/board live state). Postgres
via RDS/Prisma is the source of truth; concurrent card moves are protected with
optimistic locking on a `version` column. `packages/shared` pins the WS message contract
(TS types + Zod) so frontend/backend can't silently drift.

**Tech Stack:** Next.js, TypeScript (strict), Tailwind v4, Node.js + Express/Fastify,
ws/Socket.io, PostgreSQL (RDS) + Prisma, AWS CDK, Vitest + Testing Library, Playwright.

**Auth:** JWT issued on login, stored in an httpOnly, Secure, SameSite=Lax cookie
(not localStorage/Authorization header). REST middleware and the WebSocket
handshake both read the JWT from this cookie. Requires frontend and backend to
share a registrable domain (e.g. app.flowboard.dev / api.flowboard.dev) — see
Open Decision #2 (frontend hosting).

## Global Constraints

- TypeScript strict mode everywhere.
- No last-write-wins on card moves — every move goes through
  `UPDATE ... WHERE id = $1 AND version = $2`.
- WS message shapes are defined once in `packages/shared` and imported by both apps —
  never duplicated.
- Tailwind v4 CSS-first config (`@theme` in `globals.css`) — no `tailwind.config.js`.
- Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`) on every commit.
- Never commit AWS credentials.
- Server Components by default; Client Components only for interactivity (DnD, the
  socket connection).
- Every phase ends with its own passing test suite before moving to the next phase.

## Open Decisions (flag before the relevant phase — don't guess silently)

1. **Auth mechanism** (needed before Phase 3): CLAUDE.md doesn't pin this down, and the
   backend is a standalone Node process (not Next.js Route Handlers), so the
   `nextjs-auth`/Auth.js pattern doesn't map 1:1. Default assumption for planning: backend
   issues a JWT on login (bcrypt-hashed passwords in Postgres), REST routes verify it via
   middleware, and the WebSocket handshake verifies the same JWT on `connect`. Confirm or
   override before Phase 3's detailed plan is written.
2. **Frontend hosting** (needed before Phase 9): CLAUDE.md's CDK section only describes
   provisioning EC2/Elastic Beanstalk + RDS for the backend. Default assumption: deploy
   `apps/web` to Vercel (simplest for a Next.js portfolio project) and keep CDK scoped to
   backend + DB, OR fold a static/SSR frontend into the same EC2 box if you want
   everything on AWS for the portfolio story. Confirm before Phase 9.
3. **Drag-and-drop library** (needed before Phase 6): not specified in CLAUDE.md. Default
   assumption: `@dnd-kit`. Swap if you have a preference.

---

## Phase 0 — Repo & Monorepo Bootstrap

Turn the empty directory into a working npm-workspaces monorepo skeleton.

- Init git repo, `.gitignore`, root `README.md`
- Root `package.json` declaring workspaces: `apps/*`, `packages/*`
- `tsconfig.base.json` (strict mode) referenced by every workspace
- Shared ESLint + Prettier config
- `docker-compose.yml` for local Postgres (matches "Local development" in CLAUDE.md)
- Husky + lint-staged wired to Conventional Commits (`conventional-commit` skill)
- Empty-but-wired placeholders for `apps/web`, `apps/server`, `packages/shared`,
  `infra`, `e2e` (just enough `package.json`/`tsconfig.json` per workspace for
  `npm install` to succeed from root)

**Depends on:** nothing. **Unblocks:** everything.

## Phase 1 — `packages/shared`: WS message contract

- TS types for `Board`, `Column`, `Card`, `User`
- Zod schemas for every WebSocket message (`card:move`, `card:create`, `card:update`,
  `card:delete`, server→client `board:sync`, `card:conflict`)
- Vitest unit tests validating schema parse/reject behavior

**Depends on:** Phase 0. **Unblocks:** Phases 2–6 (both apps import this package).

## Phase 2 — Database schema & migrations

- Prisma init in `apps/server`
- Schema: `User`, `Board`, `Column`, `Card` — `Card` carries `version Int @default(1)`
- First migration, seed script
- `backend-testing` skill: pick + wire the test-DB isolation strategy (transactional
  rollback per test, or a Dockerized/Testcontainers Postgres) — this decision affects
  every backend test written afterward, so lock it in here

**Depends on:** Phase 0. **Unblocks:** Phase 3, 4.

## Phase 3 — Backend REST API (non-realtime CRUD)

- Express/Fastify app scaffold + health check
- Auth: signup/login routes (see Open Decision #1), bcrypt hashing, JWT issuance
- Board CRUD routes + integration tests
- Card CRUD routes (create/rename/delete — not move) + integration tests

**Depends on:** Phase 1, 2. **Unblocks:** Phase 5, 7.

## Phase 4 — WebSocket layer + optimistic concurrency (core of the project)

This is the part CLAUDE.md calls out as the main technical challenge — plan it with
`test-driven-development` skill discipline, test-first.

- Failing integration test first: two concurrent "move card" attempts on the same card,
  same starting `version` — assert only one succeeds and the loser gets a conflict
  response, not silently overwritten data
- ws/Socket.io server, in-memory `boardId → connected sockets` map
- JWT verification on socket handshake
- Move handler: `UPDATE cards SET column_id=$, position=$, version=version+1
  WHERE id=$1 AND version=$2` — 0 rows affected ⇒ conflict path
- Broadcast successful moves to every other socket subscribed to that board
- Conflict response contract: client refetches authoritative board state

**Depends on:** Phase 1, 2, 3 (JWT). **Unblocks:** Phase 6, 8.

## Phase 5 — Frontend foundation

- Scaffold `apps/web` (Next.js App Router, TS, Tailwind v4 CSS-first `@theme`)
- Server Component pages: board list, board detail shell (fetches via REST from Phase 3)
- Vitest + RTL setup, component tests for both pages

**Depends on:** Phase 3. **Unblocks:** Phase 6, 7.

## Phase 6 — Frontend real-time + drag-and-drop

- Client Component: WebSocket hook using `NEXT_PUBLIC_WS_URL`, validates inbound
  messages against the Phase 1 Zod schemas
- Drag-and-drop card move (Open Decision #3), optimistic local update
- On send: emit `card:move` per the shared contract; on conflict: roll back optimistic
  update and refetch
- On receive: apply remote `board:sync`/`card:*` events from other clients live
- Component tests with a mocked socket, including an explicit optimistic-rollback test

**Depends on:** Phase 1, 4, 5. **Unblocks:** Phase 8.

## Phase 7 — Auth UI & route protection (frontend)

- Login/signup pages calling Phase 3 REST routes
- Session/token storage, middleware-based route protection for board pages
- Component/integration tests

**Depends on:** Phase 3, 5. **Unblocks:** Phase 8.

## Phase 8 — E2E & multi-user real-time tests (Playwright)

- Playwright config + `e2e/` scaffold
- Golden path: login → create board → create card → move card
- **Two-browser-context test:** user A moves a card, assert user B's page updates live
  with no refresh
- **Concurrency test:** two near-simultaneous moves on the same card from two contexts —
  assert no lost update and a visible conflict/resync on the loser

**Depends on:** Phase 4, 6, 7. **Unblocks:** Phase 10 (final verification).

## Phase 9 — AWS infra (CDK) & deployment

- `infra/bin` CDK entrypoint, `infra/lib`: VPC + security groups stack
- RDS Postgres stack (Free Tier sizing)
- EC2/Elastic Beanstalk stack for `apps/server`
- Secrets/env wiring (SSM Parameter Store or Secrets Manager) — never hardcode AWS creds
- Resolve Open Decision #2 (frontend hosting) before writing this phase's detailed plan
- `cdk synth` verification, then `cdk deploy`
- Smoke test against the deployed stack

**Depends on:** Phase 2, 3, 4 working locally. **Unblocks:** Phase 10.

## Phase 10 — Polish & wrap-up

- `README.md` with full local setup + deploy instructions
- Full suite green: `npm test` (unit/component) + backend integration tests + Playwright
  E2E, per `verification-before-completion`
- `finishing-a-development-branch` skill pass
- Optional: `a11y-audit` pass on the frontend

**Depends on:** everything above.

---

## Suggested execution order

Phases 0 → 1 → 2 → 3 → 4 are strictly sequential (each unblocks the next). Phase 5 can
start as soon as Phase 3 lands, in parallel with Phase 4, since it only needs the REST
API. Phase 6 needs both Phase 4 (server WS) and Phase 5 (frontend shell). Phase 7 can run
parallel to Phase 6. Phase 8 needs 4+6+7 done. Phase 9 can start its CDK skeleton (VPC/RDS
stack shape) anytime after Phase 2, but real deploy waits until Phase 4 works locally.
Phase 10 is last.
