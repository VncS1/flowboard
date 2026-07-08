# Phase 2 — como testar / retomar amanhã

Commit desta fase: `8d3cc9d` ("feat: add Prisma schema & migrations for Phase 2").

## O que foi feito

- `apps/server/prisma/schema.prisma`: models `User`, `Board`, `Column`, `Card`
  (`Card.version` default `1`, cascade delete Board → Column → Card).
- Primeira migration: `apps/server/prisma/migrations/20260708031513_init/`.
- Seed idempotente: `apps/server/prisma/seed.ts`.
- Suíte de integração real (Postgres de verdade, não mock):
  `apps/server/src/db/schema.test.ts`.
- Banco de teste isolado `flowboard_test` no mesmo Postgres do
  `docker-compose.yml` (criado via `docker/init-test-db.sql` na primeira
  subida do container), com limpeza (`deleteMany` em cascata) entre testes.

## Pré-requisito: subir o Postgres local

```bash
docker compose up -d db
```

Isso já cria os bancos `flowboard` (dev) e `flowboard_test` (testes) na
primeira vez que o volume é criado. Se você já tinha o container antigo (sem
o `flowboard_test`), rode uma vez:

```bash
docker exec flowboard-db psql -U flowboard -d flowboard -c "CREATE DATABASE flowboard_test"
```

(Só é necessário se `flowboard_test` ainda não existir — o container já
estava rodando desde antes de o init script ser adicionado ao compose.)

## Rodar os testes

Da raiz do repo (roda todos os workspaces, incluindo `packages/shared`):

```bash
npm test
```

Só o backend (aplica migrations pendentes no `flowboard_test` via `pretest`,
depois roda o Vitest):

```bash
cd apps/server
npm test
```

Resultado esperado: `packages/shared` 14 testes, `apps/server` 3 testes, tudo
verde.

## Outros comandos úteis do Prisma (dentro de `apps/server`)

| Comando | O que faz |
|---|---|
| `npm run prisma:migrate` | Cria/aplica uma nova migration a partir de mudanças no `schema.prisma` (ambiente dev) |
| `npm run prisma:migrate:deploy` | Aplica migrations pendentes sem gerar novas (o que roda em CI/prod) |
| `npm run prisma:generate` | Regenera o Prisma Client em `src/generated/prisma` (gitignored) |
| `npm run prisma:seed` | Roda `prisma/seed.ts` (idempotente, pode rodar várias vezes) |

## Verificação completa (o que eu rodei antes de comitar)

```bash
npm run build          # tsc --noEmit em todos os workspaces
npm run lint            # eslint .
npm run format:check    # prettier --check .
npm test                # todos os workspaces
```

Todos passando limpos no momento do commit.

## Pendências / notas para retomar

- `docs/2026-07-07-flowboard-roadmap.md` ainda tem o placeholder
  `<hash-real>` nas linhas de Phase 1 e Phase 2 do `Status` — nunca foi
  substituído pelo hash real do commit (mesmo "bug" já existia desde a
  Fase 1). Trocar por `8d3cc9d` (Phase 2) se quiser deixar o roadmap exato.
- Existe uma deleção pendente e não commitada, de antes desta sessão:
  `docs/superpowers/plans/2026-07-07-flowboard-phase0-bootstrap.md` (aparece
  como `D` no `git status`). Não mexi nisso — decidir separadamente se deve
  ser commitada ou restaurada.
- Próxima fase do roadmap: **Fase 3 — Backend REST API** (Express/Fastify,
  auth signup/login com bcrypt + JWT, CRUD de Board/Card). Depende desta
  Fase 2 (schema) e da Fase 1 (`packages/shared`), ambas concluídas.
