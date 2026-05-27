import type { TradeSummary } from './service';
import {
  buildBestProcessInsight,
  buildConvictionInsight,
  buildEarlyExitInsight,
  buildEnergyCorrelationInsight,
  buildMarketConditionMismatchInsight,
  buildRevengeTradeInsight,
  buildSessionSpecializationInsight,
  buildSetupQualityInsight,
  buildStopLossDisciplineInsight
} from './backtesting/mentor-insights';

export type InsightSeverity = 'positive' | 'warning' | 'neutral';

export type InsightMetric = {
  label: string;
  tone: InsightSeverity;
  value: string;
};

export type InsightAction = {
  label: string;
};

export type Insight = {
  action: InsightAction;
  id: string;
  metrics: [InsightMetric, InsightMetric];
  reason: string;
  severity: InsightSeverity;
  sourceTradeIds: string[];
  title: string;
};

type ClosedTrade = TradeSummary & {
  net_pnl: number;
};

type TagPerformance = {
  count: number;
  netPnl: number;
  sourceTradeIds: string[];
  tagName: string;
  tagType: string;
};

export function generateInsightCoach(trades: TradeSummary[]): Insight {
  const closedTrades = trades.filter(isClosedTrade);

  if (trades.length === 0) {
    return {
      action: { label: 'Log the first trade' },
      id: 'empty-journal',
      metrics: [
        { label: 'Trades logged', tone: 'neutral', value: '0' },
        { label: 'Closed trades', tone: 'neutral', value: '0' }
      ],
      reason: 'The coach needs a few completed trades before it can separate signal from noise.',
      severity: 'neutral',
      sourceTradeIds: [],
      title: 'Build your first review sample'
    };
  }

  if (closedTrades.length === 0) {
    return {
      action: { label: 'Review open trades' },
      id: 'open-only',
      metrics: [
        { label: 'Open trades', tone: 'neutral', value: String(trades.length) },
        { label: 'Closed trades', tone: 'neutral', value: '0' }
      ],
      reason: 'Open trades show activity, but performance insight needs completed outcomes.',
      severity: 'neutral',
      sourceTradeIds: trades.map((trade) => trade.id),
      title: 'Close the feedback loop'
    };
  }

  return (
    buildLargeLossInsight(closedTrades) ??
    buildMissingSetupInsight(trades) ??
    buildRevengeTradeInsight(trades) ??
    buildSetupQualityInsight(trades) ??
    buildEnergyCorrelationInsight(trades) ??
    buildStopLossDisciplineInsight(trades) ??
    buildEarlyExitInsight(trades) ??
    buildWorstTagInsight(closedTrades) ??
    buildSessionSpecializationInsight(trades) ??
    buildMarketConditionMismatchInsight(trades) ??
    buildConvictionInsight(trades) ??
    buildPositiveExpectancyInsight(closedTrades) ??
    buildBestTagInsight(closedTrades) ??
    buildConcentrationInsight(closedTrades) ??
    buildBestProcessInsight(trades) ??
    buildBaselineInsight(closedTrades)
  );
}

function buildLargeLossInsight(closedTrades: ClosedTrade[]): Insight | null {
  const losingTrades = closedTrades.filter((trade) => trade.net_pnl < 0);

  if (losingTrades.length < 3) {
    return null;
  }

  const averageLoss = average(losingTrades.map((trade) => Math.abs(trade.net_pnl)));
  const largestLoss = losingTrades.reduce((worst, trade) =>
    Math.abs(trade.net_pnl) > Math.abs(worst.net_pnl) ? trade : worst
  );
  const largestLossAmount = Math.abs(largestLoss.net_pnl);

  if (largestLossAmount < averageLoss * 2) {
    return null;
  }

  return {
    action: { label: 'Review related trade' },
    id: 'large-loss',
    metrics: [
      { label: 'Largest loss', tone: 'warning', value: formatCurrency(-largestLossAmount) },
      { label: 'Average loss', tone: 'neutral', value: formatCurrency(-averageLoss) }
    ],
    reason: 'One loss is meaningfully larger than your normal losing trade. Review whether it came from size, stop discipline, or exit timing.',
    severity: 'warning',
    sourceTradeIds: [largestLoss.id],
    title: 'Study the loss that broke rhythm'
  };
}

