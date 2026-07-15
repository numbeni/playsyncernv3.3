# Decision Log

## 2026-07-14 — Baseline

The official development baseline is `playsyncernv3.1-main.zip`.

A later schema-alignment attempt was fully reverted. The project returned to the v3.1 source baseline before PS-01.

## Development Workflow

- ChatGPT Command Center defines scope and reviews results.
- Replit implements the approved phase prompt.
- Each phase ends with a ZIP, diff, test results, risks, and rollback notes.
- Replit must follow `AGENTS.md` and `docs/CURRENT_PHASE.md`.
- Product rules are defined in `docs/PRODUCT_RULES.md`.
## 2026-07-15 — PS-02A Closure and PS-02B Activation

PS-02A — Games Contract and Backend has completed its approved backend and data-layer scope and produced the v3.3 candidate baseline.

The source package selected for the start of PS-02B is:

- canonical name: `playsyncernv3.3-main.zip`
- reviewed uploaded name: `playsyncernv3.3-main (2)(1).zip`
- SHA-256: `b286da981acd0c645ef1ad3f73f921fea8936323118135ee84001e799ef4430c`

The Games Vertical Slice is executed through two controlled subphases:

- PS-02A — Games Contract and Backend
- PS-02B — Games Frontend API Integration and Mock Authority Removal

PS-02B is now the active phase.

Its first gate is a read-only frontend integration audit. No implementation patch is authorized before that audit is reviewed and approved.

PS-02B must connect the existing Games UI to the PS-02A API and remove Games mock data as runtime authority.

PS-02B must not expand into:

- database schema changes
- new migrations
- Account backend integration
- Capacity backend integration
- Game JSON Import
- Orders
- Store Mapping
- Connector or Push Delivery
- Authentication or RBAC
- broad architecture refactoring

The backend remains authoritative for Games validation and business rules.

No PlaySyncer product rule was changed by this phase transition.

## 2026-07-15 — PS-02B Stage B Fix1

- Stage B initially applied the existing PS-02A migration to the shared Replit database without explicit Command Center approval.
- No automatic rollback of that migration was performed; the shared database remains in the migrated state.
- Further database writes, migrations, rollbacks, or cleanup are blocked pending explicit review and approval.
- Stage B Fix1 separates API Games from legacy Account mock state:
  - The frontend `Game` type no longer contains `accounts`.
  - `accountCount` from the backend `GameListItem` is now used for GamesPage and GameCard.
  - Legacy mock data remains in `src/mocks/playSyncerMockData.ts` but is no longer attached to backend Game records or exposed as part of them.
  - Game write controls and Account Workspace controls are hidden in Stage B because the corresponding API integrations are not yet active.

## 2026-07-15 — PS-02B Stage C1

- Stage C1 authorizes Create, Edit and Status writes through the existing Games API (`POST /api/games` and `PATCH /api/games/:id`).
- Delete Game remains outside this stage and is not implemented.
- No migration, schema change, or direct SQL is authorized.
- Account, Capacity and Order integration remain out of scope.
- Synthetic Stage C1 test Game: `bea1fcbe-137f-4221-b877-1d71c2a64b88` (title: `PS02B C1 Test Edited 2026-07-15T15:17:31Z`).
- Validation performed: typecheck, production build, backend tests, API create/edit/status calls, duplicate-title rejection, platform change with zero accounts, and browser console verification.
- Known limitations: Account Workspace remains pending; Delete is not implemented; SmartSearch only searches games.

## 2026-07-15 — PS-02B Stage C2A

- Stage C1 is accepted with deferred corrections.
- Stage C2A hardens Create, Edit and Status mutations before Delete integration.
- Synchronization: every mutation now awaits the API call and then awaits an explicit `queryClient.refetchQueries` of the Games list before resolving.
- Error display: ConfirmDialog now shows a safe Persian error on failed Status changes; the dialog stays open and the user can retry.
- Duplicate request prevention: synchronous `useRef` locks guard Create, Edit and Status; UI buttons and Escape/backdrop are disabled while pending.
- Synthetic Stage C2A test Game: `bea1fcbe-137f-4221-b877-1d71c2a64b88` (current title: `PS02B C2A Test 2026-07-15T15:35:25Z`).
- Validation performed: typecheck, production build, backend tests, API create/edit/status calls, duplicate-title rejection, and browser console review.
- No backend route, OpenAPI, generated client, Account/Capacity, `.agents/memory`, or dependency changes.
- Delete Game and Stage C2B remain out of scope.
## 2026-07-15 — PS-02B Stage C2B Activation in New Replit Workspace

