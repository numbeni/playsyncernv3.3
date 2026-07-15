# Current Phase

## Active Phase

PS-02B — Games Frontend API Integration and Mock Authority Removal

## Current Stage

PS-02B — Stage C2B: Final Mutation Lock and Delete Integration

## Status

STAGE_C_READY_FOR_REVIEW

## Input Baseline

- Imported package: `playsyncernv3.3-main (6).zip`
- Actual SHA-256: `3548726894e3a4875dd273430d7d4f9f4f10e428afccfc3afe8f49c1c92aee22`

The previous Stage C2A report referenced another exported-package SHA.

For this workspace, the actual imported archive SHA above is the authoritative input baseline.

## Accepted Previous State

Stage C2A is accepted with one correction deferred to Stage C2B.

Confirmed existing behavior:

- Games are loaded from the real API.
- Create Game uses the real API.
- Edit Game uses the real API.
- ACTIVE / INACTIVE changes use the real API.
- Games list synchronization is awaited.
- mutation errors are displayed.
- Games mock data is no longer runtime authority.
- Delete Game is not yet implemented.

Deferred correction:

- GameFormModal and ConfirmDialog require their own immediate synchronous lock so rapid clicks cannot cause the caller to treat a blocked request as successful.

## Stage C2B Objective

1. Complete immediate UI-level mutation locking.
2. Connect Delete Game to the existing Games API.
3. Verify Create, Edit, Status and Delete together.
4. Leave PS-02B ready for Stage D review.

## Required Delete Rules

- Hard Delete is allowed only when the Game has no Account or Order history.
- When `accountCount > 0`, the frontend must not knowingly send DELETE.
- The administrator must be advised to use `INACTIVE`.
- The Backend remains authoritative.
- A Backend `409` must not remove the Game from the UI.
- Games must never be removed through local-only state mutation.

## Database Restrictions

This project is now running in a new Replit workspace.

Do not assume that its database is the same database used in previous stages.

Before runtime testing, perform only a read-only database/API readiness check.

Do not run:

- `db:migrate`
- `drizzle-kit push`
- `drizzle-kit push --force`
- direct SQL writes
- schema changes
- rollback scripts

If the Games API cannot run because the database or migration state is missing, stop and report the blocker. Do not bootstrap or migrate the database without Command Center approval.

## Allowed Scope

- immediate UI locking for Create, Edit and Status
- Delete Game API integration
- Delete confirmation and error handling
- Games query synchronization
- focused Games write verification
- updates to `CURRENT_PHASE.md` and `DECISION_LOG.md`

## Out of Scope

- Stage D cleanup
- Account backend integration
- Capacity backend integration
- Orders
- Game Import
- Smart Search backend expansion
- Authentication or RBAC
- OpenAPI changes
- generated-client changes
- backend schema changes
- migrations
- new dependencies
- broad refactors
- `.agents/memory` changes

## Validation Required

- frontend typecheck
- frontend production build
- existing backend tests
- Create/Edit/Status regression check
- rapid-click locking check
- successful Delete of an empty synthetic Game
- failed Delete must keep the Game visible
- refresh after deletion
- SmartSearch synchronization
- browser console review
- database impact statement

## Completion Status

After successful implementation and evidence review, update the status to:

`STAGE_C_READY_FOR_REVIEW`

Do not mark PS-02B completed.

Do not start Stage D without Command Center approval.