function buildMissingSetupInsight(trades: TradeSummary[]): Insight | null {
  const missingContextTrades = trades.filter(
    (trade) => !trade.tags.some((tag) => tag.type === 'setup' || tag.type === 'strategy')
  );
  const missingRatio = missingContextTrades.length / trades.length;

  if (trades.length < 3 || missingRatio < 0.4) {
    return null;
  }

  return {
    action: { label: 'Review untagged trades' },
    id: 'missing-setup-context',
    metrics: [
      { label: 'Missing context', tone: 'warning', value: formatPercent(missingRatio) },
      { label: 'Trades affected', tone: 'neutral', value: String(missingContextTrades.length) }
    ],
    reason: 'Setup and strategy tags are the shortest path from logging trades to finding repeatable behavior.',
    severity: 'warning',
    sourceTradeIds: missingContextTrades.map((trade) => trade.id),
    title: 'Add context before adding complexity'
  };
}

function buildWorstTagInsight(closedTrades: ClosedTrade[]): Insight | null {
  const worstTag = getTagPerformance(closedTrades)
    .filter((tag) => tag.count >= 2 && tag.netPnl < 0)
    .sort((left, right) => left.netPnl - right.netPnl)[0];

  if (!worstTag) {
    return null;
  }

  return {
    action: { label: 'Review related trades' },
    id: `weak-tag-${worstTag.tagType}-${worstTag.tagName.toLowerCase()}`,
    metrics: [
      { label: 'Net P&L', tone: 'warning', value: formatCurrency(worstTag.netPnl) },
      { label: 'Trades', tone: 'neutral', value: String(worstTag.count) }
    ],
    reason: `Trades tagged ${worstTag.tagName} are dragging performance. Look for the common entry, sizing, or exit pattern.`,
    severity: 'warning',
    sourceTradeIds: worstTag.sourceTradeIds,
    title: `${titleCase(worstTag.tagName)} needs a rule`
  };
}

function buildPositiveExpectancyInsight(closedTrades: ClosedTrade[]): Insight | null {
  if (closedTrades.length < 5) {
    return null;
  }

  const expectancy = average(closedTrades.map((trade) => trade.net_pnl));
  const winRate = closedTrades.filter((trade) => trade.net_pnl > 0).length / closedTrades.length;

  if (expectancy <= 0) {
    return null;
  }

  return {
    action: { label: 'Review winners' },
    id: 'positive-expectancy',
    metrics: [
      { label: 'Expectancy', tone: 'positive', value: formatCurrency(expectancy) },
      { label: 'Win rate', tone: 'neutral', value: formatPercent(winRate) }
    ],
    reason: 'Your average closed trade is positive. The focus now is consistency: protect the behaviors behind that edge.',
    severity: 'positive',
    sourceTradeIds: closedTrades.filter((trade) => trade.net_pnl > 0).map((trade) => trade.id),
    title: 'You have a working edge to protect'
  };
}

function buildBestTagInsight(closedTrades: ClosedTrade[]): Insight | null {
  const bestTag = getTagPerformance(closedTrades)
    .filter((tag) => tag.count >= 2 && tag.netPnl > 0)
    .sort((left, right) => right.netPnl - left.netPnl)[0];

  if (!bestTag) {
    return null;
  }

  return {
    action: { label: 'Review related trades' },
    id: `strong-tag-${bestTag.tagType}-${bestTag.tagName.toLowerCase()}`,
    metrics: [
      { label: 'Net P&L', tone: 'positive', value: formatCurrency(bestTag.netPnl) },
      { label: 'Trades', tone: 'neutral', value: String(bestTag.count) }
    ],
    reason: `Trades tagged ${bestTag.tagName} are working. Capture the rule that makes this setup repeatable.`,
    severity: 'positive',
    sourceTradeIds: bestTag.sourceTradeIds,
    title: `Protect ${titleCase(bestTag.tagName)}`
  };
}

