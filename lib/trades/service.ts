import { supabase } from '@/lib/supabase';

import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];

export type AssetClass = Database['public']['Enums']['asset_class'];
export type TradeDirection = Database['public']['Enums']['trade_direction'];
export type TradeRow = Tables['trades']['Row'];

type AccountRow = Tables['accounts']['Row'];
type AssetRow = Tables['assets']['Row'];

type TradeInsert = Tables['trades']['Insert'];

export type CreateManualTradeInput = {
  accountId?: string;
  assetClass?: AssetClass;
  closedAt?: string | null;
  direction: TradeDirection;
  entryPrice: number;
  exchange?: string | null;
  exitPrice?: number | null;
  fees?: number;
  notes?: string | null;
  openedAt: string;
  quantity: number;
  symbol: string;
};

export type ListTradesOptions = {
  limit?: number;
};

export type TradeSummary = TradeRow & {
  asset: Pick<AssetRow, 'asset_class' | 'id' | 'symbol'> | null;
};

export class TradeServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TradeServiceError';
  }
}

export async function createManualTrade(input: CreateManualTradeInput): Promise<TradeRow> {
  const userId = await requireUserId();
  const asset = await findOrCreateAsset({
    assetClass: input.assetClass ?? 'other',
    exchange: input.exchange ?? null,
    symbol: input.symbol
  });
  const account = input.accountId
    ? await requireOwnedAccount(input.accountId, userId)
    : await getOrCreateDefaultAccount(userId);

  const insert: TradeInsert = {
    account_id: account.id,
    asset_id: asset.id,
    closed_at: input.closedAt ?? null,
    direction: input.direction,
    entry_price: input.entryPrice,
    exit_price: input.exitPrice ?? null,
    fees: input.fees ?? 0,
    notes: normalizeOptionalText(input.notes),
    opened_at: input.openedAt,
    quantity: input.quantity,
    status: input.closedAt && input.exitPrice ? 'closed' : 'open',
    user_id: userId
  };

  const { data, error } = await supabase.from('trades').insert(insert).select().single();

  if (error) {
    throw toTradeServiceError('Could not save trade.', error);
  }

  return data;
}

export async function listTrades(options: ListTradesOptions = {}): Promise<TradeRow[]> {
  const userId = await requireUserId();
  const limit = options.limit ?? 50;

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw toTradeServiceError('Could not load trades.', error);
  }

  return data;
}

export async function listTradeSummaries(options: ListTradesOptions = {}): Promise<TradeSummary[]> {
  const trades = await listTrades(options);

  if (trades.length === 0) {
    return [];
  }

  const assetIds = Array.from(new Set(trades.map((trade) => trade.asset_id)));
  const { data: assets, error } = await supabase
    .from('assets')
    .select('asset_class, id, symbol')
    .in('id', assetIds);

  if (error) {
    throw toTradeServiceError('Could not load trade assets.', error);
  }

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return trades.map((trade) => ({
    ...trade,
    asset: assetsById.get(trade.asset_id) ?? null
  }));
}

export async function getTrade(tradeId: string): Promise<TradeSummary> {
  const userId = await requireUserId();
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .select('*')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (tradeError) {
    throw toTradeServiceError('Could not load trade.', tradeError);
  }

  if (!trade) {
    throw new TradeServiceError('Trade was not found.');
  }

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('asset_class, id, symbol')
    .eq('id', trade.asset_id)
    .maybeSingle();

  if (assetError) {
    throw toTradeServiceError('Could not load trade asset.', assetError);
  }

  return {
    ...trade,
    asset: asset ?? null
  };
}

async function findOrCreateAsset(input: {
  assetClass: AssetClass;
  exchange: string | null;
  symbol: string;
}): Promise<AssetRow> {
  const symbol = input.symbol.trim().toUpperCase();

  if (!symbol) {
    throw new TradeServiceError('Asset symbol is required.');
  }

  const existingQuery = supabase
    .from('assets')
    .select('*')
    .eq('symbol', symbol)
    .eq('asset_class', input.assetClass);

  const { data: existing, error: findError } = input.exchange
    ? await existingQuery.eq('exchange', input.exchange).maybeSingle()
    : await existingQuery.is('exchange', null).maybeSingle();

  if (findError) {
    throw toTradeServiceError('Could not check asset.', findError);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from('assets')
    .insert({
      asset_class: input.assetClass,
      exchange: input.exchange,
      symbol
    })
    .select()
    .single();

  if (insertError) {
    throw toTradeServiceError('Could not create asset.', insertError);
  }

  return created;
}

async function getOrCreateDefaultAccount(userId: string): Promise<AccountRow> {
  const { data: existing, error: findError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw toTradeServiceError('Could not check trading account.', findError);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from('accounts')
    .insert({
      name: 'Manual Trading',
      user_id: userId
    })
    .select()
    .single();

  if (insertError) {
    throw toTradeServiceError('Could not create trading account.', insertError);
  }

  return created;
}

async function requireOwnedAccount(accountId: string, userId: string): Promise<AccountRow> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw toTradeServiceError('Could not check trading account.', error);
  }

  if (!data) {
    throw new TradeServiceError('Selected trading account was not found.');
  }

  return data;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw toTradeServiceError('Could not verify your session.', error);
  }

  if (!data.user) {
    throw new TradeServiceError('You need to sign in before saving trades.');
  }

  return data.user.id;
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toTradeServiceError(message: string, error: { message: string }) {
  return new TradeServiceError(`${message} ${error.message}`);
}
