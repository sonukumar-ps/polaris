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

Not applied yet. Apply the core migration during `DB-003D`. Apply the optional event
trigger migration only after confirming permissions.