function buildConcentrationInsight(closedTrades: ClosedTrade[]): Insight | null {
  if (closedTrades.length < 4) {
    return null;
  }

  const countsBySymbol = new Map<string, { count: number; sourceTradeIds: string[] }>();

  for (const trade of closedTrades) {
    const symbol = trade.asset?.symbol ?? 'Unknown';
    const current = countsBySymbol.get(symbol) ?? { count: 0, sourceTradeIds: [] };
    countsBySymbol.set(symbol, {
      count: current.count + 1,
      sourceTradeIds: [...current.sourceTradeIds, trade.id]
    });
  }

  const topSymbol = Array.from(countsBySymbol.entries()).sort(
    (left, right) => right[1].count - left[1].count
  )[0];

  if (!topSymbol) {
    return null;
  }

  const [symbol, data] = topSymbol;
  const concentration = data.count / closedTrades.length;

  if (concentration < 0.5) {
    return null;
  }

  return {
    action: { label: 'Review symbol cluster' },
    id: `symbol-concentration-${symbol.toLowerCase()}`,
    metrics: [
      { label: 'Symbol share', tone: 'neutral', value: formatPercent(concentration) },
      { label: 'Trades', tone: 'neutral', value: String(data.count) }
    ],
    reason: `${symbol} is taking up most of the sample. Check whether this is genuine specialization or accidental concentration.`,
    severity: 'neutral',
    sourceTradeIds: data.sourceTradeIds,
    title: `Know why ${symbol} dominates`
  };
}

function buildBaselineInsight(closedTrades: ClosedTrade[]): Insight {
  const expectancy = average(closedTrades.map((trade) => trade.net_pnl));
  const winRate = closedTrades.filter((trade) => trade.net_pnl > 0).length / closedTrades.length;

  return {
    action: { label: 'Review closed trades' },
    id: 'baseline-review',
    metrics: [
      { label: 'Expectancy', tone: expectancy >= 0 ? 'positive' : 'warning', value: formatCurrency(expectancy) },
      { label: 'Win rate', tone: 'neutral', value: formatPercent(winRate) }
    ],
    reason: 'The sample is forming. Keep tagging setups and emotions so Polaris can find stronger behavior patterns.',
    severity: expectancy >= 0 ? 'positive' : 'neutral',
    sourceTradeIds: closedTrades.map((trade) => trade.id),
    title: 'Keep the review sample clean'
  };
}

function getTagPerformance(closedTrades: ClosedTrade[]): TagPerformance[] {
  const performanceByTag = new Map<string, TagPerformance>();

  for (const trade of closedTrades) {
    for (const tag of trade.tags) {
      const key = `${tag.type}:${tag.name.toLowerCase()}`;
      const current = performanceByTag.get(key) ?? {
        count: 0,
        netPnl: 0,
        sourceTradeIds: [],
        tagName: tag.name,
        tagType: tag.type
      };

      performanceByTag.set(key, {
        ...current,
        count: current.count + 1,
        netPnl: current.netPnl + trade.net_pnl,
        sourceTradeIds: [...current.sourceTradeIds, trade.id]
      });
    }
  }

  return Array.from(performanceByTag.values());
}

export function generateAllInsights(trades: TradeSummary[]): Insight[] {
  const closedTrades = trades.filter(isClosedTrade);

  if (closedTrades.length === 0) return [];

  const candidates = [
    buildLargeLossInsight(closedTrades),
    buildMissingSetupInsight(trades),
    buildRevengeTradeInsight(trades),
    buildSetupQualityInsight(trades),
    buildEnergyCorrelationInsight(trades),
    buildStopLossDisciplineInsight(trades),
    buildEarlyExitInsight(trades),
    buildWorstTagInsight(closedTrades),
    buildSessionSpecializationInsight(trades),
    buildMarketConditionMismatchInsight(trades),
    buildConvictionInsight(trades),
    buildPositiveExpectancyInsight(closedTrades),
    buildBestTagInsight(closedTrades),
    buildConcentrationInsight(closedTrades),
    buildBestProcessInsight(trades),
    buildBaselineInsight(closedTrades)
  ];

  return candidates.filter((insight): insight is Insight => insight !== null);
}

function isClosedTrade(trade: TradeSummary): trade is ClosedTrade {
  return trade.status === 'closed' && trade.net_pnl !== null;
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency'
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
    style: 'percent'
  }).format(value);
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
