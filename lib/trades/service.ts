import { supabase } from '@/lib/supabase';

import type { Database } from '@/lib/database.types';
import { calculateRealizedPnl } from './pnl';

type Tables = Database['public']['Tables'];

export type AssetClass = Database['public']['Enums']['asset_class'];
export type TagType = Database['public']['Enums']['tag_type'];
export type TradeDirection = Database['public']['Enums']['trade_direction'];
export type TradeRow = Tables['trades']['Row'];

type AccountRow = Tables['accounts']['Row'];
type AssetRow = Tables['assets']['Row'];
type TagRow = Tables['tags']['Row'];
type TradeImageRow = Tables['trade_images']['Row'];

type TradeInsert = Tables['trades']['Insert'];

export type CreateManualTradeInput = {
  accountId: string;
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
  tags?: ManualTradeTagInput[];
};

export type ListTradesOptions = {
  accountIds?: string[];
  limit?: number;
  tagId?: string;
};

export type ManualTradeTagInput = {
  name: string;
  type: TagType;
};

export type JournalTag = TagRow;
export type TradingAccount = AccountRow;
export type TradeTagSummary = Pick<TagRow, 'id' | 'name' | 'type'>;

export type TradeSummary = TradeRow & {
  asset: Pick<AssetRow, 'asset_class' | 'id' | 'symbol'> | null;
  tags: TradeTagSummary[];
};

export type TradeImage = TradeImageRow & {
  signedUrl: string | null;
};

export type UploadTradeImageInput = {
  caption?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  tradeId: string;
  uri: string;
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
  const account = await requireOwnedAccount(input.accountId, userId);
  const realizedPnl =
    input.closedAt && input.exitPrice
      ? calculateRealizedPnl({
          direction: input.direction,
          entryPrice: input.entryPrice,
          exitPrice: input.exitPrice,
          fees: input.fees ?? 0,
          quantity: input.quantity
        })
      : null;

  const insert: TradeInsert = {
    account_id: account.id,
    asset_id: asset.id,
    closed_at: input.closedAt ?? null,
    direction: input.direction,
    entry_price: input.entryPrice,
    exit_price: input.exitPrice ?? null,
    fees: input.fees ?? 0,
    gross_pnl: realizedPnl?.grossPnl ?? null,
    net_pnl: realizedPnl?.netPnl ?? null,
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

  await attachTagsToTrade({
    tags: input.tags ?? [],
    tradeId: data.id,
    userId
  });

  return data;
}

export async function listTrades(options: ListTradesOptions = {}): Promise<TradeRow[]> {
  const userId = await requireUserId();
  const limit = options.limit ?? 50;
  const taggedTradeIds = options.tagId ? await getTradeIdsForTag(options.tagId, userId) : null;

  if (taggedTradeIds && taggedTradeIds.length === 0) {
    return [];
  }

  if (options.accountIds && options.accountIds.length === 0) {
    return [];
  }

  let query = supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false })
    .limit(limit);

  if (taggedTradeIds) {
    query = query.in('id', taggedTradeIds);
  }

  if (options.accountIds) {
    query = query.in('account_id', options.accountIds);
  }

  const { data, error } = await query;

  if (error) {
    throw toTradeServiceError('Could not load trades.', error);
  }

  return data;
}

