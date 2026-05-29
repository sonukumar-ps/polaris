// estimate-footprint.mjs
// Estimate row count and MB for the full 10yr backfill so we can confirm
// the table stays well under the 500 MB Supabase free tier.

const PAIRS = 7;
const YEARS = 10;
const WEEKS_PER_YEAR = 52;

// Forex week shape after our weekend-drop filter:
//   Mon 00:00 UTC  → Fri 22:00 UTC          = 4 days × 24h + 22h = 118 hours
//   Sun 21:00 UTC  → Sun 23:00 UTC (evening) = 3 hours
//   Total live hours/week                    = 121
// In practice Dukascopy's ignoreFlats also trims thin sessions, so call it
// ~120 hourly bars per pair per week.
const HOURS_PER_WEEK = 121;
const TRADING_DAYS_PER_WEEK = 5;  // daily bars: Mon..Fri (and a Sun frag may exist)

const hourly = PAIRS * YEARS * WEEKS_PER_YEAR * HOURS_PER_WEEK;
const daily  = PAIRS * YEARS * WEEKS_PER_YEAR * TRADING_DAYS_PER_WEEK;
const total  = hourly + daily;

// Postgres row-size estimate for our schema:
//   pair (text ~10b) + timeframe (text ~6b) + ts (timestamptz 8b)
//   + open/high/low/close/volume (5 × 8b doubles) = ~64 b payload
//   + 24 b row header (xmin/xmax/cmin/cmax/oid/null-bitmap) = ~88 b
// Index (PK btree on pair,timeframe,ts):
//   ~30 b per leaf entry × 1.4 fan-out overhead = ~42 b
// Table data + index ≈ ~130 b / row.
const BYTES_PER_ROW = 130;
const totalBytes = total * BYTES_PER_ROW;
const totalMB = totalBytes / 1024 / 1024;

console.log('Full-scope backfill footprint estimate');
console.log('─'.repeat(45));
console.log(`Hourly bars (7 pairs × 10y × ~121h/wk)  : ${hourly.toLocaleString()}`);
console.log(`Daily bars (7 pairs × 10y × ~5d/wk)     : ${daily.toLocaleString()}`);
console.log(`Total rows                              : ${total.toLocaleString()}`);
console.log('');
console.log(`Bytes per row (data + PK index)         : ~${BYTES_PER_ROW} B`);
console.log(`Estimated total storage                 : ~${totalMB.toFixed(1)} MB`);
console.log('');
console.log(`Free tier ceiling                       : 500 MB`);
console.log(`Headroom                                : ${(500 - totalMB).toFixed(1)} MB`);
console.log(`Fraction of free tier consumed          : ${(totalMB / 500 * 100).toFixed(1)}%`);

if (totalMB > 500) {
  console.log('\n❌ EXCEEDS FREE TIER — reduce scope.');
  process.exit(1);
}
console.log('\n✓ Comfortably under the 500 MB free tier.');
