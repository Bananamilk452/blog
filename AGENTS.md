# Repository Instructions

## Commands

- Use `pnpm` with the pinned package manager in `package.json` (`pnpm@11.9.0`).
- Dev server: `pnpm dev`; production server after a build: `pnpm start`.
- Final checks for code changes: run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. Do not run `pnpm build` as the default final check.
- Tests: `pnpm test` runs `vitest run`; use `pnpm test -- <file-or-pattern>` for focused Vitest runs.
- Formatting/linting are mutating commands: `pnpm format` runs `oxfmt`, and `pnpm lint` runs `oxlint --fix`.
- Prisma commands go through `pnpm prisma <command>`; the schema is `src/prisma/schema.prisma` via `prisma.config.ts`.

## Architecture

- This is a Next.js App Router app under `src/app`; imports use `~/*` for `src/*`.
- Fediverse/ActivityPub support is wired through `src/middleware.ts` using `@fedify/next`; core Fedify setup and dispatch/inbox handlers live in `src/federation.ts`.
- `src/federation.ts` requires `REDIS_URL` and `PUBLIC_URL` at module load. Tests provide defaults in `vitest.setup.ts` and mock Redis/Fedify dependencies where needed.
- Prisma client is generated into `src/generated/prisma` and imported from `~/generated/prisma`, not `@prisma/client`.
- Database schema and migrations live under `src/prisma`; the datasource is PostgreSQL and uses `DATABASE_URL`.
- Runtime services for local containers are Postgres 17 and Redis 8 in `compose.dev.yml`; production compose uses `compose.yml`.

## Repo Quirks

- `next.config.ts` marks `rdf-canonize-native` as a false webpack alias for Fedify-related dependencies.
- Next image remote patterns depend on `S3_PUBLIC_URL`, so missing S3 env can affect config loading/build-like checks.
