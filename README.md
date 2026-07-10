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

Phases 0–8 and 11–14 are done: monorepo bootstrap, the shared WebSocket message
contract, the Postgres/Prisma schema, a Fastify REST API (auth, Board CRUD, Card
CRUD), the WebSocket layer with optimistic-concurrency card moves, a Next.js frontend
with real-time drag-and-drop (`@dnd-kit`, optimistic move + conflict rollback), a full
login/signup flow with middleware-based route protection and a persistent
authenticated header, a Playwright E2E suite (golden path, two-browser-context
live sync, and concurrent-move conflict handling), board membership/sharing
(invite/remove a member by email, owner vs. member access), REST mutations
(card create/update/delete, board rename, member invite/remove) broadcasting live over
the same WebSocket path as card moves, full board/card edit/delete UI (owner-only
board rename/delete, owner-or-member card create/edit/delete), and a visual redesign
(clean/modern "Stripe/Vercel"-style design tokens, a member list/invite UI that closes
out board sharing end-to-end, and a real CORS bug fix found via manual browser
verification — `PATCH`/`DELETE` mutation routes were silently blocked in the browser
despite passing every automated test). AWS infra/deployment (Phase 9) is the only
piece still ahead — see the roadmap for the full plan.

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
CORS_ORIGIN="http://localhost:3000"
```

A separate `apps/server/.env.test` (same shape, pointing at `flowboard_test`) is used
automatically when running tests — see `docs/Phase2-tests.md` if you need to recreate
it.

`apps/web` reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000` if unset,
so it's optional for local dev against the default server port). It also needs its own
`apps/web/.env` (gitignored, create it yourself) with a `JWT_SECRET` **matching**
`apps/server/.env`'s value — `apps/web/src/proxy.ts` verifies the session cookie's JWT
signature itself before letting a request through to `/boards/*`, so both processes
have to agree on the secret:

```bash
JWT_SECRET="pick-any-long-random-string-for-local-dev"
```

### Database migrations & seed data

```bash
cd apps/server
npm run prisma:migrate:deploy   # apply migrations to the dev database
npm run prisma:seed             # optional: creates a demo user/board/columns/card
```

## Running the app

```bash
npm run dev
```

One command for the whole stack: starts the Postgres container (waits for its
healthcheck), then runs the Fastify server and the Next.js dev server together, with
`[server]`/`[web]` prefixed, color-coded output. `Ctrl-C` stops both app processes
(Postgres keeps running in the background — `docker compose down` if you want it
stopped too).

- Fastify: `http://localhost:4000` (override the port with `PORT`)
- Next.js: `http://localhost:3000` — `/` redirects to `/boards`. Visit `/signup` to
  create an account or `/login` to sign in; `apps/web/src/proxy.ts` redirects any
  request to `/boards/*` without a valid session cookie straight to `/login`. Once
  signed in, `/boards` lists your boards (Server Component, fetched from the REST
  API) and `/boards/:id` renders that board's columns/cards with live drag-and-drop:
  moving a card applies immediately (optimistic update), broadcasts over the
  WebSocket to any other client viewing the same board, and rolls back automatically
  if the server reports a stale-version conflict. The board owner can rename/delete
  the board and invite/remove members by email (avatar stack + invite form at the top
  of the board); the owner or any invited member can create, edit (hover a card to
  reveal the icon buttons), and delete cards.

Prefer to run a single piece on its own? `npm run dev:db` starts just Postgres, and
`npm run dev --workspace apps/server` / `--workspace apps/web` start one app at a
time.

## Trying out the API

The fastest way to try the app is the browser UI (`/signup`, `/login`, `/boards`). The
walkthrough below hits the REST API directly with `curl` instead — useful for
scripting or debugging without a browser (cookies are used to carry the JWT, so keep a
cookie jar across requests):

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

# 7. Rename or delete the board itself (owner only)
curl -b cookies.txt -X PATCH http://localhost:4000/boards/<boardId> \
  -H "Content-Type: application/json" -d '{"name":"Sprint 1 (renamed)"}'
curl -b cookies.txt -X DELETE http://localhost:4000/boards/<boardId>

# 8. Invite/remove a member by email (owner only; the invitee must already have an account)
curl -b cookies.txt -X POST http://localhost:4000/boards/<boardId>/members \
  -H "Content-Type: application/json" -d '{"email":"teammate@example.com"}'
