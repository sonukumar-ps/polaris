import { supabase } from '@/lib/supabase';

import type { StrategyChecklistInput, StrategyChecklistRow } from './checklist.types';

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
    throw requireError('You need to sign in before using checklists.');
  }

  return data.user.id;
}

export async function upsertChecklist(input: StrategyChecklistInput): Promise<StrategyChecklistRow> {
  const userId = await requireUserId();

  // Verify strategy belongs to user
  const { data: strategy, error: stratError } = await supabase
    .from('strategies')
    .select('id')
    .eq('id', input.strategyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (stratError) {
    throw toError('Could not check strategy.', stratError);
  }

  if (!strategy) {
    throw requireError('Strategy was not found.');
  }

  const { data, error } = await supabase
    .from('strategy_checklists')
    .upsert(
      {
        candlestick_pattern: input.candlestickPattern ?? null,
        checklist_date: input.checklistDate,
        correlation_pairs: input.correlationPairs ?? null,
        deceleration_evidence: input.decelerationEvidence ?? null,
        deceleration_pass: input.decelerationPass ?? null,
        decision: input.decision ?? null,
        decision_reason: input.decisionReason ?? null,
        direction: input.direction ?? null,
        ema50_position_pass: input.ema50PositionPass ?? null,
        ema_zone_visited_pass: input.emaZoneVisitedPass ?? null,
        emotional_rating: input.emotionalRating ?? null,
        indicator_signal: input.indicatorSignal ?? null,
        market_condition_note: input.marketConditionNote ?? null,
        market_condition_pass: input.marketConditionPass ?? null,
        market_phase: input.marketPhase ?? null,
        market_phase_pass: input.marketPhasePass ?? null,
        mtf_confirmation: input.mtfConfirmation ?? null,
        news_check_clear: input.newsCheckClear ?? null,
        reversal_pattern: input.reversalPattern ?? null,
        reversal_sr_pass: input.reversalSrPass ?? null,
        rr_on_trade: input.rrOnTrade ?? null,
        rr_to_last_swing: input.rrToLastSwing ?? null,
        rr_to_next_sr: input.rrToNextSr ?? null,
        sr_reaction_pass: input.srReactionPass ?? null,
        sr_touch_count: input.srTouchCount ?? null,
        sr_types: input.srTypes ?? null,
        strategy_id: input.strategyId,
        strategy_type: input.strategyType,
        symbol: input.symbol.toUpperCase(),
        total_sr_touches: input.totalSrTouches ?? null,
        trade_id: input.tradeId ?? null,
        updated_at: new Date().toISOString(),
        user_id: userId
      },
      { onConflict: 'user_id,strategy_id,symbol,checklist_date' }
    )
    .select()
    .single();

  if (error) {
    throw toError('Could not save checklist.', error);
  }

  return data;
}

export async function getChecklist(id: string): Promise<StrategyChecklistRow | null> {
  const { data, error } = await supabase
    .from('strategy_checklists')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw toError('Could not load checklist.', error);
  }

  return data;
}

export async function getChecklistForPairDate(input: {
  checklistDate: string;
  strategyId: string;
  symbol: string;
}): Promise<StrategyChecklistRow | null> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('strategy_checklists')
    .select('*')
    .eq('user_id', userId)
    .eq('strategy_id', input.strategyId)
    .eq('symbol', input.symbol.toUpperCase())
    .eq('checklist_date', input.checklistDate)
    .maybeSingle();

  if (error) {
    throw toError('Could not load checklist.', error);
  }

  return data;
}

export async function listChecklistsByDate(
  checklistDate: string,
  options?: { strategyId?: string }
): Promise<StrategyChecklistRow[]> {
  const userId = await requireUserId();

  let query = supabase
    .from('strategy_checklists')
    .select('*')
    .eq('user_id', userId)
    .eq('checklist_date', checklistDate);

  if (options?.strategyId) {
    query = query.eq('strategy_id', options.strategyId);
  }

  const { data, error } = await query.order('symbol', { ascending: true });

  if (error) {
    throw toError('Could not load checklists.', error);
  }

  return data;
}

export async function listChecklistsBySymbol(
  symbol: string,
  options?: { limit?: number }
): Promise<StrategyChecklistRow[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('strategy_checklists')
    .select('*')
    .eq('user_id', userId)
    .eq('symbol', symbol.toUpperCase())
    .order('checklist_date', { ascending: false })
    .limit(options?.limit ?? 50);

  if (error) {
    throw toError('Could not load checklists.', error);
  }

  return data;
}

export async function deleteChecklist(id: string): Promise<void> {
  const userId = await requireUserId();

  const { data: existing, error: findError } = await supabase
    .from('strategy_checklists')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (findError) {
    throw toError('Could not check checklist.', findError);
  }

  if (!existing) {
    throw requireError('Checklist was not found.');
  }

  const { error } = await supabase
    .from('strategy_checklists')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw toError('Could not delete checklist.', error);
  }
}

export async function linkChecklistToTrade(
  checklistId: string,
  tradeId: string
): Promise<StrategyChecklistRow> {
  const userId = await requireUserId();

  // Verify checklist ownership
  const { data: checklist, error: clError } = await supabase
    .from('strategy_checklists')
    .select('id')
    .eq('id', checklistId)
    .eq('user_id', userId)
    .maybeSingle();

  if (clError) {
    throw toError('Could not check checklist.', clError);
  }

  if (!checklist) {
    throw requireError('Checklist was not found.');
  }

  // Verify trade ownership
  const { data: trade, error: trError } = await supabase
    .from('trades')
    .select('id')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (trError) {
    throw toError('Could not check trade.', trError);
  }

  if (!trade) {
    throw requireError('Trade was not found.');
  }

  const { data, error } = await supabase
    .from('strategy_checklists')
    .update({ trade_id: tradeId, updated_at: new Date().toISOString() })
    .eq('id', checklistId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw toError('Could not link checklist to trade.', error);
  }

  return data;
}
