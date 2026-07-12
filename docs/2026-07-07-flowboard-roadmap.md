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
- [x] Phase 11 — Board membership & sharing (done, commit 3247c7c)
  - [x] 11.1 Prisma `BoardMember` model (`boardId`, `userId`, `role: OWNER | MEMBER`,
    `@@unique([boardId, userId])`), migration `20260710030852_add_board_member`
  - [x] 11.2 `POST /boards/:id/members` — owner invites an existing registered user by
    email (`404 user_not_found` if no account matches, `409 already_member` on a
    duplicate invite; no pending-invite system, out of scope)
  - [x] 11.3 `DELETE /boards/:id/members/:userId` — owner removes a member
  - [x] 11.4 New `src/lib/boardAccess.ts` (`findAccessibleBoard`) replaces the owner-only
    `ownerId` check in `GET /boards/:id` and the WS `boardAccessGuard`: access is now
    owner OR member. Board CRUD (rename/delete) and membership management
    (invite/remove) stay owner-only (`403 owner_only` for a non-owner member)
  - [x] 11.5 Integration tests (TDD, written and watched fail first): member can
    read a board it's been invited to; non-member still gets 404; only the owner can
    invite/remove members (a member gets 403, including trying to remove themself);
    inviting an unregistered email or an already-invited member is rejected
  - [x] 11.6 Full gate: `npm run build && npm run lint && npm run format:check && npm
    test` — all green (127 tests: 49 server + 64 web + 14 shared)
- [x] Phase 12 — Real-time broadcast completion (done, commit d106173)
  - [x] 12.1 Extracted `boardSockets`/`broadcast`/`buildBoardSync` out of `realtime/ws.ts`
    into a shared `realtime/broadcast.ts` (`subscribe`, `unsubscribe`,
    `broadcastBoardSync(boardId, exclude?)`), so REST route handlers can reach the same
    in-memory socket map `card:move` already used. Pure refactor, `ws.test.ts` stayed
    green throughout.
  - [x] 12.2 Wired `broadcastBoardSync` into the REST mutation handlers after each
    successful write: card create/update/delete (`cards.ts`), board rename (`boards.ts`),
    member invite/remove (`boardMembers.ts`). Board create is not wired — no socket can
    be subscribed to a board id that doesn't exist yet, so there is nothing to broadcast.
  - [x] 12.3 TDD per handler (RED confirmed via a WS `injectWS` socket timing out before
    the fix, GREEN after): 6 new integration tests asserting a subscribed socket receives
    `board:sync` after each REST mutation.
  - [x] 12.4 Found and fixed a real race condition surfaced by 12.2: the REST create
    handler now sends `board:sync` to the creator's own subscribed socket *before* the
    HTTP response is returned, so on the creating client the WS message can arrive before
    the `fetch()` promise resolves. `BoardDetail`'s optimistic `handleCardCreated` appended
    the card unconditionally, so the same card could be added twice (duplicate React key,
    duplicate DOM node) when the sync won the race. Root-caused via `systematic-debugging`
    (confirmed via console instrumentation than the sync fired before the create callback),
    fixed by extracting `addCardIfAbsent` (`boardState.ts`, TDD, dedupes by card id) and
    using it in place of the raw append — makes the optimistic update idempotent against
    an already-applied sync, mirroring how `handleSync`'s full replace is already
    idempotent.
  - [x] 12.5 E2E (Playwright, two browser contexts): card created via the real `NewCardForm`
    UI in context A appears in context B with no reload — the only mutation in this phase
    with existing frontend UI to drive end-to-end. Board rename, card edit/delete, and
    member invite/remove are broadcast-tested at the integration level only; their
    frontend UI doesn't exist yet (Phase 13/14).
  - [x] 12.6 Full gate: `npm run build && npm run lint && npm run format:check && npm
    test` (135 tests: 55 server + 66 web + 14 shared) `&& npx playwright test` (4/4,
    from `e2e/`) — all green.
