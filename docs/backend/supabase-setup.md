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

The initial migration creates:

- A Postgres event trigger that enables RLS automatically on newly-created `public` tables
- Profiles
- Trading accounts
- Assets
- Trades
- Tags
- Trade tags
- Trade images
- Daily account snapshots
- Row Level Security policies for user-owned data

The event trigger is a guardrail, not a replacement for policies. Every table still needs
explicit policies before client-side access should be expected to work.

Some managed Postgres environments restrict `CREATE EVENT TRIGGER`. If Supabase rejects
that statement, keep the explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements
and create the event trigger later from a role with sufficient privileges.
