// fxCache.js
// Browser caching layer for forex OHLCV to take load off Supabase.
//
// Core principle (forex-specific): a CLOSED historical bar is IMMUTABLE.
// No corporate actions, no re-adjustment ever. So once a bar is in the
// past, we cache it permanently and never re-fetch it. Only the trailing
// edge (today's still-forming bar / current hour) is re-fetched.
//
// Storage: IndexedDB (NOT localStorage — 1h ranges exceed its ~5 MB cap).
// Keyed by `${pair}|${timeframe}|${ts}` so PK-range queries on Supabase
// translate to bounded cursor scans on IndexedDB.

const DB_NAME = 'fx-ohlcv-cache';
const STORE = 'bars';

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // key = `${pair}|${timeframe}|${ts}`
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function k(pair, tf, ts) {
  return `${pair}|${tf}|${ts}`;
}

async function getCachedRange(db, pair, tf, fromISO, toISO) {
  return new Promise((res, rej) => {
    const out = [];
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const lo = k(pair, tf, fromISO);
    const hi = k(pair, tf, toISO);
    const range = IDBKeyRange.bound(lo, hi);
    store.openCursor(range).onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) {
        out.push(cur.value);
        cur.continue();
      } else {
        res(out);
      }
    };
    tx.onerror = () => rej(tx.error);
  });
}

async function putBars(db, bars) {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const b of bars) store.put({ key: k(b.pair, b.timeframe, b.ts), ...b });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// Is `toISO` strictly before the still-mutable trailing edge?
// For '1d' that's today; for '1h' that's the current hour. If the requested
// window ends in the past, a full cache hit is authoritative and we skip
// the network entirely.
function endsInPast(tf, toISO) {
  const to = new Date(toISO).getTime();
  const now = Date.now();
  const edge = tf === '1d' ? 24 * 3600e3 : 3600e3;
  return to < now - edge;
}

/**
 * Main entry point.
 * @param {object} supabase  - initialised supabase-js client (anon key)
 * @param {string} pair      - e.g. 'EURUSD'
 * @param {string} tf        - '1d' | '1h'
 * @param {string} fromISO   - UTC ISO start (inclusive)
 * @param {string} toISO     - UTC ISO end   (inclusive)
 * @returns {Promise<Array>} bars sorted by ts ascending
 */
export async function getBars(supabase, pair, tf, fromISO, toISO) {
  const db = await openDB();
  const cached = await getCachedRange(db, pair, tf, fromISO, toISO);

  // If the window is fully historical and we have cached rows, trust them.
  // Closed forex bars are immutable, so a cache hit is permanent truth.
  if (cached.length > 0 && endsInPast(tf, toISO)) {
    return cached.sort((a, b) => a.ts.localeCompare(b.ts));
  }

  // Otherwise fetch from Supabase. For simplicity we fetch the whole window
  // (the Postgres PK range scan is cheap) and overwrite cache for that window.
  const { data, error } = await supabase
    .from('fx_ohlcv')
    .select('pair,timeframe,ts,open,high,low,close,volume')
    .eq('pair', pair)
    .eq('timeframe', tf)
    .gte('ts', fromISO)
    .lte('ts', toISO)
    .order('ts', { ascending: true });

  if (error) throw error;

  // Cache everything EXCEPT the still-forming trailing bar.
  const now = Date.now();
  const edge = tf === '1d' ? 24 * 3600e3 : 3600e3;
  const immutable = data.filter((b) => new Date(b.ts).getTime() < now - edge);
  if (immutable.length) await putBars(db, immutable);

  return data;
}

// Wipe the entire cache (e.g. if you ever switch data source).
export async function clearCache() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
