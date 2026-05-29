// topup.mjs
// Daily top-up — fetches the last few days of Dukascopy bars for each
// pair × timeframe and upserts directly into Supabase. Skips the CSV step
// since the volume per run is small (a few hundred rows at most).
//
// Single-vendor by design: keeps using Dukascopy so the series stays
// consistent with the bulk backfill. NEVER swap in a different source.
//
//   npm i dukascopy-node @supabase/supabase-js
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node topup.mjs
//
// Idempotent (upsert on PK), so re-running is safe.

import { getHistoricalRates } from 'dukascopy-node';
import { createClient } from '@supabase/supabase-js';

import { isWeekendBar } from './weekend.mjs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const PAIRS = ['eurusd', 'usdjpy', 'gbpusd', 'usdchf', 'audusd', 'usdcad', 'nzdusd'];
const TIMEFRAMES = ['d1', 'h1'];
const TF_DB = { d1: '1d', h1: '1h' };

// Look back this far on every run, regardless of the latest ts in DB.
// Handles broker revisions to the most recent bars and small clock-skew gaps.
// 72h × 1h = 72 candles to re-check per pair — trivial cost.
const LOOKBACK_HOURS = 72;

const summary = [];

for (const pair of PAIRS) {
  for (const tf of TIMEFRAMES) {
    const PAIR = pair.toUpperCase();
    const tfDb = TF_DB[tf];

    // 1. Find the latest ts we already have in DB for this pair/tf
    const { data: latestRows, error: latestErr } = await sb
      .from('fx_ohlcv')
      .select('ts')
      .eq('pair', PAIR)
      .eq('timeframe', tfDb)
      .order('ts', { ascending: false })
      .limit(1);

    if (latestErr) {
      console.error(`${PAIR} ${tfDb} — latest lookup failed: ${latestErr.message}`);
      continue;
    }

    const lastTs = latestRows?.[0]?.ts ? new Date(latestRows[0].ts).getTime() : 0;
    const now = new Date();

    // 2. Fetch window: from lookback-anchor to now.
    // Anchor is the *earlier* of (last_ts - lookback) and (now - lookback) so
    // first-run-on-empty-table still has a sensible start.
    const lookbackMs = LOOKBACK_HOURS * 3600e3;
    const fromMs = lastTs > 0 ? lastTs - lookbackMs : now.getTime() - lookbackMs;
    const from = new Date(fromMs);

    process.stdout.write(`${PAIR} ${tfDb}  (from ${from.toISOString()}) ... `);

    let raw;
    try {
      raw = await getHistoricalRates({
        instrument: pair,
        dates: { from, to: now },
        timeframe: tf,
        priceType: 'bid',
        format: 'json',
        utcOffset: 0,
        volumes: true,
        ignoreFlats: true,
        useCache: false,            // always re-fetch the trailing edge
        retryCount: 5,
        pauseBetweenRetriesMs: 1500,
        batchSize: 10,
        pauseBetweenBatchesMs: 1000
      });
    } catch (e) {
      console.log(`ERROR ${e.message}`);
      summary.push({ pair: PAIR, tf: tfDb, fetched: 0, upserted: 0, error: e.message });
      continue;
    }

    const cleaned = raw
      .filter((r) => !isWeekendBar(r.timestamp))
      .map((r) => ({
        pair: PAIR,
        timeframe: tfDb,
        ts: new Date(r.timestamp).toISOString(),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume ?? null
      }));

    if (cleaned.length === 0) {
      console.log('no new bars');
      summary.push({ pair: PAIR, tf: tfDb, fetched: raw.length, upserted: 0 });
      continue;
    }

    // 3. Upsert. PK conflict on existing rows = no-op refresh; new rows insert.
    const { error: upsertErr } = await sb
      .from('fx_ohlcv')
      .upsert(cleaned, { onConflict: 'pair,timeframe,ts' });

    if (upsertErr) {
      console.log(`UPSERT ERROR ${upsertErr.message}`);
      summary.push({ pair: PAIR, tf: tfDb, fetched: raw.length, upserted: 0, error: upsertErr.message });
      continue;
    }

    console.log(`+${cleaned.length} bars (raw ${raw.length})`);
    summary.push({ pair: PAIR, tf: tfDb, fetched: raw.length, upserted: cleaned.length });
  }
}

console.log('\n─── Summary ───');
let totalFetched = 0;
let totalUpserted = 0;
let errors = 0;
for (const s of summary) {
  totalFetched += s.fetched;
  totalUpserted += s.upserted;
  if (s.error) errors++;
}
console.log(`Fetched   : ${totalFetched}`);
console.log(`Upserted  : ${totalUpserted}`);
console.log(`Errors    : ${errors}`);

process.exit(errors > 0 ? 1 : 0);
