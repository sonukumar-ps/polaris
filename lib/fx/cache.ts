/**
 * Browser caching layer for forex OHLCV reference data.
 *
 * Core principle (forex-specific): a CLOSED historical bar is IMMUTABLE.
 * No corporate actions, no re-adjustment ever. So once a bar is in the past,
 * we cache it permanently and never re-fetch. Only the trailing edge
 * (today for '1d', the current hour for '1h') is ever re-fetched.
 *
 * Storage: IndexedDB (NOT localStorage — 1h ranges exceed its ~5 MB cap).
 *
 * This is the TypeScript-typed app version. The functionally identical
 * standalone deliverable lives at scripts/fx-backfill/fxCache.js.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';

export type FxBar = {
  pair: string;
  timeframe: '1d' | '1h';
  ts: string;          // ISO-8601 UTC
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

const DB_NAME = 'fx-ohlcv-cache';
const STORE = 'bars';

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') {
      rej(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function k(pair: string, tf: string, ts: string): string {
  return `${pair}|${tf}|${ts}`;
}

async function getCachedRange(
  db: IDBDatabase,
  pair: string,
  tf: string,
  fromISO: string,
  toISO: string
): Promise<FxBar[]> {
  return new Promise((res, rej) => {
    const out: FxBar[] = [];
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const range = IDBKeyRange.bound(k(pair, tf, fromISO), k(pair, tf, toISO));
    store.openCursor(range).onsuccess = (e) => {
      const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cur) {
        const { key: _key, ...bar } = cur.value as FxBar & { key: string };
        out.push(bar);
        cur.continue();
      } else {
        res(out);
      }
    };
    tx.onerror = () => rej(tx.error);
  });
}

async function putBars(db: IDBDatabase, bars: FxBar[]): Promise<void> {
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const b of bars) store.put({ key: k(b.pair, b.timeframe, b.ts), ...b });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// Is `toISO` strictly before the still-mutable trailing edge?
// For '1d' that's today; for '1h' that's the current hour.
function endsInPast(tf: '1d' | '1h', toISO: string): boolean {
  const to = new Date(toISO).getTime();
  const now = Date.now();
  const edge = tf === '1d' ? 24 * 3600e3 : 3600e3;
  return to < now - edge;
}

/**
 * Fetch a window of forex bars, served from IndexedDB when possible.
 *
 * @param supabase   Initialised supabase-js client (anon key)
 * @param pair       'EURUSD' | 'USDJPY' | ... | 'NZDUSD'
 * @param tf         '1d' | '1h'
 * @param fromISO    UTC ISO start (inclusive)
 * @param toISO      UTC ISO end   (inclusive)
 */
export async function getBars(
  supabase: SupabaseClient<Database>,
  pair: string,
  tf: '1d' | '1h',
  fromISO: string,
  toISO: string
): Promise<FxBar[]> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDB();
  } catch {
    // IndexedDB unavailable (e.g. SSR, private browsing). Fall through to network.
  }

  if (db) {
    const cached = await getCachedRange(db, pair, tf, fromISO, toISO);
    if (cached.length > 0 && endsInPast(tf, toISO)) {
      return cached.sort((a, b) => a.ts.localeCompare(b.ts));
    }
  }

  // Cache miss or trailing window: fetch from Supabase via PK range scan.
  const { data, error } = await supabase
    .from('fx_ohlcv')
    .select('pair,timeframe,ts,open,high,low,close,volume')
    .eq('pair', pair)
    .eq('timeframe', tf)
    .gte('ts', fromISO)
    .lte('ts', toISO)
    .order('ts', { ascending: true });

  if (error) throw error;

  const bars = (data ?? []) as FxBar[];

  // Cache everything EXCEPT the still-forming trailing bar.
  if (db && bars.length > 0) {
    const now = Date.now();
    const edge = tf === '1d' ? 24 * 3600e3 : 3600e3;
    const immutable = bars.filter((b) => new Date(b.ts).getTime() < now - edge);
    if (immutable.length) await putBars(db, immutable);
  }

  return bars;
}

/** Wipe the entire cache (e.g. when switching data source). */
export async function clearCache(): Promise<void> {
  let db: IDBDatabase;
  try {
    db = await openDB();
  } catch {
    return;
  }
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
