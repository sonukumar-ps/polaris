# RLS Verification

Verified: 2026-05-19

## Scope

RLS behavior was verified against the linked Supabase dev project using rollback-only
test transactions.

## Results

| Check | Result |
| --- | --- |
| Authenticated user A can read own profile only | Pass |
| Authenticated user B can read own profile only | Pass |
| Anonymous user cannot read profiles | Pass |
| Authenticated user can insert and read shared assets | Pass |

## Notes

- The first behavior test found missing table grants for the `authenticated` role.
- Migration `202605190003_grant_app_role_table_access.sql` grants app table privileges
  while leaving row access constrained by RLS policies.
- Anonymous profile access is denied at the privilege layer.
- Test rows were created inside transactions and rolled back.
