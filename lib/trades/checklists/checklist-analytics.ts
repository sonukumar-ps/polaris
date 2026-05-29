import { supabase } from '@/lib/supabase';

import type { StrategyChecklistRow } from './checklist.types';

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

export type ChecklistAnalyticsSummary = {
  // Qualified setups
  qualifiedCount: number;
  qualifyRate: number;  // qualified / total
  totalChecklists: number;

  // Decision breakdown
  decisionBreakdown: {
    skip: number;
    trade: number;
    watch: number;
    undecided: number;
  };

  // Completion consistency
  daysWithChecklists: number;
  totalDaysInRange: number;
  consistencyRate: number;  // daysWithChecklists / totalDaysInRange

  // Outcome of qualified trades
  qualifiedTradesPlaced: number;  // qualified + decision=trade + has linked trade
  qualifiedTradesWon: number;
  qualifiedTradesLost: number;
  qualifiedWinRate: number;

  // Untriggered order rate (orders that expired without filling)
  ordersPlacedFromChecklist: number;
  ordersTriggered: number;
  ordersExpired: number;
  triggerRate: number;

  // Critical column pass rates — which criterion fails most often?
  criticalColumnStats: {
    marketCondition: { fillRate: number; passRate: number };
    marketPhase: { fillRate: number; passRate: number };
    srReaction: { fillRate: number; passRate: number };
    deceleration: { fillRate: number; passRate: number };
  };
};

export type DailyChecklistCount = {
  date: string;
  qualified: number;
  total: number;
  traded: number;
};

/**
 * Computes analytics over a date range for the current user.
 */
