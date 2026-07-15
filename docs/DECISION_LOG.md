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