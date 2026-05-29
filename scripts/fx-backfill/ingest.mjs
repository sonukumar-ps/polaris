// ingest.mjs
// One-time 10yr backfill of 7 forex majors (daily + 1h) from Dukascopy.
// Canonical timezone: UTC. Weekend bars: dropped. Flat (0-volume) bars: dropped.
//
// Run locally (NOT in a restricted sandbox — needs network to dukascopy.com):
//   npm install dukascopy-node
//   node ingest.mjs
//
// Output: ./out/<PAIR>_<tf>.csv  and a combined ./out/fx_ohlcv.csv
// Then load fx_ohlcv.csv into Supabase (see load_supabase.mjs).

import { getHistoricalRates } from 'dukascopy-node';
import fs from 'node:fs';
import path from 'node:path';

import { isWeekendBar } from './weekend.mjs';

const PAIRS = ['eurusd', 'usdjpy', 'gbpusd', 'usdchf', 'audusd', 'usdcad', 'nzdusd'];
const TIMEFRAMES = ['d1', 'h1'];            // d1 -> '1d', h1 -> '1h' in DB
const TF_DB = { d1: '1d', h1: '1h' };

// 10 years back from today, anchored to UTC midnight.
const TO = new Date();
const FROM = new Date(Date.UTC(TO.getUTCFullYear() - 10, TO.getUTCMonth(), TO.getUTCDate()));

const OUT = path.resolve('./out');
fs.mkdirSync(OUT, { recursive: true });

const combinedRows = [];

for (const pair of PAIRS) {
  for (const tf of TIMEFRAMES) {
    process.stdout.write(`Fetching ${pair} ${tf} ... `);
    let data;
    try {
      data = await getHistoricalRates({
        instrument: pair,
        dates: { from: FROM, to: TO },
        timeframe: tf,
        priceType: 'bid',     // reference series convention
        format: 'json',
        utcOffset: 0,         // <-- UTC canonical
        volumes: true,
        ignoreFlats: true,    // drop 0-volume placeholder bars
        useCache: true,
        cacheFolderPath: '.dukascopy-cache',
        retryCount: 5,
        pauseBetweenRetriesMs: 1500,
        batchSize: 10,
        pauseBetweenBatchesMs: 1000
      });
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      continue;
    }

    const PAIR = pair.toUpperCase();
    const cleaned = data
      .filter((r) => !isWeekendBar(r.timestamp))
      .map((r) => ({
        pair: PAIR,
        timeframe: TF_DB[tf],
        ts: new Date(r.timestamp).toISOString(),  // UTC ISO-8601
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume ?? null
      }));

    // Per-pair CSV (handy for inspection / re-import)
    const perFile = path.join(OUT, `${PAIR}_${TF_DB[tf]}.csv`);
    writeCsv(perFile, cleaned);
    combinedRows.push(...cleaned);
    console.log(`${cleaned.length} bars (raw ${data.length}) -> ${path.basename(perFile)}`);
  }
}

// Combined file for a single bulk load into Supabase.
writeCsv(path.join(OUT, 'fx_ohlcv.csv'), combinedRows);
console.log(`\nTOTAL rows: ${combinedRows.length}`);
console.log(`Combined file: ${path.join(OUT, 'fx_ohlcv.csv')}`);

function writeCsv(file, rows) {
  const header = 'pair,timeframe,ts,open,high,low,close,volume\n';
  const body = rows
    .map(
      (r) =>
        `${r.pair},${r.timeframe},${r.ts},${r.open},${r.high},${r.low},${r.close},${r.volume ?? ''}`
    )
    .join('\n');
  fs.writeFileSync(file, header + body + '\n');
}
