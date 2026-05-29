# Forex OHLCV backfill — 7 majors, daily + 1h, 10 years

A one-time historical backfill of clean reference price data into Supabase
(free tier), with a browser cache layer to keep read load low.

## Locked design decisions

| Decision | Choice | Why |
|---|---|---|
| Source | **Dukascopy** (via `dukascopy-node`) | Trade Nation has no market-data API/export, and its quotes are spread-bet prices, not a clean reference. Dukascopy is the best free bank-feed reference. |
| Pairs | EURUSD, USDJPY, GBPUSD, USDCHF, AUDUSD, USDCAD, NZDUSD | The 7 classic majors. |
| Timeframes | `1d` + `1h` | 1h is the forex sweet spot for entry / exit context. |
| Timezone | **UTC everywhere** | Single canonical zone prevents join corruption between trades and bars. |
| Weekend bars | **Dropped** | Cleaner; no fake weekend candles. |
| Flat bars | **Dropped** (`ignoreFlats: true`) | Removes zero-volume placeholder rows. |
| Price type | `bid` | Standard charting / reference convention. |
| Footprint | **~455k rows, ~59 MB** | ~12% of the 500 MB free tier. |

## What this is NOT

Not your *broker's* prices. Dukascopy is a neutral reference. Your Trade
Nation fills won't match exactly (TN bakes in spread). That's correct for a
journal: the reference says "where the market was," not "your exact fill."

## Run order

1. **Create the table** — open the Supabase SQL editor and run `schema.sql`.

2. **Backfill (on your own machine, needs open network to dukascopy.com):**

   ```bash
   cd scripts/fx-backfill
   npm i dukascopy-node
   node ingest.mjs
   ```

   Produces `out/fx_ohlcv.csv` (combined) plus per-pair CSVs. First run
   downloads ~10 yr of data; the local `.dukascopy-cache` makes re-runs
   fast.

3. **Load into Supabase:**

   ```bash
   npm i @supabase/supabase-js
   SUPABASE_URL="https://xxxx.supabase.co" \
   SUPABASE_SERVICE_KEY="your-service-role-key" \
   node load_supabase.mjs
   ```

   Idempotent (upsert on PK) — safe to re-run if it stops partway.

4. **Read from the browser with caching** — import `fxCache.js`:

   ```js
   import { createClient } from '@supabase/supabase-js';
   import { getBars } from './fxCache.js';

   const sb = createClient(URL, ANON_KEY);   // anon key in the browser
   const bars = await getBars(
     sb,
     'EURUSD',
     '1h',
     '2023-01-01T00:00:00Z',
     '2023-02-01T00:00:00Z'
   );
   ```

   Past windows served from IndexedDB after the first fetch → near-zero
   Supabase reads. Only the still-forming trailing bar is ever re-fetched.

## Verification scripts

Before relying on the pipeline end-to-end, two scripts confirm the
core behavior:

- `npm test` (or `node test-weekend.mjs`) — runs unit assertions against
  the weekend-drop + UTC rule with known timestamps: Fri 22:00 keep,
  Sat drop, Sun 10:00 drop, Sun 21:00 keep, Mon keep.
- `node test-ingest.mjs` — pulls ONE pair (EURUSD) for ONE recent week
  at 1h to confirm the live wire works, the UTC timestamps look right,
  and weekend rows are absent. Requires network access.

## Caching rationale

A closed forex bar is immutable (no splits, no dividends, no
adjustments — ever), so the cache never needs invalidation for historical
data. It's the ideal cache target. IndexedDB is used (not localStorage)
because 1h ranges easily exceed localStorage's ~5 MB cap.

## Cost / performance at single-user scale

Negligible. One user querying their own data via PK range scans, mostly
served from cache. Supabase free egress (GBs / month) is not at risk
with these payloads.

## Daily top-up

`topup.mjs` keeps the table current by pulling the last ~72h of bars
for every pair × timeframe and upserting them. Same vendor (Dukascopy),
so the series stays consistent with the bulk backfill — never swap in
a different source, mixing vendors corrupts the joins.

### Run on demand

```bash
cd scripts/fx-backfill
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node topup.mjs
```

Takes a few minutes. Idempotent (upsert on PK) — re-run anytime.

### Schedule via cron (recommended)

Run once per day after the US session closes (00:00 UTC = Monday 0
through Friday 22:00 UTC trading window has flushed):

```cron
# Daily forex top-up at 02:00 UTC
0 2 * * 1-6  cd /path/to/polaris/scripts/fx-backfill && \
             SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
             /usr/local/bin/node topup.mjs >> topup.log 2>&1
```

The 72h lookback handles broker revisions to the most recent bars and
absorbs any clock skew or missed runs.

### Why a CLI script and not an in-app button

`dukascopy-node` is a Node-only package — it can't run in the browser.
A button in the app would need a Supabase edge function (or similar
serverless wrapper) that invokes Dukascopy server-side. That's solvable
but adds infra (function code, deployment, secrets). For a single-user
journal, a cron job is simpler, cheaper, and equally reliable.

If you want an in-app trigger later, the path is:
1. Deploy `topup.mjs`'s logic as a Supabase Edge Function with the
   service key in the function's secret env.
2. Add a button in the app that POSTs to that function's URL.
3. Keep the cron as a fallback / heartbeat.

## Key safety

- `SUPABASE_SERVICE_KEY` is **server-side only**. The browser uses the
  anon key via `fxCache.js`.
- `load_supabase.mjs` reads the service key from `process.env`. Never
  hardcode it; never commit it.

## File layout

```
scripts/fx-backfill/
├── schema.sql              -- run in Supabase SQL editor
├── ingest.mjs              -- fetch Dukascopy → CSV
├── weekend.mjs             -- shared UTC weekend-drop helper
├── load_supabase.mjs       -- CSV → Supabase upsert
├── fxCache.js              -- browser IndexedDB read layer
├── test-weekend.mjs        -- unit test (no network)
├── test-ingest.mjs         -- tiny live test (needs network)
└── README.md
```
