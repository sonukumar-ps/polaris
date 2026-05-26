import { supabase } from '@/lib/supabase';

import type { TradePsychologyInput, TradePsychologyRow } from './psychology.types';

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
    throw requireError('You need to sign in before saving trades.');
  }

  return data.user.id;
}

export async function upsertTradePsychology(
  tradeId: string,
  input: TradePsychologyInput
): Promise<TradePsychologyRow> {
  const userId = await requireUserId();

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
    .from('trade_psychology')
    .upsert(
      {
        conviction_level: input.convictionLevel ?? null,
        emotional_state: input.emotionalState ?? null,
        energy_level: input.energyLevel ?? null,
        entry_timing: input.entryTiming ?? null,
        exit_timing: input.exitTiming ?? null,
        focus_level: input.focusLevel ?? null,
        followed_plan: input.followedPlan ?? null,
        htf_bias: input.htfBias ?? null,
        lesson: input.lesson ?? null,
        market_condition: input.marketCondition ?? null,
        moved_stop_loss: input.movedStopLoss ?? null,
        moved_take_profit: input.movedTakeProfit ?? null,
        position_size_adherence: input.positionSizeAdherence ?? null,
        session: input.session ?? null,
        setup_quality: input.setupQuality ?? null,
        trade_id: tradeId,
        updated_at: new Date().toISOString(),
        user_id: userId
      },
      { onConflict: 'trade_id' }
    )
    .select()
    .single();

  if (error) {
    throw toError('Could not save psychology data.', error);
  }

  return data;
}

export async function getTradePsychology(tradeId: string): Promise<TradePsychologyRow | null> {
  const { data, error } = await supabase
    .from('trade_psychology')
    .select('*')
    .eq('trade_id', tradeId)
    .maybeSingle();

  if (error) {
    throw toError('Could not load psychology data.', error);
  }

  return data;
}

export async function listTradePsychologies(tradeIds: string[]): Promise<Map<string, TradePsychologyRow>> {
  if (tradeIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('trade_psychology')
    .select('*')
    .in('trade_id', tradeIds);

  if (error) {
    throw toError('Could not load psychology data.', error);
  }

  return new Map(data.map((row) => [row.trade_id, row]));
}

export async function deleteTradePsychology(tradeId: string): Promise<void> {
  const userId = await requireUserId();

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

  const { error } = await supabase
    .from('trade_psychology')
    .delete()
    .eq('trade_id', tradeId)
    .eq('user_id', userId);

  if (error) {
    throw toError('Could not delete psychology data.', error);
  }
}
