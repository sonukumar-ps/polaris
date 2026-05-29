// weekend.mjs
// Pure UTC weekend-drop rule. Kept in its own module so the unit test can
// import it without depending on dukascopy-node or network I/O.
//
// Forex week: ~Sun 21:00 UTC (Asia open) through Fri 22:00 UTC (NY close).
// We keep the Sunday-evening open onward, drop any Saturday bar, and drop
// any Sunday bar before 21:00 UTC (pre-open dead zone).
//
// @param {number | Date | string} ts  - epoch ms, Date, or ISO string (must be UTC)
// @returns {boolean} true if the bar's OPEN time should be dropped

export function isWeekendBar(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  const day = d.getUTCDay();            // 0 = Sunday, 6 = Saturday
  if (day === 6) return true;           // Saturday: never trading
  if (day === 0 && d.getUTCHours() < 21) return true;  // Sunday before ~open
  return false;
}
