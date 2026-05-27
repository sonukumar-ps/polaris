import { supabase } from '@/lib/supabase';

import type { SrLevelInput, SrLevelRow } from './sr-level.types';

function toError(message: string, cause: { message: string }): Error {
  const err = new Error(`${message} ${cause.message}`);
  err.name = 'TradeServiceError';
  return err;
}

function requireError(message: string): Error {
  const err = new Error(message);
  err.name = 'TradeServiceError';
  return err;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw toError('Could not verify your session.', error);
  }

  if (!data.user) {
    throw requireError('You need to sign in before managing S/R levels.');
  }

  return data.user.id;
}

export async function createSrLevel(input: SrLevelInput): Promise<SrLevelRow> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('sr_levels')
    .insert({
      is_active: input.isActive ?? true,
      last_touched_date: input.lastTouchedDate ?? null,
      level_role: input.levelRole ?? null,
      notes: input.notes ?? null,
      price: input.price,
      symbol: input.symbol.toUpperCase(),
      touch_count: input.touchCount ?? 1,
      type: input.type,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    throw toError('Could not create S/R level.', error);
  }

  return data;
}

export async function updateSrLevel(id: string, input: Partial<SrLevelInput>): Promise<SrLevelRow> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('sr_levels')
    .update({
      is_active: input.isActive,
      last_touched_date: input.lastTouchedDate,
      level_role: input.levelRole,
      notes: input.notes,
      price: input.price,
      symbol: input.symbol !== undefined ? input.symbol.toUpperCase() : undefined,
      touch_count: input.touchCount,
      type: input.type,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw toError('Could not update S/R level.', error);
  }

  return data;
}

export async function listSrLevels(options?: {
  activeOnly?: boolean;
  symbol?: string;
}): Promise<SrLevelRow[]> {
  const userId = await requireUserId();

  let query = supabase
    .from('sr_levels')
    .select('*')
    .eq('user_id', userId);

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  if (options?.symbol) {
    query = query.eq('symbol', options.symbol.toUpperCase());
  }

  const { data, error } = await query
    .order('symbol', { ascending: true })
    .order('price', { ascending: false });

  if (error) {
    throw toError('Could not load S/R levels.', error);
  }

  return data;
}

export async function deleteSrLevel(id: string): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('sr_levels')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw toError('Could not delete S/R level.', error);
  }
}

/**
 * Increments touch_count and updates last_touched_date.
 * Use when price reacts at a level (mark it as "touched again").
 */
export async function incrementLevelTouch(id: string, touchedDate?: string): Promise<SrLevelRow> {
  const userId = await requireUserId();

  const { data: existing, error: findError } = await supabase
    .from('sr_levels')
    .select('touch_count')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (findError) {
    throw toError('Could not find S/R level.', findError);
  }

  if (!existing) {
    throw requireError('S/R level was not found.');
  }

  const { data, error } = await supabase
    .from('sr_levels')
    .update({
      last_touched_date: touchedDate ?? new Date().toISOString().slice(0, 10),
      touch_count: existing.touch_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw toError('Could not increment touch count.', error);
  }

  return data;
}
