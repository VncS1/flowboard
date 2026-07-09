## Status
- [x] Phase 0 — Repo & Monorepo Bootstrap (done, commit abc1234)
- [x] Phase 1 — packages/shared (done, commit <hash-real>)
- [x] Phase 2 — Database schema & migrations (done, commit <hash-real>)
- [x] Phase 3 — Backend REST API (done, commit 419d8d4)
- [x] Phase 4 — WebSocket layer + optimistic concurrency (done, commit e7751b1)
  - [x] 4.1 Failing integration test for concurrent card moves (RED confirmed, then GREEN)
  - [x] 4.2 ws server in-memory boardId → sockets map (`src/realtime/ws.ts`, `@fastify/websocket`)
  - [x] 4.3 JWT verification on socket handshake (same httpOnly cookie as REST, via `app.authenticate` preHandler)
  - [x] 4.4 moveCard optimistic-concurrency handler (UPDATE ... WHERE version=$2)
  - [x] 4.5 Broadcast successful move to other subscribed sockets (`board:sync`, sender excluded)
  - [x] 4.6 Conflict response contract (`card:conflict`, reason `stale-version`, carries authoritative card)
- [x] Phase 5 — Frontend foundation (done, commit bb8a752)
  - [x] 5.1 Scaffold `apps/web` (Next.js App Router, TS strict, Tailwind v4 CSS-first `@theme`)
  - [x] 5.2 Board list page (Server Component, fetches `GET /boards`)
  - [x] 5.3 Board detail shell page (Server Component, static columns/cards, fetches `GET /boards/:id`)
  - [x] 5.4 Vitest + React Testing Library setup
  - [x] 5.5 Component tests for both pages (written test-first)
  - [x] 5.6 Full gate: build, lint, format:check, test — all green
  - Also extended `GET /boards/:id` (Phase 3) to nest each column's cards, ordered by
    position, needed by the board detail page — covered by a new server integration test.
