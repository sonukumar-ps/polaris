// load_supabase.mjs
// Loads ./out/fx_ohlcv.csv into Supabase. Idempotent: re-running upserts,
// so a partial/failed run is safe to retry. Uses the SERVICE ROLE key
// (write access) — keep it server-side, never ship it to the browser.
//
//   npm install @supabase/supabase-js
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node load_supabase.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const lines = fs.readFileSync('./out/fx_ohlcv.csv', 'utf8').trim().split('\n');
lines.shift();  // header row

const rows = lines.map((l) => {
  const [pair, timeframe, ts, open, high, low, close, volume] = l.split(',');
  return {
    pair,
    timeframe,
    ts,
    open: +open,
    high: +high,
    low: +low,
    close: +close,
    volume: volume === '' ? null : +volume
  };
});

console.log(`Parsed ${rows.length} rows`);

const CHUNK = 1000;
let done = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const batch = rows.slice(i, i + CHUNK);
  const { error } = await sb
    .from('fx_ohlcv')
    .upsert(batch, { onConflict: 'pair,timeframe,ts' });
  if (error) {
    console.error('Batch error:', error.message);
    process.exit(1);
  }
  done += batch.length;
  process.stdout.write(`\rUpserted ${done}/${rows.length}`);
}
console.log('\nDone.');
