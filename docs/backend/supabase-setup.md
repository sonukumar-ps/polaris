# Supabase Setup

Use this checklist when creating the hosted Supabase project.

## Project

- Create a new Supabase project named `polaris`.
- Choose the region closest to the first target users.
- Store the database password in your password manager.

## App Environment

Copy `.env.example` to `.env` and fill these values from Supabase project settings:

```sh
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit `.env`.

## Database

Apply migrations from `supabase/migrations` in filename order.

Review notes for the initial migration live in `docs/backend/migration-review.md`.
The full schema ERD lives in `docs/backend/erd.md`.

The core schema migration is `202605190001_initial_schema.sql`. The event trigger
guardrail is intentionally split into `202605190002_optional_rls_event_trigger.sql`
because managed Postgres environments can restrict `CREATE EVENT TRIGGER`.

Preferred migration workflow:

1. Install and verify the Supabase CLI.
2. Link this repo to the Supabase dev project.
3. Apply core schema migrations to dev.
4. Verify RLS behavior.
5. Generate TypeScript database types.
6. Apply the same migrations to production only after dev verification.

## CLI

- Install path verified: `/opt/homebrew/bin/supabase`
- Version verified: `2.98.2`
- Linked project ref verified: `nytguikgehrallvesmql`
- Core migration applied and recorded: `202605190001`
- Optional event trigger migration applied and recorded: `202605190002`
- App role grants migration applied and recorded: `202605190003`
- Profile-on-signup trigger migration applied and recorded: `202605200001`
- Version check command:

```sh
/opt/homebrew/bin/supabase --version
```

## Type Generation

Generated database types live at `lib/database.types.ts`.

Regenerate them after schema changes with:

```sh
/opt/homebrew/bin/supabase gen types typescript --linked --schema public > lib/database.types.ts
```

Remote Supabase CLI commands require an authenticated shell. If Codex cannot see the
Supabase login token, run remote commands from your local terminal or provide a temporary
`SUPABASE_ACCESS_TOKEN` in the environment.

The initial migration creates:

- Profiles
- Trading accounts
- Strategies
- Assets
- Trades
- Tags
- Trade tags
- Trade images
- Daily account snapshots
- Private Storage bucket for trade chart screenshots
- Row Level Security policies for user-owned data

RLS verification results live in `docs/backend/rls-verification.md`.

The event trigger is a guardrail, not a replacement for policies. Every table still needs
explicit policies before client-side access should be expected to work.

Some managed Postgres environments restrict `CREATE EVENT TRIGGER`. If Supabase rejects
the optional guardrail migration, keep the explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
statements from the core migration and create the event trigger later from a role with sufficient
privileges.
