# Current Work Queue

This is the near-term sequential queue. Work from top to bottom.

## Ready

### SETUP-001: Reconcile roadmap with actual repo state

- Type: Project Setup
- Status: Done
- Priority: P0
- Depends On: None
- Acceptance Criteria:
  - Roadmap reflects installed dependencies and generated lockfile.
  - Supabase work is represented as pending where local implementation files are not present.
  - Migration status is clear and not marked complete until migration files exist and are applied.
- Implementation Notes:
  - Completed as part of creating this docs-based task system.

### SETUP-002: Verify app boots on web

- Type: Project Setup
- Status: Done
- Priority: P0
- Depends On: SETUP-001
- Acceptance Criteria:
  - `npm run web` starts successfully.
  - Any blocking Expo config issue is captured as a follow-up task.
  - If the app runs, mark the web boot item done in `roadmap.md`.
- Implementation Notes:
  - Use the existing Expo Router app shell.
  - Do not change product UI unless a boot blocker requires it.

### SETUP-003: Verify native boot path

- Type: Project Setup
- Status: Done
- Priority: P1
- Depends On: SETUP-002
- Acceptance Criteria:
  - App launches through Expo Go or a development build path is documented.
  - Any missing native setup requirement is captured as a follow-up task.
- Implementation Notes:
  - Prefer Expo Go first for speed.
  - Use EAS development build only if Expo Go is insufficient.
  - Native boot path is documented in `docs/dev/native-boot.md`.

### DB-001: Add Supabase client and local setup files

- Type: Backend
- Status: Done
- Priority: P0
- Depends On: SETUP-001
- Acceptance Criteria:
  - `@supabase/supabase-js` is installed and committed to `package.json`.
  - React Native URL polyfill is installed if needed for native compatibility.
  - A shared Supabase client module exists.
  - Setup docs explain required env variables without including secret values.
- Implementation Notes:
  - Use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - Keep `.env` ignored.
  - Verified with `npm run typecheck`.

### DB-002: Create initial database migration

- Type: Backend
- Status: Done
- Priority: P0
- Depends On: DB-001
- Acceptance Criteria:
  - Migration creates V1 tables, enums, indexes, and RLS policies.
  - Migration includes or documents the automatic RLS event trigger guardrail.
  - Migration is reviewed before applying to hosted Supabase.
- Implementation Notes:
  - Include profiles, accounts, assets, trades, tags, trade tags, trade images, and daily account snapshots.
  - Do not run the migration until explicitly requested.
  - Reviewed in `docs/backend/migration-review.md`.

### DB-003A: Install and verify Supabase CLI

- Type: Project Setup
- Status: Done
- Priority: P0
- Depends On: DB-002
- Acceptance Criteria:
  - Supabase CLI is available locally.
  - CLI version can be printed.
  - Setup docs explain how migrations will be applied.
- Implementation Notes:
  - Prefer a project dev dependency or documented Homebrew install path.
  - Do not link the project or run migrations in this task.
  - Verified Homebrew CLI at `/opt/homebrew/bin/supabase`, version `2.98.2`.

### DB-003B: Link Supabase dev project

- Type: Backend
- Status: Done
- Priority: P0
- Depends On: DB-003A
- Acceptance Criteria:
  - Local repo is linked to the intended Supabase dev project.
  - Project reference is documented without exposing secrets.
  - No migrations are applied yet.
- Implementation Notes:
  - Requires Supabase access token or interactive login.
  - Linked project ref verified as `nytguikgehrallvesmql`.
  - Codex shell still cannot use remote CLI commands without `SUPABASE_ACCESS_TOKEN`.

### DB-003C: Split optional RLS event trigger migration

- Type: Backend
- Status: Done
- Priority: P0
- Depends On: DB-003B
- Acceptance Criteria:
  - Core schema migration can apply without relying on event trigger privileges.
  - Optional event trigger guardrail lives in a separate migration or documented follow-up.
- Implementation Notes:
  - Keep explicit RLS enable statements in the core migration.
  - Core schema is `202605190001_initial_schema.sql`.
  - Optional event trigger guardrail is `202605190002_optional_rls_event_trigger.sql`.

### DB-003D: Apply core migration to Supabase dev

- Type: Backend
- Status: Todo
- Priority: P0
- Depends On: DB-003C
- Acceptance Criteria:
  - Tables, enums, indexes, and RLS policies exist in the dev Supabase project.
  - No seed or user app data is required.
- Implementation Notes:
  - Apply only `202605190001_initial_schema.sql` first.
  - Apply `202605190002_optional_rls_event_trigger.sql` only after confirming event trigger permissions.

### DB-003E: Generate database TypeScript types

- Type: Backend
- Status: Todo
- Priority: P1
- Depends On: DB-003D
- Acceptance Criteria:
  - App has generated TypeScript database types.
  - Supabase client is typed with the generated database type.
- Implementation Notes:
  - Store generated types in a stable app path and avoid manual edits.

### DB-004: Verify RLS behavior

- Type: QA
- Status: Todo
- Priority: P0
- Depends On: DB-003D
- Acceptance Criteria:
  - Anonymous access is denied where expected.
  - Authenticated users can access only their own user-owned rows.
  - Shared/reference data behavior is documented for assets.
- Implementation Notes:
  - Create minimal test rows only if needed and clean them up afterward.

### AUTH-001: Build auth route structure

- Type: Feature
- Status: Todo
- Priority: P0
- Depends On: DB-004
- Acceptance Criteria:
  - App has public auth screens and protected app screens.
  - Unauthenticated users are routed away from protected screens.
  - Authenticated users are routed away from sign-in screens.
- Implementation Notes:
  - Use Expo Router route groups.
  - Keep styling simple until the auth flow works.

### AUTH-002: Implement sign up, sign in, and sign out

- Type: Feature
- Status: Todo
- Priority: P0
- Depends On: AUTH-001
- Acceptance Criteria:
  - Email sign up works against Supabase.
  - Email sign in works against Supabase.
  - Sign out clears the local session.
  - Session persists across web reload.
- Implementation Notes:
  - Keep error states visible and plain.
  - Avoid adding OAuth until after V1 email auth works.

### AUTH-003: Create profile row on signup

- Type: Backend
- Status: Todo
- Priority: P0
- Depends On: AUTH-002
- Acceptance Criteria:
  - New auth users receive a matching `profiles` row.
  - Profile creation is idempotent.
  - Failure mode is visible during sign up or first session load.
- Implementation Notes:
  - Prefer a database trigger if it fits Supabase permissions cleanly.
  - Otherwise, use a client-side upsert immediately after signup/session creation.

### TRADE-001: Build manual trade form skeleton

- Type: Feature
- Status: Todo
- Priority: P0
- Depends On: AUTH-003
- Acceptance Criteria:
  - User can enter asset, direction, entry price, exit price, size, fees, opened date, closed date, and notes locally.
  - Required fields are validated.
  - Form state is ready to connect to Supabase persistence in a later task.
- Implementation Notes:
  - Start with local state and validation.
  - Persistence belongs in a follow-up task after the form shape is stable.
