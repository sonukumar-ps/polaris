-- ============================================================
-- Forex OHLCV storage  (single-user trade journal)
-- Canonical timezone: UTC everywhere. No weekend bars stored.
-- Scope: 7 majors, daily + 1h, ~10 years.
-- Source of truth: Dukascopy (bank-feed reference data).
-- ============================================================

-- One table for both timeframes. timeframe column keeps it simple
-- and the composite PK makes range queries fast regardless.
create table if not exists fx_ohlcv (
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
alter table fx_ohlcv
    add constraint fx_pair_chk
    check (pair in ('EURUSD','USDJPY','GBPUSD','USDCHF','AUDUSD','USDCAD','NZDUSD'));

alter table fx_ohlcv
    add constraint fx_tf_chk
    check (timeframe in ('1d','1h'));

-- Sanity: high is the max, low is the min.  Cheap guard against malformed rows
-- from a parsing bug.
alter table fx_ohlcv
    add constraint fx_hilo_chk
    check (high >= low and high >= open and high >= close
           and low <= open and low <= close);

-- ============================================================
-- Single-user RLS:
-- This table is shared *reference* data (not per-user rows), so it's read-only
-- public-ish content. Enable RLS and allow read to any role; restrict writes to
-- the service role used by the ingestion job.
-- ============================================================
alter table fx_ohlcv enable row level security;

create policy "fx read" on fx_ohlcv
    for select using (true);

-- No insert/update/delete policy => only the service_role key can write,
-- which is exactly what the one-time backfill (and future top-up) uses.
