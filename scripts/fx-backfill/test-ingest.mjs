// test-ingest.mjs
// Tiny live verification: pull EURUSD 1h for one recent full week to
// confirm:
//  1. dukascopy-node returns data
//  2. UTC timestamps look right
//  3. weekend rows are absent after our drop filter
//
//   npm i dukascopy-node    (run from this folder)
//   node test-ingest.mjs
//
// Reports row counts and a sample row; exits non-zero on assertion failure.

import { getHistoricalRates } from 'dukascopy-node';
import { isWeekendBar } from './weekend.mjs';

// Anchor to a recent fully-closed week (Mon 00:00 UTC → next Mon 00:00 UTC)
// so the window contains a complete Sat + Sun for the weekend assertion.
function lastClosedWeek() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();              // 0=Sun..6=Sat
  const daysSinceLastMonday = (dayOfWeek + 6) % 7;
  const thisMon = new Date(now);
  thisMon.setUTCHours(0, 0, 0, 0);
  thisMon.setUTCDate(thisMon.getUTCDate() - daysSinceLastMonday);
  // Last completed Mon → next Mon
  const to = thisMon;
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 7);
  return { from, to };
}

const { from, to } = lastClosedWeek();

console.log(`Pair       : EURUSD`);
console.log(`Timeframe  : h1`);
console.log(`Window     : ${from.toISOString()}  →  ${to.toISOString()}\n`);

const raw = await getHistoricalRates({
  instrument: 'eurusd',
  dates: { from, to },
  timeframe: 'h1',
  priceType: 'bid',
  format: 'json',
  utcOffset: 0,
  volumes: true,
  ignoreFlats: true,
  useCache: true,
  cacheFolderPath: '.dukascopy-cache',
  retryCount: 5,
  pauseBetweenRetriesMs: 1500,
  batchSize: 10,
  pauseBetweenBatchesMs: 1000
});

console.log(`Raw bars returned             : ${raw.length}`);

const cleaned = raw.filter((r) => !isWeekendBar(r.timestamp));
console.log(`After weekend-drop filter      : ${cleaned.length}`);

// Sanity: no weekend rows remain
const stillWeekend = cleaned.filter((r) => {
  const d = new Date(r.timestamp);
  return d.getUTCDay() === 6 || (d.getUTCDay() === 0 && d.getUTCHours() < 21);
});

let assertions = 0;
let failures = 0;

function assert(name, ok) {
  assertions++;
  if (ok) {
    console.log(`✓ ${name}`);
  } else {
    failures++;
    console.log(`✗ ${name}`);
  }
}

assert('returned at least 80 bars (a real week of 1h forex)', cleaned.length >= 80);
assert('no Saturday or pre-21:00 Sunday rows in cleaned output', stillWeekend.length === 0);
assert(
  'all timestamps are UTC (toISOString ends with "Z")',
  cleaned.every((r) => new Date(r.timestamp).toISOString().endsWith('Z'))
);
assert(
  'OHLC sanity: high >= low/open/close, low <= open/close',
  cleaned.every(
    (r) => r.high >= r.low && r.high >= r.open && r.high >= r.close && r.low <= r.open && r.low <= r.close
  )
);

const sample = cleaned[0];
console.log('\nSample row:');
console.log(
  JSON.stringify(
    {
      pair: 'EURUSD',
      timeframe: '1h',
      ts: new Date(sample.timestamp).toISOString(),
      open: sample.open,
      high: sample.high,
      low: sample.low,
      close: sample.close,
      volume: sample.volume ?? null
    },
    null,
    2
  )
);

console.log(`\n${assertions - failures}/${assertions} assertions passed`);
process.exit(failures === 0 ? 0 : 1);
