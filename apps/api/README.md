# @dealpilot/api

DealPilot backend — Hono + better-auth + Drizzle/Postgres.

## Local setup

```bash
pnpm db:up        # start the dealpilot-db Postgres container (host port 5434)
pnpm db:migrate   # apply Drizzle migrations from ./drizzle to DATABASE_URL
pnpm dev          # tsx watch, reads .env
```

Copy `.env.example` to `.env` first. Tests use a separate `dealpilot_test`
database (see `TEST_DATABASE_URL`); the vitest global setup migrates it.

## Database migrations

Schema lives in `src/db/schema.ts` (app tables) and `src/db/auth-schema.ts`
(better-auth tables — see below). Generate and apply:

```bash
pnpm db:generate   # drizzle-kit: diff schema -> new migration in ./drizzle
pnpm db:migrate    # apply pending migrations
```

## better-auth schema regeneration

`src/db/auth-schema.ts` holds the Drizzle definitions for the better-auth
tables (`user`, `session`, `account`, `verification`). It is **checked in** and
consumed by `src/db/schema.ts`. It is only needed at build/generate time — the
better-auth runtime does not read it.

**The `@better-auth/cli` package has been removed from this app's
dependencies.** Reasons:

- There is no stable `@better-auth/cli` release for the 1.5.x/1.6.x line (the
  npm `latest` tag is still 1.4.x; only 1.5.0-beta pre-releases exist). The
  1.4.x CLI cannot load a config that imports `better-auth@1.6.x` — its config
  loader depends on an incompatible `better-call` version and throws.
- Keeping the CLI forced a large, unused transitive subtree into the app
  (`@mrleebo/prisma-ast`, `chevrotain`, `better-sqlite3`, `@prisma/client`,
  `unrs-resolver`) that carried its own advisories (e.g. lodash code
  injection).

The current `auth-schema.ts` was verified to match `@better-auth/core@1.6.23`'s
`getAuthTables()` output **exactly** for this app's config (email + password,
Drizzle `pg` adapter, no OAuth/oidc/mcp/plugins). The 1.6.x security fixes are
runtime logic changes, not schema changes, so no columns/tables were added.
This is also asserted continuously by the integration suite, which drives the
real better-auth signup/signin flow against Postgres — a schema mismatch would
fail those tests.

### To regenerate in the future

`pnpm auth:generate` is intentionally stubbed to fail with a pointer to this
section. When better-auth ships a CLI compatible with the installed runtime
major (a stable `@better-auth/cli` >= 1.5), regenerate with a version pinned to
match `better-auth` in `package.json`, e.g.:

```bash
npx @better-auth/cli@<matching-version> generate \
  --config src/auth.ts --output src/db/auth-schema.ts -y
```

Then run `pnpm db:generate` to capture any resulting DDL as a migration, apply
it with `pnpm db:migrate`, and run `pnpm test` to confirm the auth flows still
pass. Until then, edit `auth-schema.ts` by hand if you change better-auth
options that affect the schema (added plugins, `additionalFields`, etc.), using
`@better-auth/core`'s `getAuthTables()` as the source of truth.
