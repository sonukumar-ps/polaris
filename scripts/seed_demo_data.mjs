import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEMO_EMAIL = process.env.POLARIS_DEMO_EMAIL ?? 'demo@polaris.test';
const DEMO_PASSWORD = process.env.POLARIS_DEMO_PASSWORD ?? 'PolarisDemo123!';
const DEMO_ACCOUNT_NAME = 'Demo Trading';
const DEMO_NOTE_PREFIX = 'Demo seed:';

loadDotEnv();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env first.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
});

const assets = [
  { asset_class: 'stock', exchange: 'NASDAQ', name: 'Apple Inc.', symbol: 'AAPL' },
  { asset_class: 'stock', exchange: 'NASDAQ', name: 'NVIDIA Corporation', symbol: 'NVDA' },
  { asset_class: 'stock', exchange: 'NASDAQ', name: 'Tesla Inc.', symbol: 'TSLA' },
  { asset_class: 'stock', exchange: 'NYSE', name: 'SPDR S&P 500 ETF Trust', symbol: 'SPY' },
  { asset_class: 'crypto', exchange: 'COINBASE', name: 'Bitcoin', symbol: 'BTCUSD' },
  { asset_class: 'forex', exchange: 'FX', name: 'Euro / US Dollar', symbol: 'EURUSD' }
];

const tagCatalog = [
  { name: 'Breakout', type: 'strategy' },
  { name: 'Pullback', type: 'strategy' },
  { name: 'Opening range', type: 'setup' },
  { name: 'Trend continuation', type: 'setup' },
  { name: 'Reversal', type: 'setup' },
  { name: 'Calm', type: 'emotion' },
  { name: 'Impatient', type: 'emotion' },
  { name: 'Chased', type: 'mistake' },
  { name: 'Moved stop', type: 'mistake' },
  { name: 'A setup', type: 'custom' }
];

