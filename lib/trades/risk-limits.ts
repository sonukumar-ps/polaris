import { supabase } from '@/lib/supabase';

function toError(message: string, cause: { message: string }): Error {
  const err = new Error(`${message} ${cause.message}`);
  err.name = 'TradeServiceError';
  return err;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You need to sign in.');
  }

  return data.user.id;
}

export type RiskLimits = {
  circuitBreakerEnabled: boolean;
  maxDailyLossAmount: number | null;
  maxDailyLossPct: number | null;
  maxWeeklyLossAmount: number | null;
  maxWeeklyLossPct: number | null;
};

export type RiskLimitsInput = Partial<RiskLimits>;

export type DrawdownStatus = {
  dailyBreached: boolean;
  dailyLoss: number;        // Today's net P&L (negative = loss)
  dailyLossLimit: number | null;  // Effective threshold (lower of pct/amount), as a negative number
  dailyLossPct: number;     // Today's loss as % of weekStartEquity
  hasAnyLimit: boolean;
  weeklyBreached: boolean;
  weeklyLoss: number;       // This week's net P&L
  weeklyLossLimit: number | null;
  weeklyLossPct: number;
};

const DEFAULT_LIMITS: RiskLimits = {
  circuitBreakerEnabled: true,
  maxDailyLossAmount: null,
  maxDailyLossPct: null,
  maxWeeklyLossAmount: null,
  maxWeeklyLossPct: null
};

export async function getRiskLimits(): Promise<RiskLimits> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'circuit_breaker_enabled, max_daily_loss_amount, max_daily_loss_pct, max_weekly_loss_amount, max_weekly_loss_pct'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw toError('Could not load risk limits.', error);
  }

  if (!data) {
    return DEFAULT_LIMITS;
  }

  return {
    circuitBreakerEnabled: data.circuit_breaker_enabled ?? true,
    maxDailyLossAmount: data.max_daily_loss_amount,
    maxDailyLossPct: data.max_daily_loss_pct,
    maxWeeklyLossAmount: data.max_weekly_loss_amount,
    maxWeeklyLossPct: data.max_weekly_loss_pct
  };
}

export async function updateRiskLimits(input: RiskLimitsInput): Promise<RiskLimits> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      circuit_breaker_enabled: input.circuitBreakerEnabled,
      max_daily_loss_amount: input.maxDailyLossAmount,
      max_daily_loss_pct: input.maxDailyLossPct,
      max_weekly_loss_amount: input.maxWeeklyLossAmount,
      max_weekly_loss_pct: input.maxWeeklyLossPct,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select(
      'circuit_breaker_enabled, max_daily_loss_amount, max_daily_loss_pct, max_weekly_loss_amount, max_weekly_loss_pct'
    )
    .single();

  if (error) {
    throw toError('Could not save risk limits.', error);
  }

  return {
    circuitBreakerEnabled: data.circuit_breaker_enabled ?? true,
    maxDailyLossAmount: data.max_daily_loss_amount,
    maxDailyLossPct: data.max_daily_loss_pct,
    maxWeeklyLossAmount: data.max_weekly_loss_amount,
    maxWeeklyLossPct: data.max_weekly_loss_pct
  };
}

/**
 * Compute today's and this week's realized P&L and decide whether
 * the user has breached their configured circuit-breaker thresholds.
 *
 * Week starts Monday (Jason's convention).
 */
export async function getDrawdownStatus(accountBalance?: number): Promise<DrawdownStatus> {
  const userId = await requireUserId();
  const limits = await getRiskLimits();

  // Day boundaries (UTC for stable behavior across timezones)
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  // Week boundary — Monday 00:00 UTC
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysSinceMonday);

  // Fetch trades closed in the week range
  const { data: trades, error } = await supabase
    .from('trades')
    .select('closed_at, net_pnl')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .gte('closed_at', startOfWeek.toISOString())
    .lte('closed_at', now.toISOString())
    .not('net_pnl', 'is', null);

  if (error) {
    throw toError('Could not compute drawdown.', error);
  }

  let dailyLoss = 0;
  let weeklyLoss = 0;

  for (const trade of trades ?? []) {
    if (!trade.closed_at || trade.net_pnl === null) continue;
    const closedAt = new Date(trade.closed_at);
    const pnl = Number(trade.net_pnl);

    weeklyLoss += pnl;
    if (closedAt >= startOfToday) {
      dailyLoss += pnl;
    }
  }

  // Compute effective limits (lower of pct/amount when both set, expressed as negative loss thresholds)
  function effectiveLimit(pct: number | null, amount: number | null): number | null {
    let limit: number | null = null;
    if (pct !== null && accountBalance) {
      limit = -((accountBalance * Number(pct)) / 100);
    }
    if (amount !== null) {
      const amt = -Math.abs(Number(amount));
      // Lower (more negative) threshold wins when both set
      limit = limit === null ? amt : Math.max(limit, amt);
    }
    return limit;
  }

  const dailyLossLimit = effectiveLimit(limits.maxDailyLossPct, limits.maxDailyLossAmount);
  const weeklyLossLimit = effectiveLimit(limits.maxWeeklyLossPct, limits.maxWeeklyLossAmount);

  const hasAnyLimit = dailyLossLimit !== null || weeklyLossLimit !== null;

  const dailyBreached =
    limits.circuitBreakerEnabled && dailyLossLimit !== null && dailyLoss <= dailyLossLimit;
  const weeklyBreached =
    limits.circuitBreakerEnabled && weeklyLossLimit !== null && weeklyLoss <= weeklyLossLimit;

  return {
    dailyBreached,
    dailyLoss,
    dailyLossLimit,
    dailyLossPct: accountBalance ? (dailyLoss / accountBalance) * 100 : 0,
    hasAnyLimit,
    weeklyBreached,
    weeklyLoss,
    weeklyLossLimit,
    weeklyLossPct: accountBalance ? (weeklyLoss / accountBalance) * 100 : 0
  };
}