curl -b cookies.txt -X DELETE http://localhost:4000/boards/<boardId>/members/<userId>
```

Boards are visible/editable-at-the-card-level to their owner or any invited member;
requests from an unrelated authenticated user (or with no cookie at all) get
`404`/`401` rather than someone else's data. Board rename/delete and member
invite/remove stay owner-only (`403 owner_only` for a non-owner member).

| Route                                           | Auth required | Notes                                                                                                                                                     |
| ----------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                                   | no            | liveness check                                                                                                                                            |
| `POST /auth/signup`                             | no            | bcrypt-hashed password, sets `token` cookie                                                                                                               |
| `POST /auth/login`                              | no            | sets `token` cookie                                                                                                                                       |
| `GET /auth/me`                                  | yes           | current user, backs the authenticated header                                                                                                              |
| `POST /auth/logout`                             | no            | clears the `token` cookie                                                                                                                                 |
| `POST /boards`                                  | yes           | creates board + default Todo/Doing/Done columns                                                                                                           |
| `GET /boards`                                   | yes           | lists boards owned by the caller                                                                                                                          |
| `GET /boards/:id`                               | yes           | 404 unless the caller owns the board or is an invited member; response includes `members` (owner + invited members, each with `id`/`name`/`email`/`role`) |
| `PATCH /boards/:id`                             | yes           | rename (owner only); broadcasts `board:sync` live                                                                                                         |
| `DELETE /boards/:id`                            | yes           | cascades to its columns/cards (owner only)                                                                                                                |
| `POST /boards/:id/members`                      | yes           | owner invites a registered user by email; response includes the invitee's `name`/`email`; broadcasts `board:sync` live                                    |
| `DELETE /boards/:id/members/:userId`            | yes           | owner removes a member; broadcasts `board:sync` live                                                                                                      |
| `POST /boards/:boardId/columns/:columnId/cards` | yes           | appends a card to the column (owner or member); broadcasts `board:sync` live                                                                              |
| `PATCH /cards/:id`                              | yes           | rename/update description, owner or member (not move — that's the WS `card:move` path); broadcasts `board:sync` live                                      |
| `DELETE /cards/:id`                             | yes           | owner or member; broadcasts `board:sync` live                                                                                                             |

## Testing

```bash
npm test                               # every workspace: packages/shared + apps/server + apps/web
npm run build                          # tsc --noEmit (apps/server) / next build (apps/web)
npm run lint
npm run format:check
```

`apps/server`'s test command applies pending Prisma migrations to `flowboard_test`
first, then runs Vitest integration tests against that real database (no mocking) —
covering the Prisma schema, auth (including CORS, with an explicit preflight check that
`PATCH`/`DELETE` are allowed — the CORS config once silently blocked those methods in
the browser despite every `app.inject()`-based test passing, see the roadmap's Phase 14
notes), the Board/Card/membership REST routes (including cross-user and
owner-vs-member authorization checks, and that `GET /boards/:id` returns the owner +
member list), and the WebSocket layer (handshake auth, the optimistic-concurrency
conflict path for concurrent card moves, and `board:sync` broadcasts firing for every
REST mutation — card create/update/delete, board rename, member invite/remove).
`packages/shared` has unit tests for every WebSocket message schema (accept + reject
cases). `apps/web` has Vitest + React Testing Library component tests for the board
list/detail pages (including the WebSocket-driven drag-and-drop, optimistic update and
rollback-on-conflict paths, with the socket and `@dnd-kit` mocked, plus board
rename/delete, card edit/delete, and the member list/invite/remove UI), the
authenticated header (avatar, sign-out), the login/signup forms (mocked `fetch`), the
hand-rolled icon components, and the deterministic avatar color/initials helpers, plus
an integration test for `proxy.ts` covering missing/invalid/expired/valid session
cookies. Current totals: 61 server + 113 web + 14 shared = 188 tests.

Playwright E2E tests live in `e2e/` (`npx playwright test`, from that directory):
a golden path (signup → create board → create card → drag it), two-browser-context
live sync (one browser creates a card or moves one, the other sees it with no reload),
and a concurrency test asserting a near-simultaneous move on the same card has no lost
update — the loser gets a visible conflict instead of silently overwriting.

## Deploying

Via `cdk deploy` from `/infra` once the CDK stacks exist (Phase 9) — provisions
EC2/Elastic Beanstalk + RDS. Both fit in the AWS Free Tier for a project at this scale.
Not available yet.
