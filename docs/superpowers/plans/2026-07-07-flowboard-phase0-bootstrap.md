# Flowboard Phase 0 — Repo & Monorepo Bootstrap Implementation Plan

> **For agentic workers:** You are authorized to execute tasks directly from this document phase-by-phase. When a phase is started, break down its requirements into immediate actionable checkboxes directly within the current chat session. Do not generate separate markdown files for planning.

**Goal:** Turn the empty `flowboard/` directory into a working npm-workspaces monorepo
skeleton — git initialized, root TS/lint/format config in place, Postgres available via
Docker Compose, Conventional Commits enforced by Husky + commitlint, and five empty-but-
wired workspaces (`apps/web`, `apps/server`, `packages/shared`, `infra`, `e2e`) that all
install and type-check cleanly from the root.

**Architecture:** A single npm-workspaces monorepo at the repo root. `tsconfig.base.json`
holds the shared strict TS config; every workspace's own `tsconfig.json` extends it. Root
`package.json` declares the workspace globs and hosts the shared tooling
(TypeScript, ESLint, Prettier, Husky, lint-staged, commitlint) as devDependencies — no
workspace re-declares these itself, npm hoists them. No application code is written in
this phase; every workspace gets a single placeholder `src/index.ts` whose only job is to
prove the toolchain (`npm install`, `tsc`, `eslint`, `prettier`) works end-to-end.

**Tech Stack:** npm workspaces, TypeScript 5 (strict), ESLint 9 (flat config) +
typescript-eslint 8, Prettier 3, Husky 9, lint-staged 15, commitlint 19
(`@commitlint/config-conventional`), Docker Compose (`postgres:16-alpine`).

## Global Constraints

- TypeScript strict mode everywhere.
- WS message shapes are defined once in `packages/shared` and imported by both apps —
  never duplicated. (Not yet applicable in Phase 0 — no messages exist yet — but the
  workspace must exist and be importable so Phase 1 can add them.)
- Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`, `style:`,
  `perf:`, `build:`, `ci:`, `revert:`) on every commit, enforced by commitlint via a Husky
  `commit-msg` hook — not just a convention, a hard gate starting partway through this
  phase (see Task 6).
- Never commit AWS credentials.
- Every phase ends with its own passing test suite before moving to the next phase — for
  Phase 0 that means: clean `npm install` from scratch, `npm run lint` clean, `npm run
  format:check` clean, every workspace's `tsc` check passing, `docker compose config`
  valid (Task 7).

---

## File Structure

```
flowboard/
├── .gitignore                          # node_modules, dist, .next, .env, cdk.out, etc.
├── README.md                           # minimal project overview (full setup docs land in Phase 10)
├── package.json                        # root: workspaces, shared devDependencies, lint-staged config
├── tsconfig.base.json                  # shared strict TS compiler options
├── eslint.config.js                    # flat config: JS/TS recommended + prettier compat
├── .prettierrc.json                    # Prettier formatting rules
├── .prettierignore                     # paths Prettier skips
├── docker-compose.yml                  # local Postgres 16 for development
├── commitlint.config.js                # extends @commitlint/config-conventional
├── .husky/
│   ├── pre-commit                      # runs lint-staged
│   └── commit-msg                      # runs commitlint against the commit message
├── apps/
│   ├── web/
│   │   ├── package.json                # @flowboard/web — placeholder, real Next.js scaffold in Phase 5
│   │   ├── tsconfig.json               # extends ../../tsconfig.base.json
│   │   └── src/index.ts                # placeholder module
│   └── server/
│       ├── package.json                # @flowboard/server — placeholder, real Express/Fastify app in Phase 3
│       ├── tsconfig.json               # extends ../../tsconfig.base.json
│       └── src/index.ts                # placeholder module
├── packages/
│   └── shared/
│       ├── package.json                # @flowboard/shared — real WS contract types land in Phase 1
│       ├── tsconfig.json               # extends ../../tsconfig.base.json
│       └── src/index.ts                # placeholder module
├── infra/
│   ├── package.json                    # @flowboard/infra — real CDK app lands in Phase 9
│   ├── tsconfig.json                   # extends ../tsconfig.base.json
│   └── src/index.ts                    # placeholder module
└── e2e/
    ├── package.json                    # @flowboard/e2e — real Playwright config lands in Phase 8
    ├── tsconfig.json                   # extends ../tsconfig.base.json
    └── src/index.ts                    # placeholder module
```

---

### Task 1: Git init, `.gitignore`, root `README.md`

**Files:**
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: an initialized git repository with one commit on the default branch. Every
  later task commits into this history.

- [ ] **Step 1: Initialize the git repository**

Run:
```bash
git init
git branch -m main
```
Expected: `Initialized empty Git repository in .../flowboard/.git/` and the default branch
renamed to `main`.

- [ ] **Step 2: Create `.gitignore`**

Create `.gitignore`:
```gitignore
# dependencies
node_modules/

