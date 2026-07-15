# Current Phase

## Active Phase

PS-02A — Games Contract and Backend

## Status

ACTIVE

This phase is not completed until its source changes, migration, tests, and delivery evidence have been independently reviewed and accepted.

## Baseline

The active baseline is the completed PS-01 repository state.

PS-01 established:

- controlled versioned Drizzle migrations
- removal of automatic `drizzle-kit push`
- health and readiness endpoints
- centralized API error handling
- UUID validation
- controlled JSON request handling
- reusable encryption and keyed lookup-hash utilities

Do not revert or weaken PS-01 controls.

## Objective

Implement the approved Games domain rules in the database and backend.

This phase covers:

- Games data contract
- Games schema
- versioned Games migration
- title normalization
- duplicate-title protection
- Games API
- platform-change protection
- controlled status management
- controlled hard deletion
- Games OpenAPI contract
- generated API client/schema updates
- focused backend tests

Frontend integration and removal of Games runtime mocks belong to PS-02B and are not part of this phase.

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

Examples that must conflict:

- `FC 26`
- ` fc 26 `
- `FC   26`

Examples that may coexist:

- `FC 26`
- `FC 26 Ultimate Edition`

### Platform Rule

A Game platform may change only while the Game has no Account history.

Once at least one Account exists for the Game, its platform becomes immutable.

### Status Rule

Inactive Games remain stored and visible for management, search, and historical references.

Later Account and Assignment phases must block new operational usage of inactive Games.

### Deletion Rule

Hard deletion is allowed only when the Game has no Account or Order history.

Historical Accounts, Orders, Capacities, or related records must never be cascade-deleted.

When hard deletion is not allowed, the Game must remain stored and may be changed to `INACTIVE`.

## Allowed Scope

- inspect and minimally correct the existing Games schema
- create a new versioned migration
- implement database-backed Games API operations
- add reusable Games-domain validation and normalization
- update Games OpenAPI definitions
- regenerate existing generated schema/client outputs
- add focused Games backend tests
- update Games-specific documentation when technically necessary

## Prohibited Scope

- Games frontend integration
- removing frontend Games mocks
- redesigning Games UI
- Accounts implementation or redesign
- Capacity template implementation or redesign
- Orders implementation or redesign
- Store Mapping
- Assignment
- Connector
- Authentication
- Staff
- RBAC
- Dashboard
- unrelated refactoring
- changing the project stack
- adding dependencies without explicit approval
- modifying the shared/live database
- `drizzle-kit push`
- `drizzle-kit push --force`
- editing or replacing the initial migration

## Database Safety

Create a new migration for PS-02A.

Do not apply it to the existing shared Replit database.

Verify the complete migration chain only against a clean disposable PostgreSQL database.

## Completion Criteria

PS-02A may be submitted for review only when:

- Games schema matches the approved rules
- a new versioned migration exists
- migration chain succeeds on disposable PostgreSQL
- Games API is database-backed
- duplicate titles are rejected
- invalid UUID values return HTTP 400
- missing Games return HTTP 404
- conflicting business operations return HTTP 409
- platform changes are blocked after Account history exists
- hard deletion is controlled
- OpenAPI and generated outputs are synchronized
- backend typecheck, build, and focused Games tests pass
- no shared database was modified
- no Games frontend or unrelated product domain was changed

## Next Planned Phase

PS-02B — Games Frontend Integration