export async function listAccounts(): Promise<AccountRow[]> {
  const userId = await requireUserId();
  await getOrCreateDefaultAccount(userId);

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('is_main', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw toTradeServiceError('Could not load trading accounts.', error);
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

  const tagsByTradeId = await getTagsByTradeId(trades.map((trade) => trade.id));

  return trades.map((trade) => ({
    ...trade,
    asset: assetsById.get(trade.asset_id) ?? null,
    tags: tagsByTradeId.get(trade.id) ?? []
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
    asset: asset ?? null,
    tags: (await getTagsByTradeId([trade.id])).get(trade.id) ?? []
  };
}

export async function listTags(): Promise<TagRow[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw toTradeServiceError('Could not load tags.', error);
  }

  return data;
}

export async function listTradeImages(tradeId: string): Promise<TradeImage[]> {
  await getTrade(tradeId);

  const { data, error } = await supabase
    .from('trade_images')
    .select('*')
    .eq('trade_id', tradeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw toTradeServiceError('Could not load trade images.', error);
  }

  return Promise.all(
    data.map(async (image) => {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('trade-images')
        .createSignedUrl(image.storage_path, 60 * 10);

      return {
        ...image,
        signedUrl: signedUrlError ? null : signedUrlData.signedUrl
      };
    })
  );
}

export async function uploadTradeImage(input: UploadTradeImageInput): Promise<TradeImageRow> {
  const userId = await requireUserId();
  await getTrade(input.tradeId);

  const response = await fetch(input.uri);
  const fileBody = await response.blob();
  const storagePath = buildTradeImageStoragePath({
    fileName: input.fileName,
    mimeType: input.mimeType,
    tradeId: input.tradeId,
    userId
  });

  const { error: uploadError } = await supabase.storage
    .from('trade-images')
    .upload(storagePath, fileBody, {
      contentType: input.mimeType || fileBody.type || 'image/jpeg',
      upsert: false
    });

  if (uploadError) {
    throw toTradeServiceError('Could not upload chart screenshot.', uploadError);
  }

  const { data, error: insertError } = await supabase
    .from('trade_images')
    .insert({
      caption: normalizeOptionalText(input.caption),
      storage_path: storagePath,
      trade_id: input.tradeId,
      user_id: userId
    })
    .select()
    .single();

  if (insertError) {
    throw toTradeServiceError('Could not save screenshot metadata.', insertError);
  }

  return data;
}

function buildTradeImageStoragePath(input: {
  fileName?: string | null;
  mimeType?: string | null;
  tradeId: string;
  userId: string;
}) {
  const extensionFromMime = input.mimeType?.split('/')[1];
  const extensionFromName = input.fileName?.split('.').pop();
  const extension = sanitizePathSegment(extensionFromName || extensionFromMime || 'jpg');
  const basename = sanitizePathSegment(input.fileName?.replace(/\.[^.]+$/, '') || 'chart');

  return `${input.userId}/${input.tradeId}/${Date.now()}-${basename}.${extension}`;
}

function sanitizePathSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'file';
}

async function attachTagsToTrade(input: {
  tags: ManualTradeTagInput[];
  tradeId: string;
  userId: string;
}) {
  const normalizedTags = normalizeTags(input.tags);

  if (normalizedTags.length === 0) {
    return;
  }

  const tagRows = await Promise.all(
    normalizedTags.map((tag) =>
      findOrCreateTag({
        name: tag.name,
        type: tag.type,
        userId: input.userId
      })
    )
  );

  const { error } = await supabase.from('trade_tags').upsert(
    tagRows.map((tag) => ({
      tag_id: tag.id,
      trade_id: input.tradeId
    }))
  );

  if (error) {
    throw toTradeServiceError('Could not attach tags to trade.', error);
  }
}

async function findOrCreateTag(input: {
  name: string;
  type: TagType;
  userId: string;
}): Promise<TagRow> {
  const { data: existing, error: findError } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', input.userId)
    .eq('type', input.type)
    .eq('name', input.name)
    .maybeSingle();

  if (findError) {
    throw toTradeServiceError('Could not check tag.', findError);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from('tags')
    .insert({
      name: input.name,
      type: input.type,
      user_id: input.userId
    })
    .select()
    .single();

  if (insertError) {
    throw toTradeServiceError('Could not create tag.', insertError);
  }

  return created;
}

async function getTradeIdsForTag(tagId: string, userId: string) {
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('id', tagId)
    .eq('user_id', userId)
    .maybeSingle();

  if (tagError) {
    throw toTradeServiceError('Could not check tag filter.', tagError);
  }

  if (!tag) {
    return [];
  }

  const { data, error } = await supabase.from('trade_tags').select('trade_id').eq('tag_id', tagId);

  if (error) {
    throw toTradeServiceError('Could not filter trades by tag.', error);
  }

  return data.map((row) => row.trade_id);
}

async function getTagsByTradeId(tradeIds: string[]) {
  if (tradeIds.length === 0) {
    return new Map<string, TradeTagSummary[]>();
  }

  const { data: tradeTags, error: tradeTagsError } = await supabase
    .from('trade_tags')
    .select('trade_id, tag_id')
    .in('trade_id', tradeIds);

  if (tradeTagsError) {
    throw toTradeServiceError('Could not load trade tags.', tradeTagsError);
  }

  if (tradeTags.length === 0) {
    return new Map<string, TradeTagSummary[]>();
  }

  const tagIds = Array.from(new Set(tradeTags.map((tradeTag) => tradeTag.tag_id)));
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('id, name, type')
    .in('id', tagIds);

  if (tagsError) {
    throw toTradeServiceError('Could not load tags.', tagsError);
  }

  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const tagsByTradeId = new Map<string, TradeTagSummary[]>();

  for (const tradeTag of tradeTags) {
    const tag = tagsById.get(tradeTag.tag_id);

    if (!tag) {
      continue;
    }

    const existingTags = tagsByTradeId.get(tradeTag.trade_id) ?? [];
    tagsByTradeId.set(tradeTag.trade_id, [...existingTags, tag]);
  }

  return tagsByTradeId;
}

function normalizeTags(tags: ManualTradeTagInput[]) {
  const seen = new Set<string>();
  const normalizedTags: ManualTradeTagInput[] = [];

  for (const tag of tags) {
    const name = tag.name.trim();
    const key = `${tag.type}:${name.toLowerCase()}`;

    if (!name || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedTags.push({
      name,
      type: tag.type
    });
  }

  return normalizedTags;
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
    .eq('is_main', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw toTradeServiceError('Could not check trading account.', findError);
  }

  if (existing) {
    return existing;
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    throw toTradeServiceError('Could not check trading account.', fallbackError);
  }

  if (fallback) {
    const { data: promoted, error: promoteError } = await supabase
      .from('accounts')
      .update({ is_main: true })
      .eq('id', fallback.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (promoteError) {
      throw toTradeServiceError('Could not mark main trading account.', promoteError);
    }

    return promoted;
  }

  const { data: created, error: insertError } = await supabase
    .from('accounts')
    .insert({
      is_main: true,
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
