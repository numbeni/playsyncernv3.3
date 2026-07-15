# PS-02A Games Contract and Backend — Delivery Summary

## What was implemented

1. **Database schema**
   - Added `title_normalized` to `games` with a unique partial index covering only non-soft-deleted rows.
   - Reused `normalizeGameTitle()` in `lib/db` for trim/collapse/lowercase normalization.
   - Updated `game_status` enum to uppercase `ACTIVE`/`INACTIVE` to match the PS-02A contract.
   - Generated a single clean migration `0001_glossy_onslaught.sql`; the initial migration `0000_zippy_leech` was left untouched.

2. **Games API (`artifacts/api-server/src/routes/games.ts`)**
   - `POST /api/games` normalizes the title and returns `409` on duplicate normalized titles (no raw DB error codes leaked).
   - `PATCH /api/games/:id` blocks changes to `platform` when accounts already exist for that game.
   - `DELETE /api/games/:id` performs a hard delete only when no accounts reference the game; otherwise returns `409`.
   - `GET` endpoints and `PATCH status` support the new uppercase `ACTIVE`/`INACTIVE` contract.
   - All game route errors are routed through the centralized error handler.

3. **Contract / clients**
   - Updated `lib/api-spec/openapi.yaml` with Games paths, schemas, and tags.
   - Regenerated `lib/api-zod` and `lib/api-client-react` outputs.

4. **Tests**
   - Added `lib/db/src/helpers/title-normalizer.test.ts`.
   - Added `artifacts/api-server/src/routes/games.test.ts` covering create, duplicate detection, UUID validation, platform guard, status change, hard-delete guard, and listing.
   - Added disposable PostgreSQL helper `artifacts/api-server/src/lib/test-pg.ts` and a migration verification script `scripts/verify-games-migration.ts`.

## Verification run

- `pnpm run typecheck` — passed
- `pnpm --filter @workspace/db run test` — 6/6 passed
- `pnpm --filter @workspace/api-server run test` — 18/18 passed (crypto + games)
- `pnpm --filter @workspace/api-server run build` — succeeded
- `node --experimental-strip-types scripts/verify-games-migration.ts` — games schema confirmed (title_normalized, partial unique index, status, platform)

## Checklist watch-outs

- No `drizzle-kit push` was added to build, deploy, or post-merge automation. The existing `push`/`push-force` manual scripts in `lib/db/package.json` remain unchanged and are for manual use only.
- The initial migration `0000_zippy_leech` was not modified.
- The frontend (`artifacts/playsyncer`) was not touched for this phase.
- No new sensitive logging (passwords, encrypted values) was added to the games route or helper.

## Intentionally deferred

Order-history deletion protection is **not** implemented because the current schema has no direct or reliable indirect relation from orders to games. A future schema change should add that link before enforcing order-history guards.