- [x] Phase 13 — Complete CRUD (board & card edit/delete) (done)
  - [x] 13.1 Audit: `PATCH`/`DELETE /boards/:id` and `PATCH`/`DELETE /cards/:id` already
    existed from Phase 3, so this phase adds no new REST routes. Found a real gap while
    auditing: card create/update/delete checked `board: { ownerId }` directly instead of
    `findAccessibleBoard`, so an invited member could move a card via the WS `card:move`
    path but got a 404 trying to create/edit/delete one via REST — inconsistent with the
    owner-OR-member model `findAccessibleBoard` already established in Phase 11. Flagged
    to the user as a scope decision rather than guessed silently; user chose to fix it in
    this phase.
  - [x] 13.2 TDD fix (RED confirmed: 3 new member-access tests failing with 404, GREEN
    after): `cards.ts` create/update/delete now use `findAccessibleBoard`, so invited
    members can create/edit/delete cards, matching the existing WS move access. Board
    rename/delete stays owner-only per the explicit Phase 11 decision.
  - [x] 13.3 `boardState.ts`: added `updateCardIfPresent`/`removeCardIfPresent` (TDD),
    idempotent no-ops when the card is already absent/updated — mirrors `addCardIfAbsent`
    from Phase 12 so optimistic card edit/delete stays safe against the same
    REST-response-vs-own-socket-sync race.
  - [x] 13.4 Frontend (TDD, component tests written first): inline board rename and
    delete-with-confirmation controls (owner-only, gated on a new `currentUserId` prop
    passed from `BoardPage`); per-card inline edit and delete-with-confirmation controls
    (available to owner and members). Restructured `DraggableCard` into `CardItem` with
    the dnd-kit drag listeners scoped to the title text only (a drag handle), not the
    whole `<li>`, so the new Edit/Delete buttons don't fight the drag sensor.
  - [x] 13.5 `handleSync` now also applies `message.board.name`, so a board rename by any
    client (not just the renamer) reflects live on every other subscribed client — this
    was a latent gap since Phase 12 (the `board:sync` payload already carried `board`, but
    the handler only read `columns`/`cards`).
  - [x] 13.6 Full gate: `npm run build && npm run lint && npm run format:check && npm
    test` (161 tests: 58 server + 89 web + 14 shared) `&& npx playwright test` (4/4, from
    `e2e/`) — all green.
