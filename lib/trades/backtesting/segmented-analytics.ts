import type { TradeSummary } from '../service';

type ClosedTrade = TradeSummary & { net_pnl: number };

export type SessionPerformance = {
  avgRr: number;
  netPnl: number;
  profitFactor: number | null;
  session: string;
  tradeCount: number;
  winRate: number;
};

export type DayPerformance = {
  avgRr: number;
  day: string;
  netPnl: number;
  tradeCount: number;
  winRate: number;
};

export type PsychSegment = {
  avgRr: number;
  dimension: string;
  netPnl: number;
  tradeCount: number;
  value: string;
  winRate: number;
};

export type QualityBucket = {
  avgRr: number;
  netPnl: number;
  qualityScore: number;
  tradeCount: number;
  winRate: number;
};

export type ConvictionBucket = {
  avgRr: number;
  convictionRange: string;
  netPnl: number;
  tradeCount: number;
  winRate: number;
};

export type MarketConditionPerformance = {
  bestStrategy: string | null;
  condition: string;
  netPnl: number;
  tradeCount: number;
  winRate: number;
};

export type PostLossBehaviour = {
  avgTimeBetweenLossAndNextMinutes: number;
  baselineWinRate: number;
  postLossTradeCount: number;
  postLossWinRate: number;
  revengeTradeCount: number;
};

function isClosedTrade(trade: TradeSummary): trade is ClosedTrade {
  return trade.status === 'closed' && trade.net_pnl !== null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, v) => total + v, 0) / values.length;
}

