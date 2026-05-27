import type { Insight } from '../insights';
import type { TradeSummary } from '../service';
import { calculateExecutionScores } from './execution-score';

type ClosedTrade = TradeSummary & { net_pnl: number };

function isClosedTrade(trade: TradeSummary): trade is ClosedTrade {
  return trade.status === 'closed' && trade.net_pnl !== null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, v) => total + v, 0) / values.length;
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
    style: 'percent'
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

function formatR(value: number): string {
  return value.toFixed(2);
}

function formatSession(session: string): string {
  const labels: Record<string, string> = {
    asian: 'Asian',
    london: 'London',
    new_york: 'New York',
    overlap_london_ny: 'London/NY Overlap',
    sydney: 'Sydney'
  };
  return labels[session] ?? session;
}

function formatCondition(condition: string): string {
  return condition.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function hasPsychData(trades: TradeSummary[]): boolean {
  return trades.some((t) => t.psychology !== null && t.psychology !== undefined);
}

export function buildRevengeTradeInsight(trades: TradeSummary[]): Insight | null {
  if (!hasPsychData(trades)) return null;

  const closedTrades = trades
    .filter(isClosedTrade)
    .sort((a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime());

  for (let i = 0; i < closedTrades.length - 2; i++) {
    const anchor = closedTrades[i];
    if (anchor.net_pnl >= 0) continue;

    const cluster: ClosedTrade[] = [];
    const anchorTime = new Date(anchor.opened_at).getTime();

    for (let j = i + 1; j < closedTrades.length; j++) {
      const next = closedTrades[j];
      const diffMinutes = (new Date(next.opened_at).getTime() - anchorTime) / 60000;
      if (diffMinutes > 60) break;
      cluster.push(next);
    }

    if (cluster.length < 2) continue;

    const clusterPnl = cluster.reduce((sum, t) => sum + t.net_pnl, 0);
    if (clusterPnl >= 0) continue;

    const date = new Date(anchor.opened_at).toLocaleDateString('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const n = cluster.length;

    return {
      action: { label: 'Review cluster' },
      id: 'revenge-trade-cluster',
      metrics: [
        { label: 'Cluster P&L', tone: 'warning', value: formatCurrency(clusterPnl) },
        { label: 'Trades in cluster', tone: 'neutral', value: String(n) }
      ],
      reason: `You took ${n} trades within an hour after a loss on ${date}. The combined result was ${formatCurrency(clusterPnl)}. A simple rule — no trading for 30 minutes after a loss — would have avoided this.`,
      severity: 'warning',
      sourceTradeIds: cluster.map((t) => t.id),
      title: 'Cooling off could save you money'
    };
  }

  return null;
}

export function buildSetupQualityInsight(trades: TradeSummary[]): Insight | null {
  const closedTrades = trades.filter(isClosedTrade);

  const highQuality = closedTrades.filter((t) => {
    const q = t.psychology?.setup_quality;
    return q !== null && q !== undefined && q >= 4;
  });
  const lowQuality = closedTrades.filter((t) => {
    const q = t.psychology?.setup_quality;
    return q !== null && q !== undefined && q <= 2;
  });

  if (highQuality.length < 5 || lowQuality.length < 5) return null;

  const highRr = average(highQuality.map((t) => Number(t.r_multiple ?? 0)));
  const lowRr = average(lowQuality.map((t) => Number(t.r_multiple ?? 0)));

  if (highRr - lowRr < 0.5) return null;

  return {
    action: { label: 'Review low quality trades' },
    id: 'setup-quality-filter',
    metrics: [
      { label: 'High quality avg', tone: 'positive', value: `${formatR(highRr)}R` },
      { label: 'Low quality avg', tone: 'warning', value: `${formatR(lowRr)}R` }
    ],
    reason: `Your quality 4-5 setups average ${formatR(highRr)}R. Your 1-2 setups average ${formatR(lowRr)}R. You already know which trades to skip.`,
    severity: 'positive',
    sourceTradeIds: highQuality.map((t) => t.id),
    title: 'Trust your own quality ratings'
  };
}

export function buildEnergyCorrelationInsight(trades: TradeSummary[]): Insight | null {
  const closedTrades = trades.filter(isClosedTrade);

  const lowEnergy = closedTrades.filter((t) => {
    const e = t.psychology?.energy_level;
    return e !== null && e !== undefined && e <= 2;
  });

  if (lowEnergy.length < 5) return null;

  const baselineWinRate = closedTrades.filter((t) => t.net_pnl > 0).length / closedTrades.length;
  const lowEnergyWinRate = lowEnergy.filter((t) => t.net_pnl > 0).length / lowEnergy.length;

  if (baselineWinRate - lowEnergyWinRate < 0.15) return null;

  return {
    action: { label: 'Review low energy trades' },
    id: 'energy-correlation',
    metrics: [
      { label: 'Low energy win rate', tone: 'warning', value: formatPercent(lowEnergyWinRate) },
      { label: 'Baseline win rate', tone: 'neutral', value: formatPercent(baselineWinRate) }
    ],
    reason: `When your energy is low (1-2), your winrate drops to ${formatPercent(lowEnergyWinRate)} vs your ${formatPercent(baselineWinRate)} baseline. Consider sitting out when you're not sharp.`,
    severity: 'warning',
    sourceTradeIds: lowEnergy.map((t) => t.id),
    title: 'Low energy is costing you'
  };
}

export function buildEarlyExitInsight(trades: TradeSummary[]): Insight | null {
  const closedTrades = trades.filter(isClosedTrade);

  const earlyExits = closedTrades.filter((t) => t.psychology?.exit_timing === 'early');

  if (earlyExits.length < 3) return null;

  const withPlannedRr = earlyExits.filter((t) => t.planned_rr !== null && t.planned_rr !== undefined);

  if (withPlannedRr.length < 3) {
    const actualRr = average(earlyExits.map((t) => Number(t.r_multiple ?? 0)));

    return {
      action: { label: 'Review early exits' },
      id: 'early-exit-cost',
      metrics: [
        { label: 'Early exits', tone: 'warning', value: String(earlyExits.length) },
        { label: 'Avg R captured', tone: 'neutral', value: `${formatR(actualRr)}R` }
      ],
      reason: `You exited ${earlyExits.length} trades early this period. Letting winners run is one of the highest-leverage improvements a trader can make.`,
      severity: 'warning',
      sourceTradeIds: earlyExits.map((t) => t.id),
      title: 'Letting winners run pays'
    };
  }

  const actualRr = average(withPlannedRr.map((t) => Number(t.r_multiple ?? 0)));
  const plannedRr = average(withPlannedRr.map((t) => Number(t.planned_rr)));
  const missedR = plannedRr - actualRr;

  if (missedR <= 0) return null;

  return {
    action: { label: 'Review early exits' },
    id: 'early-exit-cost',
    metrics: [
      { label: 'Early exits', tone: 'warning', value: String(earlyExits.length) },
      { label: 'Avg R left behind', tone: 'neutral', value: `${formatR(missedR)}R` }
    ],
    reason: `You exited ${earlyExits.length} trades early this period. On average, you captured ${formatR(actualRr)}R of a planned ${formatR(plannedRr)}R. That's ${formatR(missedR)}R per trade left on the table.`,
    severity: 'warning',
    sourceTradeIds: earlyExits.map((t) => t.id),
    title: 'Letting winners run pays'
  };
}

export function buildSessionSpecializationInsight(trades: TradeSummary[]): Insight | null {
  const closedTrades = trades.filter(isClosedTrade);

  if (closedTrades.length === 0) return null;

  const baselineWinRate = closedTrades.filter((t) => t.net_pnl > 0).length / closedTrades.length;
  const sessionGroups = new Map<string, ClosedTrade[]>();

  for (const trade of closedTrades) {
    const session = trade.psychology?.session;
    if (!session) continue;
    const existing = sessionGroups.get(session) ?? [];
    sessionGroups.set(session, [...existing, trade]);
  }

  for (const [session, sessionTrades] of sessionGroups.entries()) {
    if (sessionTrades.length < 5) continue;
    const sessionWinRate = sessionTrades.filter((t) => t.net_pnl > 0).length / sessionTrades.length;
    if (sessionWinRate - baselineWinRate < 0.15) continue;

    const label = formatSession(session);

    return {
      action: { label: `Review ${label} trades` },
      id: `session-specialization-${session}`,
      metrics: [
        { label: `${label} win rate`, tone: 'positive', value: formatPercent(sessionWinRate) },
        { label: 'Overall win rate', tone: 'neutral', value: formatPercent(baselineWinRate) }
      ],
      reason: `Your ${label} session winrate is ${formatPercent(sessionWinRate)} across ${sessionTrades.length} trades vs ${formatPercent(baselineWinRate)} overall. This might be your best-fit session — study what makes it work.`,
      severity: 'positive',
      sourceTradeIds: sessionTrades.map((t) => t.id),
      title: `${label} is your edge`
    };
  }

  return null;
}

export function buildStopLossDisciplineInsight(trades: TradeSummary[]): Insight | null {
  const closedTrades = trades.filter(isClosedTrade);

  const movedSL = closedTrades.filter((t) => t.psychology?.moved_stop_loss === true);
  const heldSL = closedTrades.filter((t) => t.psychology?.moved_stop_loss === false);

  if (movedSL.length < 5 || heldSL.length < 5) return null;

  const movedWinRate = movedSL.filter((t) => t.net_pnl > 0).length / movedSL.length;
  const heldWinRate = heldSL.filter((t) => t.net_pnl > 0).length / heldSL.length;

  if (heldWinRate - movedWinRate < 0.05) return null;

  return {
    action: { label: 'Review moved-SL trades' },
    id: 'stop-loss-discipline',
    metrics: [
      { label: 'Moved SL win rate', tone: 'warning', value: formatPercent(movedWinRate) },
      { label: 'Held SL win rate', tone: 'positive', value: formatPercent(heldWinRate) }
    ],
    reason: `When you moved your stop loss, ${formatPercent(movedWinRate)} were winners vs ${formatPercent(heldWinRate)} when you held firm. The original stop was the better decision.`,
    severity: 'warning',
    sourceTradeIds: movedSL.map((t) => t.id),
    title: 'Your first stop was the right stop'
  };
}

export function buildConvictionInsight(trades: TradeSummary[]): Insight | null {
  const closedTrades = trades.filter(isClosedTrade);

  const highConviction = closedTrades.filter((t) => {
    const c = t.psychology?.conviction_level;
    return c !== null && c !== undefined && c >= 8;
  });
  const lowConviction = closedTrades.filter((t) => {
    const c = t.psychology?.conviction_level;
    return c !== null && c !== undefined && c <= 3;
  });

  if (highConviction.length < 5) return null;

  const highRr = average(highConviction.map((t) => Number(t.r_multiple ?? 0)));
  const lowRr = lowConviction.length > 0 ? average(lowConviction.map((t) => Number(t.r_multiple ?? 0))) : 0;

  if (highRr - lowRr < 0.5) return null;

  return {
    action: { label: 'Review high conviction trades' },
    id: 'conviction-calibration',
    metrics: [
      { label: 'High conviction avg', tone: 'positive', value: `${formatR(highRr)}R` },
      { label: 'Low conviction avg', tone: 'neutral', value: `${formatR(lowRr)}R` }
    ],
    reason: `High conviction trades (8-10) average ${formatR(highRr)}R vs ${formatR(lowRr)}R for low conviction (1-3). When you believe in a setup, the data backs you up.`,
    severity: 'positive',
    sourceTradeIds: highConviction.map((t) => t.id),
    title: 'Your gut is calibrated'
  };
}

export function buildMarketConditionMismatchInsight(trades: TradeSummary[]): Insight | null {
  const closedTrades = trades.filter(isClosedTrade);

  const strategyConditionGroups = new Map<string, Map<string, ClosedTrade[]>>();

  for (const trade of closedTrades) {
    if (!trade.strategy_id || !trade.strategy) continue;
    const condition = trade.psychology?.market_condition;
    if (!condition) continue;

    if (!strategyConditionGroups.has(trade.strategy_id)) {
      strategyConditionGroups.set(trade.strategy_id, new Map());
    }

    const conditionMap = strategyConditionGroups.get(trade.strategy_id)!;
    const existing = conditionMap.get(condition) ?? [];
    conditionMap.set(condition, [...existing, trade]);
  }

  for (const [, conditionMap] of strategyConditionGroups.entries()) {
    const conditionStats = Array.from(conditionMap.entries())
      .filter(([, groupTrades]) => groupTrades.length >= 3)
      .map(([condition, groupTrades]) => ({
        condition,
        trades: groupTrades,
        winRate: groupTrades.filter((t) => t.net_pnl > 0).length / groupTrades.length
      }));

    if (conditionStats.length < 2) continue;

    const best = conditionStats.sort((a, b) => b.winRate - a.winRate)[0];
    const worst = conditionStats[conditionStats.length - 1];

    if (best.winRate <= 0.55 || worst.winRate >= 0.4) continue;

    const strategyName = best.trades[0].strategy!.name;
    const goodCondition = formatCondition(best.condition);
    const badCondition = formatCondition(worst.condition);

    return {
      action: { label: 'Review condition mismatch' },
      id: `market-condition-mismatch-${best.trades[0].strategy_id}`,
      metrics: [
        { label: `${goodCondition} win rate`, tone: 'positive', value: formatPercent(best.winRate) },
        { label: `${badCondition} win rate`, tone: 'warning', value: formatPercent(worst.winRate) }
      ],
      reason: `${strategyName} works well in ${goodCondition} (${formatPercent(best.winRate)} win rate) but struggles in ${badCondition} (${formatPercent(worst.winRate)}). Consider sitting out ${strategyName} when conditions don't match.`,
      severity: 'warning',
      sourceTradeIds: [...best.trades, ...worst.trades].map((t) => t.id),
      title: `${strategyName} needs the right conditions`
    };
  }

  return null;
}

export function buildBestProcessInsight(trades: TradeSummary[]): Insight | null {
  const scores = calculateExecutionScores(trades);

  if (scores.length < 5) return null;

  const topScore = scores[0].score;
  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
  const top5 = scores.slice(0, 5);

  return {
    action: { label: 'Review best process' },
    id: 'best-process',
    metrics: [
      { label: 'Top execution score', tone: 'positive', value: `${topScore}/100` },
      { label: 'Avg execution score', tone: 'neutral', value: `${avgScore}/100` }
    ],
    reason: 'These trades scored highest on execution — plan adherence, timing, discipline — regardless of P&L outcome. This is what good process looks like. Study it.',
    severity: 'positive',
    sourceTradeIds: top5.map((s) => s.tradeId),
    title: 'Your best-executed trades'
  };
}