# build output
dist/
build/
.next/
out/

# testing
coverage/

# env
.env
.env.*.local
!.env.example

# logs
npm-debug.log*
*.log

# typescript
*.tsbuildinfo

# OS/editor
.DS_Store
.vscode/*
!.vscode/extensions.json
.idea/

# AWS CDK
infra/cdk.out/
infra/cdk.context.json

# Playwright
e2e/test-results/
e2e/playwright-report/
e2e/blob-report/
e2e/playwright/.cache/
```

- [ ] **Step 3: Create root `README.md`**

Create `README.md`:
```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore README.md
git commit -m "chore: initialize repository"
```
Expected: commit succeeds (no hooks installed yet at this point in the phase).

---

### Task 2: Root `package.json` + `tsconfig.base.json`

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `tsconfig.base.json` — extended by every workspace's `tsconfig.json` as
  `"extends": "../../tsconfig.base.json"` (from `apps/*` or `packages/*`) or
  `"extends": "../tsconfig.base.json"` (from `infra` or `e2e`). Root `package.json`'s
  `workspaces` array — consumed implicitly by `npm install` in Task 3.

- [ ] **Step 1: Create root `package.json`**

Create `package.json`:
```json
{
  "name": "flowboard",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "workspaces": [
    "apps/*",
    "packages/*",
    "infra",
    "e2e"
  ],
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "build": "npm run build --workspaces --if-present",
    "prepare": "husky"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 3: Verify both files parse as valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"
node -e "JSON.parse(require('fs').readFileSync('tsconfig.base.json','utf8')); console.log('tsconfig.base.json OK')"
```
Expected:
```
package.json OK
tsconfig.base.json OK
```

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.base.json
git commit -m "chore: add root package.json and shared tsconfig"
```

---

### Task 3: Workspace placeholders (`apps/web`, `apps/server`, `packages/shared`, `infra`, `e2e`)

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/src/index.ts`
- Create: `apps/server/package.json`, `apps/server/tsconfig.json`, `apps/server/src/index.ts`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`
- Create: `infra/package.json`, `infra/tsconfig.json`, `infra/src/index.ts`
- Create: `e2e/package.json`, `e2e/tsconfig.json`, `e2e/src/index.ts`

**Interfaces:**
- Consumes: `tsconfig.base.json` (Task 2), `workspaces` glob in root `package.json`
  (Task 2).
- Produces: five installable, type-checkable npm workspaces (`@flowboard/web`,
  `@flowboard/server`, `@flowboard/shared`, `@flowboard/infra`, `@flowboard/e2e`), each
  runnable via `npm run build -w @flowboard/<name>`. Later phases replace the placeholder
  `src/index.ts` files with real code; the `package.json`/`tsconfig.json` shape here is
  what those phases build on top of, not something they should need to restructure.

- [ ] **Step 1: Create `apps/web` placeholder**

Create `apps/web/package.json`:
```json
{
  "name": "@flowboard/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit -p ."
  }
}
```

Create `apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/web/src/index.ts`:
```ts
export {};
```

- [ ] **Step 2: Create `apps/server` placeholder**

Create `apps/server/package.json`:
```json
{
  "name": "@flowboard/server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit -p ."
  }
}
```

Create `apps/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/server/src/index.ts`:
```ts
export {};
```

- [ ] **Step 3: Create `packages/shared` placeholder**

Create `packages/shared/package.json`:
```json
{
  "name": "@flowboard/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p ."
  }
}
```

Create `packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/shared/src/index.ts`:
```ts
export {};
```

- [ ] **Step 4: Create `infra` placeholder**

Create `infra/package.json`:
```json
{
  "name": "@flowboard/infra",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit -p ."
  }
}
```

Create `infra/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create `infra/src/index.ts`:
```ts
export {};
```

- [ ] **Step 5: Create `e2e` placeholder**

Create `e2e/package.json`:
```json
{
  "name": "@flowboard/e2e",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit -p ."
  }
}
```

Create `e2e/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create `e2e/src/index.ts`:
```ts
export {};
```

- [ ] **Step 6: Install TypeScript at the root and verify workspaces are recognized**

Run:
```bash
npm install -D typescript@^5.7.3
```
Expected: npm reports the five workspaces (`@flowboard/web`, `@flowboard/server`,
`@flowboard/shared`, `@flowboard/infra`, `@flowboard/e2e`) being linked, ending with
`added N packages` and `found 0 vulnerabilities`.

- [ ] **Step 7: Verify every workspace type-checks**

Run:
```bash
npm run build --workspaces --if-present
```
Expected: each workspace's `tsc` invocation runs and exits 0 with no output (empty
`export {}` modules produce no diagnostics under strict mode).

- [ ] **Step 8: Commit**

```bash
git add apps packages infra e2e package.json package-lock.json
git commit -m "chore: scaffold workspace placeholders for web, server, shared, infra, e2e"
```

---

### Task 4: ESLint + Prettier shared config

**Files:**
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `package.json` (devDependencies)

**Interfaces:**
- Consumes: nothing new.
- Produces: `npm run lint` / `npm run lint:fix` / `npm run format` / `npm run
  format:check` — all four consumed by Task 6's lint-staged config and by Task 7's final
  verification.

- [ ] **Step 1: Install ESLint, typescript-eslint, and Prettier**

Run:
```bash
npm install -D eslint@^9.18.0 @eslint/js@^9.18.0 typescript-eslint@^8.19.1 eslint-config-prettier@^9.1.0 prettier@^3.4.2
```
Expected: `added N packages`, `found 0 vulnerabilities`.

- [ ] **Step 2: Create `eslint.config.js`**

Create `eslint.config.js`:
```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/cdk.out/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
);
```

- [ ] **Step 3: Create `.prettierrc.json`**

Create `.prettierrc.json`:
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 4: Create `.prettierignore`**

Create `.prettierignore`:
```
node_modules
dist
.next
cdk.out
coverage
playwright-report
test-results
package-lock.json
```

- [ ] **Step 5: Run lint and format checks**

Run:
```bash
npm run lint
npm run format:check
```
Expected `npm run lint`: exits 0, no output (no problems).
Expected `npm run format:check`: `Checking formatting...` followed by `All matched files
use Prettier code style!` and exit 0. If any file is flagged, run `npm run format` and
re-run `format:check`.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js .prettierrc.json .prettierignore package.json package-lock.json
git commit -m "chore: add ESLint flat config and Prettier setup"
```

---

### Task 5: `docker-compose.yml` for local Postgres

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: a `db` service on `localhost:5432` (user `flowboard`, password `flowboard`,
  database `flowboard`) — consumed by `apps/server`'s Prisma `DATABASE_URL` starting in
  Phase 2 (out of scope here).

- [ ] **Step 1: Create `docker-compose.yml`**

Create `docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: flowboard-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: flowboard
      POSTGRES_PASSWORD: flowboard
      POSTGRES_DB: flowboard
    ports:
      - "5432:5432"
    volumes:
      - flowboard-db-data:/var/lib/postgresql/data

volumes:
  flowboard-db-data:
```

- [ ] **Step 2: Validate compose syntax**

Run:
```bash
docker compose config
```
Expected: prints the fully-resolved compose configuration (service `db`, image
`postgres:16-alpine`, port mapping `5432:5432`) with no errors. This works even if the
Docker daemon isn't running.

- [ ] **Step 3: If Docker Desktop is running, smoke-test the container**

Run:
```bash
docker compose up -d db
docker compose ps
docker compose exec db pg_isready -U flowboard
docker compose down
```
Expected: `docker compose ps` shows `flowboard-db` as `running`/`healthy`;
`pg_isready` prints `... accepting connections`; `docker compose down` removes the
container cleanly. Skip this step (note it and move on) if the Docker daemon isn't
available in the current environment — `docker compose config` in Step 2 is the
required check for this task.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add docker-compose for local Postgres"
```

---

### Task 6: Husky + lint-staged + commitlint wired to Conventional Commits

**Files:**
- Create: `.husky/pre-commit`
- Create: `.husky/commit-msg`
- Create: `commitlint.config.js`
- Modify: `package.json` (devDependencies, `lint-staged` config, `prepare` script already
  present from Task 2)

**Interfaces:**
- Consumes: `npm run lint:fix` / Prettier (Task 4) — invoked by lint-staged.
- Produces: a `pre-commit` hook (runs lint-staged on staged files) and a `commit-msg` hook
  (rejects any commit message that isn't a valid Conventional Commit per
  `@commitlint/config-conventional` — types `feat|fix|docs|style|refactor|perf|test|
  build|ci|chore|revert`, matching `skill/conventional-commit`). Every commit from this
  task onward in this plan (and in the rest of the project) goes through both hooks.

- [ ] **Step 1: Install Husky, lint-staged, and commitlint**

Run:
```bash
npm install -D husky@^9.1.7 lint-staged@^15.3.0 @commitlint/cli@^19.6.1 @commitlint/config-conventional@^19.6.0
```
Expected: `added N packages`, `found 0 vulnerabilities`.

- [ ] **Step 2: Initialize Husky**

Run:
```bash
npx husky init
```
Expected: creates `.husky/pre-commit` (containing `npm test` by default) and confirms
the root `package.json` `prepare` script is `husky` (already present from Task 2, Step
1 — `husky init` leaves it as-is since it's already correct).

- [ ] **Step 3: Replace `.husky/pre-commit` to run lint-staged**

Create `.husky/pre-commit` (overwriting the default content):
```
npx lint-staged
```

- [ ] **Step 4: Create `.husky/commit-msg`**

Create `.husky/commit-msg`:
```
npx --no -- commitlint --edit "$1"
```

Run:
```bash
chmod +x .husky/commit-msg
```
Expected: no output; makes the hook executable (matches the mode Husky sets on
`pre-commit` automatically).

- [ ] **Step 5: Create `commitlint.config.js`**

Create `commitlint.config.js`:
```js
export default {
  extends: ["@commitlint/config-conventional"],
};
```

- [ ] **Step 6: Add lint-staged config to root `package.json`**

Add a `"lint-staged"` key to `package.json` (alongside the existing `"scripts"` key):
```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
}
```

- [ ] **Step 7: Verify commitlint rejects a non-conventional message**

Run:
```bash
echo "not a conventional commit" > /tmp/flowboard-bad-msg.txt
npx commitlint --edit /tmp/flowboard-bad-msg.txt
```
Expected: exits non-zero with an error such as `subject may not be empty` /
`type may not be empty` (message doesn't match `type(scope): description`).

- [ ] **Step 8: Verify commitlint accepts a conventional message**

Run:
```bash
echo "chore: wire husky, lint-staged, and commitlint" > /tmp/flowboard-good-msg.txt
npx commitlint --edit /tmp/flowboard-good-msg.txt
```
Expected: exits 0, no output.

- [ ] **Step 9: Commit through the newly-installed hooks**

```bash
git add .husky commitlint.config.js package.json package-lock.json
git commit -m "chore: wire husky, lint-staged, and commitlint to conventional commits"
```
Expected: the `pre-commit` hook runs `lint-staged` (prints which files it's checking,
e.g. `commitlint.config.js`, `package.json`) and the `commit-msg` hook runs `commitlint`
against this message — both pass silently/green, and the commit succeeds. This is the
first commit in the repo's history actually enforced by the hooks.

---

### Task 7: Final Phase 0 verification

**Files:** none created or modified — this task only runs checks across everything
produced by Tasks 1–6.

**Interfaces:**
- Consumes: every artifact from Tasks 1–6.
- Produces: the "Phase 0 passing test suite" required by the Global Constraints section
  before Phase 1 can start.

- [ ] **Step 1: Clean reinstall from scratch**

Run:
```bash
rm -rf node_modules apps/web/node_modules apps/server/node_modules packages/shared/node_modules infra/node_modules e2e/node_modules
npm install
```
Expected: npm reinstalls everything and re-links all five workspaces with `found 0
vulnerabilities`, confirming `package-lock.json` alone (not stale local state) is enough
to reproduce the environment.

- [ ] **Step 2: Full lint pass**

Run:
```bash
npm run lint
```
Expected: exits 0, no output.

- [ ] **Step 3: Full format check**

Run:
```bash
npm run format:check
```
Expected: `All matched files use Prettier code style!`, exit 0.

- [ ] **Step 4: Full workspace type-check**

Run:
```bash
npm run build --workspaces --if-present
```
Expected: every workspace's `tsc` invocation exits 0 with no diagnostics; `packages/shared`
additionally produces `packages/shared/dist/index.js` and `dist/index.d.ts` (its build
script emits, unlike the others which use `--noEmit`).

- [ ] **Step 5: Docker Compose config check**

Run:
```bash
docker compose config --quiet
```
Expected: exits 0 with no output (valid config, quiet mode suppresses the printed YAML).

- [ ] **Step 6: Confirm the git history is clean and hook-enforced**

Run:
```bash
git status
git log --oneline
```
Expected: `git status` reports a clean working tree (`nothing to commit, working tree
clean`); `git log --oneline` shows the 6 commits from Tasks 1–6 in order (repository
init → root config → workspace scaffold → lint/format → docker-compose → husky/
lint-staged/commitlint).

- [ ] **Step 7: Tag Phase 0 as complete**

```bash
git tag phase-0-complete
```
Expected: no output; `git tag` afterward lists `phase-0-complete`. This gives Phase 1's
plan a fixed point to branch from or diff against if needed.

---

## Notes for Phase 1 (not part of this plan)

`packages/shared/src/index.ts` currently exports nothing (`export {}`). Phase 1 replaces
it with the real `Board`/`Column`/`Card`/`User` types and Zod schemas for the WebSocket
message contract, per the roadmap — no restructuring of `packages/shared/package.json` or
`tsconfig.json` should be needed, only new files under `src/`.