const tradeDrafts = [
  {
    closedAt: '2026-05-06T16:00:00.000Z',
    direction: 'long',
    entry: 182.2,
    exit: 186.8,
    fees: 3,
    openedAt: '2026-05-06T14:30:00.000Z',
    quantity: 40,
    risk: 90,
    symbol: 'AAPL',
    tags: ['Breakout', 'Opening range', 'Calm', 'A setup']
  },
  {
    closedAt: '2026-05-07T19:00:00.000Z',
    direction: 'long',
    entry: 910,
    exit: 934,
    fees: 6,
    openedAt: '2026-05-07T15:10:00.000Z',
    quantity: 8,
    risk: 120,
    symbol: 'NVDA',
    tags: ['Breakout', 'Trend continuation', 'Calm']
  },
  {
    closedAt: '2026-05-08T15:50:00.000Z',
    direction: 'short',
    entry: 177.5,
    exit: 174.2,
    fees: 4,
    openedAt: '2026-05-08T14:05:00.000Z',
    quantity: 60,
    risk: 100,
    symbol: 'TSLA',
    tags: ['Reversal', 'Calm']
  },
  {
    closedAt: '2026-05-09T15:35:00.000Z',
    direction: 'long',
    entry: 524.4,
    exit: 521.9,
    fees: 3,
    openedAt: '2026-05-09T14:40:00.000Z',
    quantity: 50,
    risk: 110,
    symbol: 'SPY',
    tags: ['Pullback', 'Impatient', 'Chased']
  },
  {
    closedAt: '2026-05-10T18:10:00.000Z',
    direction: 'long',
    entry: 63200,
    exit: 63950,
    fees: 8,
    openedAt: '2026-05-10T12:00:00.000Z',
    quantity: 0.18,
    risk: 140,
    symbol: 'BTCUSD',
    tags: ['Trend continuation', 'Calm', 'A setup']
  },
  {
    closedAt: '2026-05-11T16:20:00.000Z',
    direction: 'short',
    entry: 1.083,
    exit: 1.0805,
    fees: 2,
    openedAt: '2026-05-11T09:20:00.000Z',
    quantity: 42000,
    risk: 95,
    symbol: 'EURUSD',
    tags: ['Breakout', 'Calm']
  },
  {
    closedAt: '2026-05-12T15:05:00.000Z',
    direction: 'long',
    entry: 188,
    exit: 185.1,
    fees: 4,
    openedAt: '2026-05-12T14:32:00.000Z',
    quantity: 55,
    risk: 120,
    symbol: 'AAPL',
    tags: ['Opening range', 'Impatient', 'Chased']
  },
  {
    closedAt: '2026-05-13T18:45:00.000Z',
    direction: 'long',
    entry: 948,
    exit: 976,
    fees: 7,
    openedAt: '2026-05-13T14:45:00.000Z',
    quantity: 7,
    risk: 130,
    symbol: 'NVDA',
    tags: ['Breakout', 'Trend continuation', 'Calm', 'A setup']
  },
  {
    closedAt: '2026-05-14T19:20:00.000Z',
    direction: 'short',
    entry: 181.4,
    exit: 187.2,
    fees: 5,
    openedAt: '2026-05-14T15:00:00.000Z',
    quantity: 80,
    risk: 150,
    symbol: 'TSLA',
    tags: ['Reversal', 'Moved stop', 'Impatient']
  },
  {
    closedAt: '2026-05-15T15:15:00.000Z',
    direction: 'long',
    entry: 529.2,
    exit: 532.1,
    fees: 3,
    openedAt: '2026-05-15T14:30:00.000Z',
    quantity: 70,
    risk: 110,
    symbol: 'SPY',
    tags: ['Pullback', 'Calm']
  },
  {
    closedAt: '2026-05-16T20:30:00.000Z',
    direction: 'long',
    entry: 64600,
    exit: 64100,
    fees: 8,
    openedAt: '2026-05-16T13:05:00.000Z',
    quantity: 0.22,
    risk: 125,
    symbol: 'BTCUSD',
    tags: []
  },
  {
    closedAt: '2026-05-17T16:05:00.000Z',
    direction: 'long',
    entry: 190.5,
    exit: 193.4,
    fees: 3,
    openedAt: '2026-05-17T14:35:00.000Z',
    quantity: 65,
    risk: 100,
    symbol: 'AAPL',
    tags: ['Breakout', 'Opening range', 'Calm']
  },
  {
    closedAt: '2026-05-18T17:30:00.000Z',
    direction: 'short',
    entry: 982,
    exit: 966,
    fees: 6,
    openedAt: '2026-05-18T14:40:00.000Z',
    quantity: 6,
    risk: 115,
    symbol: 'NVDA',
    tags: ['Reversal', 'Calm']
  },
  {
    closedAt: '2026-05-19T15:45:00.000Z',
    direction: 'long',
    entry: 535.2,
    exit: 531.7,
    fees: 4,
    openedAt: '2026-05-19T14:40:00.000Z',
    quantity: 90,
    risk: 130,
    symbol: 'SPY',
    tags: ['Chased', 'Impatient']
  },
  {
    direction: 'long',
    entry: 195.1,
    fees: 2,
    openedAt: '2026-05-20T14:35:00.000Z',
    quantity: 45,
    risk: 95,
    symbol: 'AAPL',
    tags: ['Pullback', 'Calm']
  },
  {
    direction: 'short',
    entry: 990,
    fees: 3,
    openedAt: '2026-05-21T15:05:00.000Z',
    quantity: 5,
    risk: 125,
    symbol: 'NVDA',
    tags: ['Reversal']
  }
];

await main();

