# Initial Migration Review

Reviewed: 2026-05-19

## Scope

The initial migration creates the V1 schema for manual trade journaling:

- Profiles
- Trading accounts
- Assets
- Trades
- Tags
- Trade tags
- Trade images
- Daily account snapshots

It also creates enums, analytics-oriented indexes, and explicit Row Level Security policies.

The optional follow-up migration `202605190002_optional_rls_event_trigger.sql` creates an
event trigger intended to enable RLS automatically on future `public` tables.

## Review Notes

- User-owned tables use `auth.uid()` checks for access control.
- `trade_tags` verifies ownership of both the trade and tag.
- `assets` are shared reference data: authenticated users may read and insert them.
- The event trigger is a guardrail only. Each table still needs explicit policies.
- Supabase may reject `CREATE EVENT TRIGGER` depending on available privileges. If that
  happens during application, skip the optional trigger migration while keeping the core
  schema and explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements.

## Application Status

Core migration `202605190001` applied to Supabase dev on 2026-05-19.

Optional event trigger migration `202605190002` applied to Supabase dev on 2026-05-19.
The event trigger `enable_rls_on_public_table_create` exists and is enabled for
`ddl_command_end`.

Grant migration `202605190003` added after RLS behavior testing showed that policies
existed but the `authenticated` role lacked table privileges. It grants authenticated
app users table access that remains constrained by RLS policies.

Migration `202605190003` applied to Supabase dev on 2026-05-19 and is recorded in
Supabase migration history.
