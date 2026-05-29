-- Grant write access to the service_role so the backfill loader can insert.
-- The service_role bypasses RLS but still needs table-level GRANTs.
-- Public SELECT is already granted via the original migration's RLS policy.

grant insert, update, delete on public.fx_ohlcv to service_role;