async function main() {
  const user = await signInDemoUser();
  await upsertProfile(user.id);
  const account = await getOrCreateAccount(user.id);
  await clearExistingDemoRows(user.id);

  const assetsBySymbol = await seedAssets();
  const tagsByKey = await seedTags(user.id);
  const createdTrades = await seedTrades({ accountId: account.id, assetsBySymbol, tagsByKey, userId: user.id });
  await seedSnapshots({ accountId: account.id, trades: createdTrades, userId: user.id });
  await seedChartImages({ trades: createdTrades, userId: user.id });

  console.log('Demo data seeded.');
  console.log(`Email: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log(`Trades: ${createdTrades.length}`);
}

async function signInDemoUser() {
  const signInResult = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD
  });

  if (signInResult.data.user) {
    return signInResult.data.user;
  }

  const signUpResult = await supabase.auth.signUp({
    email: DEMO_EMAIL,
    options: {
      data: {
        display_name: 'Demo Trader'
      }
    },
    password: DEMO_PASSWORD
  });

  if (signUpResult.error && !signUpResult.error.message.toLowerCase().includes('already')) {
    throw signUpResult.error;
  }

  const retrySignInResult = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD
  });

  if (retrySignInResult.error || !retrySignInResult.data.user) {
    throw new Error(
      `Could not sign in demo user. If email confirmation is enabled, confirm ${DEMO_EMAIL} in Supabase Auth and rerun this script.`
    );
  }

  return retrySignInResult.data.user;
}

async function upsertProfile(userId) {
  const { error } = await supabase.from('profiles').upsert({
    base_currency: 'USD',
    display_name: 'Demo Trader',
    id: userId,
    timezone: 'Europe/London'
  });

  if (error) {
    throw error;
  }
}

async function getOrCreateAccount(userId) {
  const { data: existing, error: findError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('name', DEMO_ACCOUNT_NAME)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      broker_name: 'Polaris Demo Broker',
      currency: 'USD',
      name: DEMO_ACCOUNT_NAME,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function clearExistingDemoRows(userId) {
  const { data: demoTrades, error: tradeFindError } = await supabase
    .from('trades')
    .select('id')
    .eq('user_id', userId)
    .like('notes', `${DEMO_NOTE_PREFIX}%`);

  if (tradeFindError) {
    throw tradeFindError;
  }

  const tradeIds = demoTrades.map((trade) => trade.id);

  if (tradeIds.length > 0) {
    const { error: deleteError } = await supabase.from('trades').delete().in('id', tradeIds);

    if (deleteError) {
      throw deleteError;
    }
  }

  await removeDemoStorageObjects(userId);
}

async function seedAssets() {
  const assetsBySymbol = new Map();

  for (const asset of assets) {
    const { data: existing, error: findError } = await supabase
      .from('assets')
      .select('*')
      .eq('symbol', asset.symbol)
      .eq('asset_class', asset.asset_class)
      .eq('exchange', asset.exchange)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing) {
      assetsBySymbol.set(asset.symbol, existing);
      continue;
    }

    const { data, error } = await supabase.from('assets').insert(asset).select().single();

    if (error) {
      throw error;
    }

    assetsBySymbol.set(asset.symbol, data);
  }

  return assetsBySymbol;
}

async function seedTags(userId) {
  const tagsByKey = new Map();

  for (const tag of tagCatalog) {
    const key = getTagKey(tag);
    const { data: existing, error: findError } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .eq('type', tag.type)
      .eq('name', tag.name)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing) {
      tagsByKey.set(key, existing);
      continue;
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        ...tag,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    tagsByKey.set(key, data);
  }

  return tagsByKey;
}

async function seedTrades({ accountId, assetsBySymbol, tagsByKey, userId }) {
  const createdTrades = [];

  for (const draft of tradeDrafts) {
    const asset = assetsBySymbol.get(draft.symbol);

    if (!asset) {
      throw new Error(`Missing asset ${draft.symbol}`);
    }

    const pnl = calculatePnl(draft);
    const status = draft.closedAt ? 'closed' : 'open';
    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        account_id: accountId,
        asset_id: asset.id,
        closed_at: draft.closedAt ?? null,
        direction: draft.direction,
        entry_price: draft.entry,
        exit_price: draft.exit ?? null,
        fees: draft.fees,
        gross_pnl: pnl?.grossPnl ?? null,
        net_pnl: pnl?.netPnl ?? null,
        notes: `${DEMO_NOTE_PREFIX} ${buildTradeNote(draft, pnl)}`,
        opened_at: draft.openedAt,
        quantity: draft.quantity,
        r_multiple: pnl ? round(pnl.netPnl / draft.risk, 4) : null,
        risk_amount: draft.risk,
        status,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await attachTags({ tags: draft.tags, tagsByKey, tradeId: trade.id });
    createdTrades.push({ ...trade, symbol: draft.symbol, tags: draft.tags });
  }

  return createdTrades;
}

async function attachTags({ tags, tagsByKey, tradeId }) {
  const tagRows = tags
    .map((tagName) => Array.from(tagsByKey.values()).find((tag) => tag.name === tagName))
    .filter(Boolean);

  if (tagRows.length === 0) {
    return;
  }

  const { error } = await supabase.from('trade_tags').insert(
    tagRows.map((tag) => ({
      tag_id: tag.id,
      trade_id: tradeId
    }))
  );

  if (error) {
    throw error;
  }
}

async function seedSnapshots({ accountId, trades, userId }) {
  let equity = 25000;
  const snapshots = trades
    .filter((trade) => trade.closed_at && trade.net_pnl !== null)
    .map((trade) => {
      equity += Number(trade.net_pnl);

      return {
        account_id: accountId,
        cash_balance: round(equity * 0.72, 2),
        equity: round(equity, 2),
        realized_pnl: Number(trade.net_pnl),
        snapshot_date: trade.closed_at.slice(0, 10),
        user_id: userId
      };
    });

  const { error } = await supabase
    .from('daily_account_snapshots')
    .upsert(snapshots, { onConflict: 'account_id,snapshot_date' });

  if (error) {
    throw error;
  }
}

async function seedChartImages({ trades, userId }) {
  const screenshotTrades = trades.filter((trade) => trade.status === 'closed').slice(0, 3);

  for (const [index, trade] of screenshotTrades.entries()) {
    const storagePath = `${userId}/demo-charts/${trade.id}.svg`;
    const chartSvg = buildChartSvg({
      direction: trade.direction,
      index,
      netPnl: Number(trade.net_pnl),
      symbol: trade.symbol
    });
    const { error: uploadError } = await supabase.storage
      .from('trade-images')
      .upload(storagePath, new Blob([chartSvg], { type: 'image/svg+xml' }), {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      console.warn(`Could not upload demo chart for ${trade.symbol}: ${uploadError.message}`);
      continue;
    }

    const { error: imageError } = await supabase.from('trade_images').insert({
      caption: `Demo ${trade.symbol} chart screenshot`,
      storage_path: storagePath,
      trade_id: trade.id,
      user_id: userId
    });

    if (imageError) {
      throw imageError;
    }
  }
}

async function removeDemoStorageObjects(userId) {
  const { data, error } = await supabase.storage.from('trade-images').list(`${userId}/demo-charts`);

  if (error || !data || data.length === 0) {
    return;
  }

  const paths = data.map((object) => `${userId}/demo-charts/${object.name}`);
  await supabase.storage.from('trade-images').remove(paths);
}

function calculatePnl(draft) {
  if (!draft.closedAt || draft.exit === undefined) {
    return null;
  }

  const grossPnl =
    draft.direction === 'long'
      ? (draft.exit - draft.entry) * draft.quantity
      : (draft.entry - draft.exit) * draft.quantity;

  return {
    grossPnl: round(grossPnl, 2),
    netPnl: round(grossPnl - draft.fees, 2)
  };
}

function buildTradeNote(draft, pnl) {
  if (!pnl) {
    return `${draft.symbol} open trade. Used to verify open-state display.`;
  }

  return `${draft.symbol} ${draft.direction} trade for ${formatCurrency(pnl.netPnl)} net. Used to verify dashboards, tags, screenshots, and Insight Coach.`;
}

function buildChartSvg({ direction, index, netPnl, symbol }) {
  const positive = netPnl >= 0;
  const stroke = positive ? '#30D158' : '#FF453A';
  const path =
    direction === 'long'
      ? positive
        ? 'M 30 150 C 90 142, 120 116, 178 122 S 280 64, 350 54'
        : 'M 30 70 C 90 84, 132 110, 188 108 S 284 148, 350 160'
      : positive
        ? 'M 30 74 C 95 80, 136 96, 190 90 S 285 130, 350 148'
        : 'M 30 148 C 84 130, 130 108, 190 116 S 286 70, 350 58';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420">
  <rect width="720" height="420" rx="28" fill="#F7F7F5"/>
  <rect x="34" y="44" width="652" height="300" rx="18" fill="#FFFFFF" stroke="#E5E5E0"/>
  <text x="54" y="86" fill="#1D1D1F" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="32" font-weight="800">${symbol}</text>
  <text x="54" y="118" fill="#6E6E73" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="17" font-weight="700">Demo chart screenshot ${index + 1}</text>
  <path d="M 54 186 H 666 M 54 252 H 666 M 54 318 H 666" stroke="#EFEFEC" stroke-width="2"/>
  <path d="${path}" transform="translate(165 110)" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round"/>
  <circle cx="${positive ? 515 : 515}" cy="${positive ? 164 : 270}" r="10" fill="${stroke}"/>
  <text x="54" y="382" fill="${stroke}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="22" font-weight="800">${formatCurrency(netPnl)} net</text>
</svg>`;
}

function getTagKey(tag) {
  return `${tag.type}:${tag.name.toLowerCase()}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

function round(value, decimals) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function loadDotEnv() {
  const envPath = resolve('.env');

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex);
    const value = trimmedLine.slice(equalsIndex + 1).replace(/^['"]|['"]$/g, '');

    process.env[key] ??= value;
  }
}
