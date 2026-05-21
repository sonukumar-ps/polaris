import type { TradeRow, TradeSummary } from './service';

export type DashboardMetrics = {
  averageLoss: number;
  averageWin: number;
  profitFactor: number | null;
  realizedPnl: number;
  tradeCount: number;
  winRate: number;
};

export type EquityCurvePoint = {
  date: string;
  equity: number;
  tradeId: string;
};

export type StrategyPerformance = {
  averagePnl: number;
  grossLoss: number;
  grossProfit: number;
  lossCount: number;
  name: string;
  netPnl: number;
  profitFactor: number | null;
  strategyId: string | null;
  tradeCount: number;
  winCount: number;
  winRate: number;
};

export function calculateDashboardMetrics(trades: TradeRow[]): DashboardMetrics {
  const closedTrades = trades.filter((trade) => trade.status === 'closed' && trade.net_pnl !== null);
  const winningTrades = closedTrades.filter((trade) => Number(trade.net_pnl) > 0);
  const losingTrades = closedTrades.filter((trade) => Number(trade.net_pnl) < 0);
  const realizedPnl = closedTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0);
  const grossProfit = winningTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0);
  const grossLoss = Math.abs(losingTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0));
  const averageWin =
    winningTrades.length > 0
      ? winningTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0) / winningTrades.length
      : 0;
  const averageLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0) / losingTrades.length
      : 0;

  return {
    averageLoss,
    averageWin,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
    realizedPnl,
    tradeCount: trades.length,
    winRate: closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0
  };
}

export function buildEquityCurve(trades: TradeRow[]): EquityCurvePoint[] {
  const closedTrades = trades
    .filter((trade) => trade.status === 'closed' && trade.closed_at && trade.net_pnl !== null)
    .sort(
      (left, right) =>
        new Date(left.closed_at ?? left.opened_at).getTime() -
        new Date(right.closed_at ?? right.opened_at).getTime()
    );

  let runningEquity = 0;

  return closedTrades.map((trade) => {
    runningEquity += Number(trade.net_pnl);

    return {
      date: trade.closed_at ?? trade.opened_at,
      equity: runningEquity,
      tradeId: trade.id
    };
  });
}

export function calculateStrategyPerformance(trades: TradeSummary[]): StrategyPerformance[] {
  const closedTrades = trades.filter((trade) => trade.status === 'closed' && trade.net_pnl !== null);
  const strategyGroups = new Map<string, TradeSummary[]>();

  for (const trade of closedTrades) {
    const strategyId = trade.strategy_id ?? 'unassigned';
    const existingTrades = strategyGroups.get(strategyId) ?? [];
    strategyGroups.set(strategyId, [...existingTrades, trade]);
  }

  return Array.from(strategyGroups.entries())
    .map(([strategyId, strategyTrades]) => {
      const winningTrades = strategyTrades.filter((trade) => Number(trade.net_pnl) > 0);
      const losingTrades = strategyTrades.filter((trade) => Number(trade.net_pnl) < 0);
      const grossProfit = winningTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0);
      const grossLoss = Math.abs(losingTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0));
      const netPnl = strategyTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0);
      const firstTrade = strategyTrades[0];

      return {
        averagePnl: netPnl / strategyTrades.length,
        grossLoss,
        grossProfit,
        lossCount: losingTrades.length,
        name: firstTrade.strategy?.name ?? 'No strategy',
        netPnl,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
        strategyId: strategyId === 'unassigned' ? null : strategyId,
        tradeCount: strategyTrades.length,
        winCount: winningTrades.length,
        winRate: strategyTrades.length > 0 ? winningTrades.length / strategyTrades.length : 0
      };
    })
    .sort((left, right) => {
      if (right.netPnl !== left.netPnl) {
        return right.netPnl - left.netPnl;
      }

      return right.tradeCount - left.tradeCount;
    });
}