- [x] Phase 14 — Visual redesign (done, branch `polish/redesign-v2`)
  - [x] 14.1 Brainstormed via `superpowers:brainstorming` with the visual companion
    (mockups in-browser): the roadmap's original "bold colors, gradients, shadows —
    modern/vibrant, not minimal" direction was shown to the user as three mockups and
    rejected as "generic"; pivoted to a "Stripe/Vercel clean" direction instead (soft
    ambient gradient, restrained accent color, diffused shadows) — captured in
    `docs/superpowers/specs/2026-07-10-visual-redesign-design.md`.
  - [x] 14.2 Scope decision: the roadmap listed "member list/invite UI" as a redesign
    target, but it was never built on the frontend (Phase 11 was backend-only). Flagged
    to the user rather than guessed; user chose to build it now, in the new visual
    language, closing the Phase 11 gap end-to-end.
  - [x] 14.3 Design tokens (`globals.css`): additive `--color-accent-2`/`--color-accent-3`,
    `--ambient-gradient` (light-mode-only, overridden to `none` in dark), `--shadow-card`/
    `--shadow-card-hover`.
  - [x] 14.4 New `icons.tsx` (6 hand-rolled inline SVG icons, no new dependency) and
    `memberColor.ts` (deterministic per-user avatar color + initials helpers), both TDD.
  - [x] 14.5 Backend (TDD, additive only): `GET /boards/:id` now returns `members` (owner +
    invited members with role); `POST /boards/:id/members` response additively includes
    the invitee's name/email (existing `boardId`/`userId`/`role` fields untouched).
  - [x] 14.6 New `MemberList` component (avatar stack, invite form, remove control,
    owner-gated) wired into `BoardDetail`; `boardActions.inviteMember`/`removeMember`
    added. Real-time sync of the member list is out of scope (would need a
    `packages/shared` schema change) — it loads once per page view.
  - [x] 14.7 Redesigned `Header` (avatar, gradient wordmark, icon sign-out), `BoardsList`/
    `CreateBoardForm` (card grid, gradient create button), and `BoardDetail` (column
    color-dot indicators, hover/focus-reveal icon Edit/Delete on cards, icon rename/
    delete-board toolbar) — every existing accessible name (`Edit`, `Delete`, `Rename`,
    `Delete board`, etc.) preserved exactly, so the whole pre-existing test suite kept
    passing unmodified except for fixture updates (`members` field) and new tests.
  - [x] 14.8 Found and fixed a real, pre-existing bug via manual browser verification
    (not caught by any automated test, since `app.inject()` integration tests bypass CORS
    entirely and no E2E spec drove rename/delete/invite/remove through a real browser):
    `@fastify/cors` only allowed `GET`/`HEAD`/`POST`, so every `PATCH`/`DELETE` mutation
    (board rename/delete, card edit/delete, member invite/remove — including Phase 13's
    own features) silently failed with a CORS error in a real browser despite passing
    every test. Fixed with an explicit `methods` list (TDD, RED confirmed via an OPTIONS
    preflight test asserting `PATCH`/`DELETE` in `access-control-allow-methods`).
  - [x] 14.9 Manual verification: launched both dev servers, drove the app with a
    Playwright-scripted headless Chromium (no `chromium-cli` available in this
    environment) — signup, create board, create/drag cards (confirms the drag handle
    restructuring in 13.4 still works for real pointer-driven drag-and-drop), rename
    board, invite/remove a member, all screenshotted with zero browser console errors
    after the CORS fix.
  - [x] 14.10 Full gate: `npm run build && npm run lint && npm run format:check && npm
    test` (188 tests: 61 server + 113 web + 14 shared) `&& npx playwright test` (4/4,
    from `e2e/`) — all green.

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
2. **Frontend hosting** (needed before Phase 9): RESOLVED 2026-07-12 — `apps/web` deploys
   to Vercel.
3. **Drag-and-drop library** (needed before Phase 6): not specified in CLAUDE.md. Default
   assumption: `@dnd-kit`. Swap if you have a preference.
4. **Backend/DB hosting** (needed before Phase 9): RESOLVED 2026-07-12 — CLAUDE.md's
   original plan was AWS (EC2/Elastic Beanstalk + RDS via CDK), but the user started a
   new job 2026-07-13 where they'll get hands-on AWS experience on the job, and preferred
   not to put a credit card on a personal AWS account in the meantime (AWS Free Tier
   still requires a card on file). Decision: ship the live deploy now on free tiers that
   require no card — backend on **Render** (Node web service), database on **Neon**
   (serverless Postgres, no expiry, unlike Render's free Postgres which expires after 30
   days). AWS/CDK infra (the original Phase 9 scope) is deferred, not cancelled — revisit
   once the user has AWS access/comfort through the new job or a free certification
   course (e.g. AWS via IBM/Skill Builder). Trade-off accepted: the portfolio's live demo
   temporarily doesn't demonstrate the AWS deployment story CLAUDE.md calls out, but
   Render/Neon still prove real production deployment of the WebSocket + optimistic-
   concurrency architecture.

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

## Phase 9 — Deployment

> **Amendment 2026-07-12:** per Open Decision #4, the original AWS/CDK scope below is
> deferred (not cancelled). Executing now instead: **apps/web → Vercel**, **apps/server →
> Render**, **Postgres → Neon**, none requiring a card on file. `infra/` stays an empty
> scaffold until the AWS pass happens later.