- [x] Phase 6 — Frontend real-time + drag-and-drop (done, commit 580f0cf)
  - [x] 6.1 `useBoardSocket` hook (`apps/web/src/lib/useBoardSocket.ts`): connects to
    `NEXT_PUBLIC_WS_URL`, validates every inbound message against the Phase 1
    `serverToClientMessageSchema`, rejects/logs anything that fails to parse
  - [x] 6.2 `BoardDetail` promoted to a Client Component; drag-and-drop via `@dnd-kit/core`
    (Open Decision #3), immediate optimistic local move on drop
  - [x] 6.3 Emits `card:move` per the shared contract; on `card:conflict` rolls back the
    optimistic move to its pre-drag snapshot and calls `router.refresh()` to refetch the
    authoritative board
  - [x] 6.4 Applies `board:sync` events from other clients live, no page refresh needed
  - [x] 6.5 Component tests with a mocked `WebSocket` (`FakeWebSocket` test double,
    jsdom has no native `WebSocket`) and a mocked `@dnd-kit/core` for deterministic drag
    simulation, including an explicit optimistic-rollback-on-conflict test
  - [x] 6.6 Full gate: build, lint, format:check, test — all green
- [x] Phase 7 — Auth UI & route protection (done, commit e06e474)
  - [x] 7.1 Login/signup pages (`apps/web/src/app/login`, `/signup`) calling the Phase 3
    `POST /auth/login` / `/auth/signup` routes with `credentials: 'include'`; `@fastify/cors`
    registered on the backend (`CORS_ORIGIN`, credentials enabled) so the browser accepts
    the cross-origin, same-site cookie between `localhost:3000` and `localhost:4000`
  - [x] 7.2 `POST /auth/logout` clears the httpOnly cookie server-side (JS can't touch it
    directly)
  - [x] 7.3 `apps/web/src/proxy.ts` (Next.js renamed the `middleware.ts` convention to
    `proxy.ts` in this Next version — see nextjs.org/docs/messages/middleware-to-proxy)
    guards `/boards/:path*`: verifies the `token` cookie's JWT signature and expiry via
    `jose`, redirects to `/login` if absent or invalid. Requires `JWT_SECRET` in
    `apps/web/.env` to match `apps/server/.env` (both gitignored, documented in each)
  - [x] 7.4 Clear, mapped error messages on both forms (invalid credentials, email already
    registered, invalid input) instead of raw API errors
  - [x] 7.5 Component tests with mocked `fetch` for login/signup, plus a `proxy.test.ts`
    integration test covering missing/invalid/expired/valid session cookies against a real
    `NextRequest`
  - [x] 7.6 Full gate: build, lint, format:check, test — all green
  - [x] 7.7 Manually verified against the real dev stack (Postgres + Fastify + Next.js,
    not just mocks): signup sets the `httpOnly`/`Secure`/`SameSite=Lax` cookie with the
    correct `Access-Control-Allow-Origin`/`-Credentials` headers; `/boards` without the
    cookie 307-redirects to `/login`; `/boards` with the cookie renders; login/logout and
    the `/login`, `/signup` pages all confirmed live
- [x] Phase 8 — E2E & multi-user real-time tests (Playwright) (done, commit 8507dcb)
  - [x] 8.0 Added board/card creation UI (`CreateBoardForm`, a per-column new-card form in
    `BoardDetail`) — Phases 5/6 only covered read/drag-and-drop, so the golden path had
    nothing to drive through the browser; built test-first before the E2E specs
  - [x] 8.1 `e2e/playwright.config.ts`: chromium project, `webServer` boots both
    `apps/server` (against the isolated `flowboard_test` database, `prisma migrate deploy`
    first) and `apps/web`, each with an `e2e-test-secret` `JWT_SECRET` shared between them
  - [x] 8.2 Golden path (`golden-path.spec.ts`): signup → create board → create card →
    drag card to another column → reload confirms the move persisted server-side
  - [x] 8.3 Two-browser-context live sync (`live-sync.spec.ts`): user A drags a card;
    user B's page (a second context, same account, cookies shared via `storageState` —
    boards are single-owner) shows the move live via the `board:sync` broadcast, no refresh
  - [x] 8.4 Concurrency test (`concurrency.spec.ts`): two contexts stage a drag on the same
    card to two different columns, then drop back-to-back to force a real same-version
    race. Asserts exactly one side receives a `card:conflict` frame (never both, never
    neither) and both clients converge on the same authoritative column afterward — no
    silently lost update
  - [x] 8.5 Found and fixed a real bug via the golden-path test: `useBoardSocket.send`
    called `socket.send()` unconditionally, which throws `InvalidStateError` if triggered
    before the WebSocket finishes opening. Fixed test-first (strengthened `FakeWebSocket`
    to model `readyState` and throw like a real socket, wrote a failing test for the race,
    then queued sends made before `open` and flushed them once connected)
  - [x] 8.6 Full gate: `npm run build && npm run lint && npm run format:check && npm test
    && npx playwright test` (run from `e2e/`) — all green, confirmed stable across repeated
    runs of the concurrency test


> **For agentic workers:** This is an INDEX/ROADMAP document, not a bite-sized execution
> plan. The project spans multiple independent subsystems (monorepo scaffold, DB, REST
> API, WebSocket/concurrency core, frontend UI, auth, E2E, AWS infra). Per
> `superpowers:writing-plans` scope-check guidance, each phase below gets its own
> detailed bite-sized plan (with real code, real commands, TDD steps) generated with
> `superpowers:writing-plans` **when that phase starts** — do not attempt to execute
> straight from this document.

**Goal:** Build Flowboard — a real-time collaborative kanban board — from an empty
directory to a deployed, tested MVP on AWS, per `CLAUDE.md`.

**Architecture:** Next.js (App Router) frontend talks to a Node.js (Fastify)
backend over REST (CRUD) and a persistent WebSocket (card/board live state). Postgres
via RDS/Prisma is the source of truth; concurrent card moves are protected with
optimistic locking on a `version` column. `packages/shared` pins the WS message contract
(TS types + Zod) so frontend/backend can't silently drift.

**Tech Stack:** Next.js, TypeScript (strict), Tailwind v4, Node.js + Fastify,
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

- Fastify app scaffold + health check
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
