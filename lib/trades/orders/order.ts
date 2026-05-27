import { supabase } from '@/lib/supabase';

import type { StopLossHistoryInput, StopLossHistoryRow } from './order.types';

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
    throw requireError('You need to sign in before using order management.');
  }

  return data.user.id;
}

/* ── Stop-loss history CRUD ─────────────────────────────────── */

export async function addStopLossMove(input: StopLossHistoryInput): Promise<StopLossHistoryRow> {
  const userId = await requireUserId();

  // Verify trade ownership
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .select('id, trailing_stop_count')
    .eq('id', input.tradeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (tradeError) {
    throw toError('Could not check trade.', tradeError);
  }

  if (!trade) {
    throw requireError('Trade was not found.');
  }

  // Insert the SL move
  const { data, error } = await supabase
    .from('stop_loss_history')
    .insert({
      moved_at: input.movedAt ?? new Date().toISOString(),
      new_price: input.newPrice,
      old_price: input.oldPrice,
      reason: input.reason ?? null,
      trade_id: input.tradeId,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    throw toError('Could not record stop-loss move.', error);
  }

  // Increment trailing_stop_count on the trade
  const currentCount = trade.trailing_stop_count ?? 0;

  await supabase
    .from('trades')
    .update({
      trailing_stop_count: currentCount + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', input.tradeId)
    .eq('user_id', userId);

  return data;
}

export async function listStopLossMoves(tradeId: string): Promise<StopLossHistoryRow[]> {
  const userId = await requireUserId();

  // Verify trade ownership
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .select('id')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (tradeError) {
    throw toError('Could not check trade.', tradeError);
  }

  if (!trade) {
    throw requireError('Trade was not found.');
  }

  const { data, error } = await supabase
    .from('stop_loss_history')
    .select('*')
    .eq('trade_id', tradeId)
    .eq('user_id', userId)
    .order('moved_at', { ascending: true });

  if (error) {
    throw toError('Could not load stop-loss history.', error);
  }

  return data;
}

export async function deleteStopLossMove(id: string): Promise<void> {
  const userId = await requireUserId();

  const { data: existing, error: findError } = await supabase
    .from('stop_loss_history')
    .select('id, trade_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (findError) {
    throw toError('Could not check stop-loss record.', findError);
  }

  if (!existing) {
    throw requireError('Stop-loss record was not found.');
  }

  const { error } = await supabase
    .from('stop_loss_history')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw toError('Could not delete stop-loss record.', error);
  }

  // Decrement trailing_stop_count on the trade
  const { data: trade } = await supabase
    .from('trades')
    .select('trailing_stop_count')
    .eq('id', existing.trade_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (trade) {
    const newCount = Math.max(0, (trade.trailing_stop_count ?? 1) - 1);

    await supabase
      .from('trades')
      .update({
        trailing_stop_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.trade_id)
      .eq('user_id', userId);
  }
}

/* ── Order expiry helper ────────────────────────────────────── */

/**
 * Marks a pending order as expired.
 * Call when the 24h expiry passes without a trigger.
 */
export async function markOrderExpired(tradeId: string): Promise<void> {
  const userId = await requireUserId();

  const { data: trade, error: findError } = await supabase
    .from('trades')
    .select('id, entry_order_type, order_triggered')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (findError) {
    throw toError('Could not check trade.', findError);
  }

  if (!trade) {
    throw requireError('Trade was not found.');
  }

  if (trade.order_triggered) {
    throw requireError('Cannot expire an order that has already triggered.');
  }

  const { error } = await supabase
    .from('trades')
    .update({
      order_expired: true,
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', tradeId)
    .eq('user_id', userId);

  if (error) {
    throw toError('Could not mark order as expired.', error);
  }
}

/**
 * Marks a pending order as triggered (filled).
 * Optionally records slippage if actual fill differs from intended entry.
 */
export async function markOrderTriggered(
  tradeId: string,
  actualEntryPrice?: number
): Promise<void> {
  const userId = await requireUserId();

  const { data: trade, error: findError } = await supabase
    .from('trades')
    .select('id, intended_entry_price, order_expired')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (findError) {
    throw toError('Could not check trade.', findError);
  }

  if (!trade) {
    throw requireError('Trade was not found.');
  }

  if (trade.order_expired) {
    throw requireError('Cannot trigger an expired order.');
  }

  // Calculate slippage if we have both intended and actual price
  let slippagePips: number | null = null;

  if (actualEntryPrice !== undefined && trade.intended_entry_price !== null) {
    slippagePips = Math.abs(actualEntryPrice - Number(trade.intended_entry_price));
  }

  const { error } = await supabase
    .from('trades')
    .update({
      entry_price: actualEntryPrice ?? undefined,
      order_triggered: true,
      slippage_pips: slippagePips,
      updated_at: new Date().toISOString()
    })
    .eq('id', tradeId)
    .eq('user_id', userId);

  if (error) {
    throw toError('Could not mark order as triggered.', error);
  }
}

/**
 * Marks a trade as bulletproof (SL moved to breakeven or better).
 */
export async function markBulletproof(tradeId: string): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('trades')
    .update({
      is_bulletproof: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', tradeId)
    .eq('user_id', userId);

  if (error) {
    throw toError('Could not mark trade as bulletproof.', error);
  }
}