- [ ] 9.1 Neon: create project/database, run `prisma migrate deploy` against it
- [ ] 9.2 Render: web service for `apps/server` (build: `npm run build`, start via `tsx`
  or compiled JS), env vars `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`
- [ ] 9.3 Vercel: deploy `apps/web`, env vars `JWT_SECRET` (must match Render's),
  `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` pointing at the Render backend
- [ ] 9.4 Smoke test the deployed stack: signup → create board → create card → move card,
  confirm real-time sync works cross-origin (Vercel ↔ Render)

### Deferred — original AWS/CDK scope (revisit post new-job AWS exposure)

- `infra/bin` CDK entrypoint, `infra/lib`: VPC + security groups stack
- RDS Postgres stack (Free Tier sizing)
- EC2/Elastic Beanstalk stack for `apps/server`
- Secrets/env wiring (SSM Parameter Store or Secrets Manager) — never hardcode AWS creds
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

## Amendment — Post-Phase-8 gaps found in review

**Resolved decision:** Boards support inviting other members (not owner-only).
Real-time sync must reflect true multi-user collaboration, not just multiple
tabs of the same user.

**Gaps found:** Phase 4's WS broadcast only covers `card:move`. `card:create`,
`card:update`, `card:delete`, and `board:sync` were defined as message shapes
in Phase 1 but never wired to the broadcast path. Board/card edit and delete
UI is missing (verify whether backend routes exist per original Phase 3 scope
before assuming they need to be built from scratch).

## Phase 11 — Board membership & sharing

- Prisma: `BoardMember` model (boardId, userId, role: OWNER | MEMBER), migration
- POST /boards/:id/members — invite an existing registered user by email
  (owner-only action)
- DELETE /boards/:id/members/:userId — remove a member (owner-only)
- Update existing ownership middleware: access = owner OR member (not owner-only)
- Integration tests: member can access/read; non-member is rejected; only
  owner can invite/remove

**Depends on:** Phase 3. **Unblocks:** Phase 12, 13.

## Phase 12 — Real-time broadcast completion

- Wire REST mutation handlers (card create/update/delete, board create/update,
  member add/remove) to the same in-memory `boardId → sockets` broadcast used
  by card:move, emitting the already-defined `card:create`/`card:update`/
  `card:delete`/`board:sync` events
- Frontend: apply these incoming events on the board/list pages (currently
  only card:move is handled)
- Test: two browser contexts, one creates/edits/deletes a card or invites a
  member, assert the other reflects it live without refresh

**Depends on:** Phase 4, 11. **Unblocks:** Phase 14.

## Phase 13 — Complete CRUD (board & card edit/delete)

- Audit first: confirm whether backend rename/delete routes for board and
  card already exist per original Phase 3 scope. If missing, implement with
  TDD. If present, this phase is frontend-only.
- Frontend: edit/delete UI for board (rename, delete with confirmation) and
  card (edit, delete with confirmation), wired to existing/new routes
- Tests: component tests for the new UI, integration tests for any newly
  added backend routes

**Depends on:** Phase 11 (ownership check must cover members correctly).
**Unblocks:** Phase 14.

## Phase 14 — Visual redesign (modern & vibrant)

- Direction: bold colors, gradients, shadows — modern/vibrant, not minimal
- Branch: `polish/redesign-v2`
- Full test suite green BEFORE any visual change (baseline)
- Apply redesign (impeccable if functional, else frontend-design/ui-styling)
  across: header/nav (must now show logged-in user + logout, currently
  missing), board list, board detail (columns/cards), member list/invite UI
- Manual drag-and-drop check after any structural change near cards
- Full test suite green AFTER — confirm nothing broke
- finishing-a-development-branch to merge back

**Depends on:** Phase 12, 13.
