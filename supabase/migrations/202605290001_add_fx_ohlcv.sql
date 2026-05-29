-- ============================================================
-- Forex OHLCV storage (single-user trade journal)
-- Canonical timezone: UTC everywhere. No weekend bars stored.
-- Scope: 7 majors, daily + 1h, ~10 years.
-- Source of truth: Dukascopy (bank-feed reference data).
--
-- See scripts/fx-backfill/ for the ingestion pipeline.
-- ============================================================

create table if not exists public.fx_ohlcv (
    pair        text             not null,      -- e.g. 'EURUSD'
    timeframe   text             not null,      -- '1d' | '1h'
    ts          timestamptz      not null,      -- bar OPEN time, UTC
    open        double precision not null,
    high        double precision not null,
    low         double precision not null,
    close       double precision not null,
    volume      double precision,               -- Dukascopy tick volume; nullable
    primary key (pair, timeframe, ts)
);

-- The PK (pair, timeframe, ts) already serves the only query shape we ever run:
-- "give me PAIR at TIMEFRAME between A and B, ordered by ts".  That's a covering
-- range scan on the PK btree — no extra index needed.

-- Constrain the domain so bad data can't silently land.
alter table public.fx_ohlcv
    add constraint fx_pair_chk
    check (pair in ('EURUSD','USDJPY','GBPUSD','USDCHF','AUDUSD','USDCAD','NZDUSD'));

alter table public.fx_ohlcv
    add constraint fx_tf_chk
    check (timeframe in ('1d','1h'));

-- Sanity: high is the max, low is the min.
alter table public.fx_ohlcv
    add constraint fx_hilo_chk
    check (high >= low and high >= open and high >= close
           and low <= open and low <= close);

-- Shared reference data: public read, writes restricted to service_role.
alter table public.fx_ohlcv enable row level security;

create policy "fx read" on public.fx_ohlcv
    for select using (true);

grant select on public.fx_ohlcv to authenticated, anon;