function tradeMetrics(trades: ClosedTrade[]) {
  const winners = trades.filter((t) => t.net_pnl > 0);
  const losers = trades.filter((t) => t.net_pnl < 0);
  const netPnl = trades.reduce((sum, t) => sum + t.net_pnl, 0);
  const grossProfit = winners.reduce((sum, t) => sum + t.net_pnl, 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.net_pnl, 0));
  const avgRr = average(trades.map((t) => Number(t.r_multiple ?? 0)));
  const winRate = trades.length > 0 ? winners.length / trades.length : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;

  return { avgRr, grossLoss, grossProfit, netPnl, profitFactor, winRate };
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function calculateSessionPerformance(trades: TradeSummary[]): SessionPerformance[] {
  const closedTrades = trades.filter(isClosedTrade);
  const groups = new Map<string, ClosedTrade[]>();

  for (const trade of closedTrades) {
    const session = trade.psychology?.session;
    if (!session) continue;
    const existing = groups.get(session) ?? [];
    groups.set(session, [...existing, trade]);
  }

  return Array.from(groups.entries())
    .map(([session, sessionTrades]) => {
      const { avgRr, netPnl, profitFactor, winRate } = tradeMetrics(sessionTrades);
      return { avgRr, netPnl, profitFactor, session, tradeCount: sessionTrades.length, winRate };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

export function calculateDayPerformance(trades: TradeSummary[]): DayPerformance[] {
  const closedTrades = trades.filter(isClosedTrade);
  const groups = new Map<string, ClosedTrade[]>();

  for (const trade of closedTrades) {
    const day = DAY_NAMES[new Date(trade.opened_at).getDay()];
    const existing = groups.get(day) ?? [];
    groups.set(day, [...existing, trade]);
  }

  return DAY_ORDER.filter((day) => groups.has(day)).map((day) => {
    const dayTrades = groups.get(day)!;
    const { avgRr, netPnl, winRate } = tradeMetrics(dayTrades);
    return { avgRr, day, netPnl, tradeCount: dayTrades.length, winRate };
  });
}

export function calculatePsychologyPerformance(trades: TradeSummary[]): PsychSegment[] {
  const closedTrades = trades.filter(isClosedTrade);
  const dimensions: Array<{ dimension: string; getValue: (t: ClosedTrade) => string | null }> = [
    { dimension: 'emotional_state', getValue: (t) => t.psychology?.emotional_state ?? null },
    { dimension: 'energy_level', getValue: (t) => t.psychology?.energy_level?.toString() ?? null },
    { dimension: 'focus_level', getValue: (t) => t.psychology?.focus_level?.toString() ?? null },
    { dimension: 'market_condition', getValue: (t) => t.psychology?.market_condition ?? null },
    { dimension: 'htf_bias', getValue: (t) => t.psychology?.htf_bias ?? null }
  ];

  const segments: PsychSegment[] = [];

  for (const { dimension, getValue } of dimensions) {
    const groups = new Map<string, ClosedTrade[]>();

    for (const trade of closedTrades) {
      const value = getValue(trade);
      if (!value) continue;
      const existing = groups.get(value) ?? [];
      groups.set(value, [...existing, trade]);
    }

    for (const [value, groupTrades] of groups.entries()) {
      if (groupTrades.length < 3) continue;
      const { avgRr, netPnl, winRate } = tradeMetrics(groupTrades);
      segments.push({ avgRr, dimension, netPnl, tradeCount: groupTrades.length, value, winRate });
    }
  }

  return segments.sort((a, b) => b.netPnl - a.netPnl);
}

export function calculateQualityCorrelation(trades: TradeSummary[]): QualityBucket[] {
  const closedTrades = trades.filter(isClosedTrade);
  const groups = new Map<number, ClosedTrade[]>();

  for (const trade of closedTrades) {
    const quality = trade.psychology?.setup_quality;
    if (!quality) continue;
    const existing = groups.get(quality) ?? [];
    groups.set(quality, [...existing, trade]);
  }

  return Array.from(groups.entries())
    .filter(([, groupTrades]) => groupTrades.length >= 2)
    .map(([qualityScore, groupTrades]) => {
      const { avgRr, netPnl, winRate } = tradeMetrics(groupTrades);
      return { avgRr, netPnl, qualityScore, tradeCount: groupTrades.length, winRate };
    })
    .sort((a, b) => a.qualityScore - b.qualityScore);
}

export function calculateConvictionCorrelation(trades: TradeSummary[]): ConvictionBucket[] {
  const closedTrades = trades.filter(isClosedTrade);
  const buckets: Record<string, ClosedTrade[]> = { high: [], low: [], medium: [] };

  for (const trade of closedTrades) {
    const level = trade.psychology?.conviction_level;
    if (!level) continue;
    if (level <= 3) buckets.low.push(trade);
    else if (level <= 6) buckets.medium.push(trade);
    else buckets.high.push(trade);
  }

  const ranges: Array<{ key: string; label: string }> = [
    { key: 'low', label: 'low' },
    { key: 'medium', label: 'medium' },
    { key: 'high', label: 'high' }
  ];

  return ranges
    .filter(({ key }) => buckets[key].length >= 3)
    .map(({ key, label }) => {
      const groupTrades = buckets[key];
      const { avgRr, netPnl, winRate } = tradeMetrics(groupTrades);
      return { avgRr, convictionRange: label, netPnl, tradeCount: groupTrades.length, winRate };
    });
}

export function calculateMarketConditionPerformance(trades: TradeSummary[]): MarketConditionPerformance[] {
  const closedTrades = trades.filter(isClosedTrade);
  const conditionGroups = new Map<string, ClosedTrade[]>();

  for (const trade of closedTrades) {
    const condition = trade.psychology?.market_condition;
    if (!condition) continue;
    const existing = conditionGroups.get(condition) ?? [];
    conditionGroups.set(condition, [...existing, trade]);
  }

  return Array.from(conditionGroups.entries())
    .filter(([, groupTrades]) => groupTrades.length >= 3)
    .map(([condition, conditionTrades]) => {
      const { netPnl, winRate } = tradeMetrics(conditionTrades);

      const strategyWinRates = new Map<string, { name: string; wins: number; total: number }>();
      for (const trade of conditionTrades) {
        if (!trade.strategy_id || !trade.strategy) continue;
        const existing = strategyWinRates.get(trade.strategy_id) ?? {
          name: trade.strategy.name,
          total: 0,
          wins: 0
        };
        strategyWinRates.set(trade.strategy_id, {
          ...existing,
          total: existing.total + 1,
          wins: existing.wins + (trade.net_pnl > 0 ? 1 : 0)
        });
      }

      const bestStrategy = Array.from(strategyWinRates.values())
        .sort((a, b) => b.wins / b.total - a.wins / a.total)[0]?.name ?? null;

      return { bestStrategy, condition, netPnl, tradeCount: conditionTrades.length, winRate };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

export function analyzePostLossBehaviour(trades: TradeSummary[]): PostLossBehaviour | null {
  const closedTrades = trades
    .filter(isClosedTrade)
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());

  if (closedTrades.length < 2) return null;

  const baselineWinRate = closedTrades.filter((t) => t.net_pnl > 0).length / closedTrades.length;
  const postLossTrades: ClosedTrade[] = [];
  const timesMinutes: number[] = [];

  for (let i = 0; i < closedTrades.length - 1; i++) {
    const current = closedTrades[i];
    const next = closedTrades[i + 1];

    if (current.net_pnl >= 0) continue;

    postLossTrades.push(next);
    const lossCloseMs = new Date(current.closed_at!).getTime();
    const nextOpenMs = new Date(next.opened_at).getTime();
    timesMinutes.push((nextOpenMs - lossCloseMs) / 60000);
  }

  if (postLossTrades.length < 5) return null;

  const postLossWinRate = postLossTrades.filter((t) => t.net_pnl > 0).length / postLossTrades.length;
  const avgTimeBetweenLossAndNextMinutes = average(timesMinutes);
  const revengeTradeCount = postLossTrades.filter((t) => {
    const state = t.psychology?.emotional_state;
    return state === 'revenge' || state === 'frustrated';
  }).length;

  return {
    avgTimeBetweenLossAndNextMinutes,
    baselineWinRate,
    postLossTradeCount: postLossTrades.length,
    postLossWinRate,
    revengeTradeCount
  };
}