- Stage C2A is accepted with one UI-lock correction deferred to Stage C2B.
- The project was transferred to a new Replit workspace.
- The actual imported Stage C2B input package is:
  - file: `playsyncernv3.3-main (6).zip`
  - SHA-256: `3548726894e3a4875dd273430d7d4f9f4f10e428afccfc3afe8f49c1c92aee22`
- This actual imported archive is the authoritative baseline for the new workspace.
- Stage C2B authorizes:
  - immediate UI-level locking correction
  - Delete Game integration through the existing generated API client
  - final Games write verification
- No migration, schema change, direct SQL, OpenAPI change, generated-client change, or new dependency is authorized.
- The database in the new Replit workspace must not be assumed to match the previous workspace.
- If the Games API is blocked by missing database readiness, implementation must stop and the blocker must be reported.
- Account, Capacity, Order and Stage D work remain outside the authorized scope.

## 2026-07-15 — PS-02B Stage C2B Code Complete / DB Blocked

### Code changes (all within authorized scope)

**Part 1 — Synchronous UI mutation lock correction:**

- `artifacts/playsyncer/src/components/GameFormModal.tsx`: Added `submittingRef = useRef(false)`. The ref is set synchronously as the first action in `handleSubmit`, before any `setState` or `await`. On success the lock stays active during the close animation; on failure both ref and state are released for retry. The `open` effect resets the ref on every new open cycle.
- `artifacts/playsyncer/src/components/ConfirmDialog.tsx`: Added `pendingRef = useRef(false)` (imported `useRef`). Same pattern — ref set before `setPending(true)`, released only on failure. Escape/backdrop check now reads `pendingRef.current` instead of `isPending` state.

**Part 2 — Delete Game integration:**

- `artifacts/playsyncer/src/lib/apiErrors.ts`: Added `ApiErrorContext` interface and optional `context?: { operation?: "delete" }` parameter to `formatApiError`. A 409 with `operation: "delete"` returns the Persian dependency message: *"این بازی دارای اکانت یا سفارش است و امکان حذف ندارد. می‌توانید وضعیت آن را به غیرفعال تغییر دهید."*
- `artifacts/playsyncer/src/hooks/useGames.tsx`: Imported `useDeleteGame`. Changed `GameMutations.deleteGame` type from `void` to `Promise<void>`. Added `deleteLockRef` and `deleteGameMutation`. Implemented `deleteGame` with synchronous ref lock, `mutateAsync`, `syncGamesList`, and formatted error re-throw with `{ operation: "delete" }` context.
- `artifacts/playsyncer/src/components/GameCard.tsx`: Added `Trash2` import, `onDelete?: (game: Game) => void` prop, and destructive delete button in the footer action row.
- `artifacts/playsyncer/src/pages/GamesPage.tsx`: Added `deleteTarget`, `hasAccountsDialogOpen`, and `deleteConfirmOpen` state. `openDeleteDialog` branches on `accountCount > 0` (info-only dialog, no API call) vs `accountCount === 0` (destructive ConfirmDialog that calls `mutations.deleteGame`). Backend 409/404/network errors are surfaced in Persian via `formatApiError`. Delete action passed as `onDelete` to `GameCard`.

### Validation results

- `pnpm run typecheck`: **PASS** (all 4 packages clean)
- `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/playsyncer run build`: **PASS** (1759 modules, no errors)
- `pnpm --filter @workspace/api-server run test`: **PASS** (28/28 tests including hard-delete with/without account history)

### DB blocker — runtime testing not performed

This is a new Replit workspace. The PostgreSQL database is reachable (`/api/readyz → {"status":"ok","checks":{"database":"ok"}}`) but the schema has never been applied here (`relation "games" does not exist`).

Per Stage C2B and CURRENT_PHASE.md rules, implementation is stopped at this point. No migrations, direct SQL, or `drizzle-kit push` were run.

Blocked validations pending DB authorization:
- Create/Edit/Status regression check
- Rapid-click lock check in browser
- Delete empty Game success path
- Delete failure (409) keeping Game visible
- Refresh after deletion
- SmartSearch reflection of deletion
- Browser console review

### No migration or direct SQL was run. Stage D was not started.

### Rollback instructions

Revert the 6 changed files to their previous committed state:
- `artifacts/playsyncer/src/components/GameFormModal.tsx`
- `artifacts/playsyncer/src/components/ConfirmDialog.tsx`
- `artifacts/playsyncer/src/hooks/useGames.tsx`
- `artifacts/playsyncer/src/components/GameCard.tsx`
- `artifacts/playsyncer/src/pages/GamesPage.tsx`
- `artifacts/playsyncer/src/lib/apiErrors.ts`

No database changes were made in this stage; there is no DB rollback step.