export async function getChecklistAnalytics(options: {
  endDate: string;  // YYYY-MM-DD inclusive
  startDate: string;  // YYYY-MM-DD inclusive
  strategyId?: string;
}): Promise<ChecklistAnalyticsSummary> {
  const userId = await requireUserId();

  let query = supabase
    .from('strategy_checklists')
    .select('*')
    .eq('user_id', userId)
    .gte('checklist_date', options.startDate)
    .lte('checklist_date', options.endDate);

  if (options.strategyId) {
    query = query.eq('strategy_id', options.strategyId);
  }

  const { data: checklists, error } = await query;

  if (error) {
    throw toError('Could not load checklists.', error);
  }

  const rows: StrategyChecklistRow[] = checklists ?? [];

  // Load trades linked to these checklists
  const linkedTradeIds = rows
    .map((r) => r.trade_id)
    .filter((id): id is string => id !== null);

  let tradeMap = new Map<string, {
    is_bulletproof: boolean | null;
    net_pnl: number | null;
    order_expired: boolean | null;
    order_triggered: boolean | null;
    status: string;
  }>();

  if (linkedTradeIds.length > 0) {
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('id, net_pnl, status, order_triggered, order_expired, is_bulletproof')
      .in('id', linkedTradeIds)
      .eq('user_id', userId);

    if (tradesError) {
      throw toError('Could not load linked trades.', tradesError);
    }

    tradeMap = new Map(
      (trades ?? []).map((t) => [
        t.id,
        {
          is_bulletproof: t.is_bulletproof,
          net_pnl: t.net_pnl,
          order_expired: t.order_expired,
          order_triggered: t.order_triggered,
          status: t.status
        }
      ])
    );
  }

  // Calculate metrics
  const total = rows.length;

  const isQualified = (r: StrategyChecklistRow) =>
    r.market_condition_pass === true &&
    r.market_phase_pass === true &&
    r.sr_reaction_pass === true &&
    r.deceleration_pass === true;

  const qualified = rows.filter(isQualified);

  const decisionBreakdown = {
    skip: rows.filter((r) => r.decision === 'skip').length,
    trade: rows.filter((r) => r.decision === 'trade').length,
    undecided: rows.filter((r) => !r.decision).length,
    watch: rows.filter((r) => r.decision === 'watch').length
  };

  // Days with checklists vs total days in range
  const uniqueDays = new Set(rows.map((r) => r.checklist_date));
  const totalDays = daysBetween(options.startDate, options.endDate);

  // Qualified trades placed
  const qualifiedWithTrade = qualified.filter(
    (r) => r.decision === 'trade' && r.trade_id && tradeMap.has(r.trade_id)
  );

  const closedQualifiedTrades = qualifiedWithTrade.filter((r) => {
    const t = r.trade_id ? tradeMap.get(r.trade_id) : null;
    return t?.status === 'closed' && t.net_pnl !== null;
  });

  const qualifiedWon = closedQualifiedTrades.filter((r) => {
    const t = r.trade_id ? tradeMap.get(r.trade_id) : null;
    return t && t.net_pnl !== null && Number(t.net_pnl) > 0;
  }).length;

  const qualifiedLost = closedQualifiedTrades.filter((r) => {
    const t = r.trade_id ? tradeMap.get(r.trade_id) : null;
    return t && t.net_pnl !== null && Number(t.net_pnl) <= 0;
  }).length;

  // Order trigger rate
  const ordersPlaced = qualifiedWithTrade.filter((r) => {
    const t = r.trade_id ? tradeMap.get(r.trade_id) : null;
    return t !== null && t !== undefined;
  });

  const ordersTriggered = ordersPlaced.filter((r) => {
    const t = r.trade_id ? tradeMap.get(r.trade_id) : null;
    return t?.order_triggered === true;
  }).length;

  const ordersExpired = ordersPlaced.filter((r) => {
    const t = r.trade_id ? tradeMap.get(r.trade_id) : null;
    return t?.order_expired === true;
  }).length;

  // Critical column pass rates
  function stats(filter: (r: StrategyChecklistRow) => boolean | null) {
    const withValue = rows.filter((r) => filter(r) !== null);
    const passed = rows.filter((r) => filter(r) === true);
    return {
      fillRate: total > 0 ? withValue.length / total : 0,
      passRate: withValue.length > 0 ? passed.length / withValue.length : 0
    };
  }

  return {
    consistencyRate: totalDays > 0 ? uniqueDays.size / totalDays : 0,
    criticalColumnStats: {
      deceleration: stats((r) => r.deceleration_pass),
      marketCondition: stats((r) => r.market_condition_pass),
      marketPhase: stats((r) => r.market_phase_pass),
      srReaction: stats((r) => r.sr_reaction_pass)
    },
    daysWithChecklists: uniqueDays.size,
    decisionBreakdown,
    ordersExpired,
    ordersPlacedFromChecklist: ordersPlaced.length,
    ordersTriggered,
    qualifiedCount: qualified.length,
    qualifiedTradesLost: qualifiedLost,
    qualifiedTradesPlaced: qualifiedWithTrade.length,
    qualifiedTradesWon: qualifiedWon,
    qualifiedWinRate:
      qualifiedWon + qualifiedLost > 0 ? qualifiedWon / (qualifiedWon + qualifiedLost) : 0,
    qualifyRate: total > 0 ? qualified.length / total : 0,
    totalChecklists: total,
    totalDaysInRange: totalDays,
    triggerRate: ordersPlaced.length > 0 ? ordersTriggered / ordersPlaced.length : 0
  };
}

/**
 * Returns daily breakdown for the date range — used for a sparkline/chart.
 */
export async function getChecklistDailyBreakdown(options: {
  endDate: string;
  startDate: string;
  strategyId?: string;
}): Promise<DailyChecklistCount[]> {
  const userId = await requireUserId();

  let query = supabase
    .from('strategy_checklists')
    .select('checklist_date, decision, market_condition_pass, market_phase_pass, sr_reaction_pass, deceleration_pass')
    .eq('user_id', userId)
    .gte('checklist_date', options.startDate)
    .lte('checklist_date', options.endDate);

  if (options.strategyId) {
    query = query.eq('strategy_id', options.strategyId);
  }

  const { data, error } = await query.order('checklist_date', { ascending: true });

  if (error) {
    throw toError('Could not load daily breakdown.', error);
  }

  const dayMap = new Map<string, DailyChecklistCount>();

  for (const row of data ?? []) {
    const date = row.checklist_date;
    const existing = dayMap.get(date) ?? {
      date,
      qualified: 0,
      total: 0,
      traded: 0
    };

    existing.total++;

    const isQualified =
      row.market_condition_pass === true &&
      row.market_phase_pass === true &&
      row.sr_reaction_pass === true &&
      row.deceleration_pass === true;

    if (isQualified) existing.qualified++;
    if (row.decision === 'trade') existing.traded++;

    dayMap.set(date, existing);
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00.000Z`).getTime();
  const end = new Date(`${endISO}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}
