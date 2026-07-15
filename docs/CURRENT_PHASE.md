# Current Phase

## Active Phase

PS-02B — Games Frontend API Integration and Mock Authority Removal

## Status

STAGE_C2A_READY_FOR_REVIEW

Stage C1 input baseline SHA-256: fa294680fa18e84c7522acfbe10e6d257c4df40b1cdeda09e857830acd618a2d
Stage C1 candidate/output SHA-256: f6781255375d694744048b509d7f0b52f1eeb1c9ddc7e6eb0142072cb159b625
Stage C2A output SHA-256: 089a51d75d7814bdf95d2cdaaf622fdb0af3a8c3128192b3939dd0a3e1ac9a87

Stage C2A: Mutation hardening for Create, Edit and Status. Await synchronization, display errors, prevent duplicate requests.

## Baseline

Canonical source package:

- File: `playsyncernv3.3-main.zip`
- SHA-256: `b286da981acd0c645ef1ad3f73f921fea8936323118135ee84001e799ef4430c`

The SHA-256 above was calculated from the uploaded archive named:

`playsyncernv3.3-main (2)(1).zip`

If the package is renamed to `playsyncernv3.3-main.zip` without changing its contents, the SHA-256 remains the same.

## Previous Phase

PS-02A — Games Contract and Backend

PS-02A established the Games backend and data layer, including the approved Games contract, database-backed API, validation rules, migrations, OpenAPI definitions, generated outputs, and focused backend verification.

PS-02A approval applies only to the scope and evidence of that phase.

It does not prove that:

- the Games frontend is connected to the backend
- frontend Games mutations use the API
- Games runtime mocks have been removed
- browser refresh preserves Games data
- Account Workspace remains compatible after frontend integration

Do not revert or weaken the controls established during PS-01 or PS-02A.

## Parent Vertical Slice

Games Vertical Slice

The controlled implementation split is:

- PS-02A — Games Contract and Backend
- PS-02B — Games Frontend API Integration and Mock Authority Removal

This split does not change the approved Games product rules.

## Objective

Connect the existing Games frontend to the real PS-02A backend and PostgreSQL persistence.

PS-02B must ensure that:

- Games are loaded from the real API.
- Create Game uses the real API.
- Edit Game uses the real API.
- Status changes use the real API.
- Delete Game uses the real API.
- Backend-generated Game IDs are used.
- Browser refresh preserves backend data.
- Games mock data is no longer the runtime authority.
- Backend validation and business-rule errors are surfaced correctly.
- Existing Account Workspace behavior is inspected and protected from accidental regression.

## Canonical Games Rules

### Platforms

Only these values are allowed:

- `PS5_ONLY`
- `PS4_ONLY`
- `PS4_AND_PS5`

### Statuses

Only these values are allowed:

- `ACTIVE`
- `INACTIVE`

### Title Rules

- A Game title is required.
- Surrounding whitespace must be removed.
- Repeated internal whitespace must collapse to one space.
- Duplicate detection must be case-insensitive.
- Exact normalized duplicate titles are forbidden.
- Distinct editions remain allowed.

### Platform Rule

A Game platform may change only while the Game has no Account history.

Once at least one Account exists for the Game, its platform becomes immutable.

Frontend disabled controls are UX only.

The backend remains authoritative and must reject an invalid platform change.

### Status Rule

Inactive Games remain stored and visible for management and historical references.

### Deletion Rule

Hard deletion is allowed only when the Game has no Account or Order history.

Games with Account or Order history must not be hard-deleted.

They may remain stored and be changed to `INACTIVE`.

Historical records must never be cascade-deleted by Games frontend operations.

## Execution Stages

### Stage A — Read-Only Frontend Integration Audit

The first PS-02B response must be read-only.

Required inspection includes:

- Games Page
- Game Card components
- Add Game dialog
- Edit Game dialog
- Delete or Disable dialog
- Games Provider, Context, hooks and reducers
- `useGames` or equivalent frontend state layer
- `playSyncerMockData` and every Games-related import
- frontend Game types
- backend Game DTOs
- OpenAPI definitions
- generated API client and schemas
- PS-02A Games routes, services and error responses
- frontend-generated Game IDs
- Game routing
- Account Workspace dependencies on Game mock records
- Game Card statistics
- loading, error, empty and retry behavior
- cache invalidation or local state update behavior
- available package scripts and tests

Stage A must produce:

1. Facts
2. Assumptions
3. Risks
4. Conflicts
5. Current frontend data flow
6. Current backend API contract
7. Games mock dependency map
8. Account Workspace compatibility risks
9. Minimal file-level patch plan
10. Validation plan
11. Rollback plan
12. Blockers and missing evidence

During Stage A:

- do not modify files
- do not create a patch
- do not remove mock data
- do not install dependencies
- do not regenerate clients
- do not run migrations
- do not refactor the application

### Stage B — Games Read Integration

Only after explicit approval of Stage A:

- load Games from the real API
- implement controlled loading state
- implement empty state
- implement error state
- implement controlled retry
- display real backend Game fields and statistics
- preserve data after refresh
- remove Games mock data as the Games Page runtime authority

Do not remove unrelated Account mock data without an approved compatibility plan.

### Stage C — Games Write Integration

Only after Stage B evidence has been reviewed:

- connect Create Game
- connect Edit Game
- connect `ACTIVE` and `INACTIVE` status changes
- connect Delete Game
- use backend-generated IDs
- prevent duplicate submission
- surface validation, not-found and conflict errors
- update or invalidate cached Games safely
- stop performing Games mutations only in local React state

### Stage D — Cleanup and Verification

- remove obsolete Games mock mutation logic
- remove Games mock runtime authority
- ensure frontend platform changes never regenerate Account capacities
- ensure Game Card statistics come from the backend contract
- verify Account Workspace compatibility
- run available static checks
- run focused frontend and API integration checks
- collect manual browser evidence
- prepare rollback notes and phase handoff

## Allowed Scope

- inspect Games frontend data flow
- connect existing Games UI to PS-02A API
- minimally adapt frontend Game types to the real API contract
- add Games loading, empty, error and retry states
- connect Games create, edit, status and delete operations
- safely synchronize Games UI after mutations
- remove Games mock data as runtime authority
- add or update focused Games frontend tests
- regenerate existing API clients only when required by the verified repository workflow
- make minimal compatibility changes necessary to prevent Account Workspace regression
- update PS-02B-specific documentation

## Prohibited Scope

- Game JSON Import implementation
- Account backend integration
- Capacity backend integration
- Account schema redesign
- Capacity template redesign
- Smart Search
- Orders
- Store Mapping
- Assignment Engine
- WooCommerce Connector
- Push Delivery
- Authentication
- OTP
- Staff Management
- RBAC
- Dashboard
- broad Provider or state-management refactoring
- architecture rewrite
- stack changes
- new dependencies without explicit approval
- database schema changes
- new database migrations
- modifying the shared or live database
- `drizzle-kit push`
- `drizzle-kit push --force`
- unrelated UI redesign

## Database Safety

PS-02B is expected to require no database schema change and no new migration.

If frontend integration reveals a missing or incompatible backend contract that requires a schema or migration change:

1. stop implementation
2. report the exact blocker
3. provide evidence
4. return the decision to the Command Center

Do not silently expand PS-02B into backend or migration work.

## Required Validation Evidence

At the appropriate implementation stages, provide:

- exact files changed
- concise diff summary
- runtime changes
- documentation-only changes
- API contract used
- generated-client status
- typecheck output
- build output
- available test output
- Games API request and response evidence
- browser refresh persistence evidence
- Create Game evidence
- duplicate-title rejection evidence
- Edit Game evidence
- platform-lock evidence
- status persistence evidence
- allowed-delete evidence
- blocked-delete evidence
- Account Workspace regression evidence
- browser console error review
- database impact statement
- known risks
- rollback steps

Use only scripts confirmed in the repository package files.

Do not invent lint or test commands that do not exist.

## Completion Criteria

PS-02B may be submitted for final review only when direct evidence shows that:

- Games are loaded from the real backend.
- Games mock data is no longer the runtime authority.
- Create Game persists through the API.
- Edit Game persists through the API.
- Status changes persist through the API.
- Delete Game uses backend rules.
- Backend-generated IDs are used.
- Refresh does not restore old mock Games.
- normalized duplicate titles are rejected.
- platform changes are blocked after Account history exists.
- Games with dependencies are not hard-deleted.
- Game Card statistics come from real backend data.
- Account Workspace has not crashed or silently lost its Game linkage.
- available typecheck, build and focused tests pass.
- no shared database was modified.
- no out-of-scope domain was implemented.

## Next Gate

PS-02B Stage A — Read-Only Frontend Integration Audit

## Next Planned Product Capability

After PS-02B is completed and accepted, the next phase must be selected by the Command Center.

Game JSON Import must remain a separate controlled phase and is not automatically authorized by completion of PS-02B.