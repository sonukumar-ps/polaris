-- Grant SELECT on fx_ohlcv to service_role.
--
-- The original GRANT statement scoped SELECT to (authenticated, anon) and the
-- follow-up grant only added INSERT/UPDATE/DELETE. PostgREST's upsert returns
-- the affected rows (RETURNING clause), which requires SELECT — so even though
-- INSERT was granted, the loader hit 'permission denied' on the returning step.

grant select on public.fx_ohlcv to service_role;
