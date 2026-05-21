import type { TradeRow } from './service';

export type DashboardMetrics = {
  averageLoss: number;
  averageWin: number;
  realizedPnl: number;
  tradeCount: number;
  winRate: number;
};

export type EquityCurvePoint = {
  date: string;
  equity: number;
  tradeId: string;
};

export function calculateDashboardMetrics(trades: TradeRow[]): DashboardMetrics {
  const closedTrades = trades.filter((trade) => trade.status === 'closed' && trade.net_pnl !== null);
  const winningTrades = closedTrades.filter((trade) => Number(trade.net_pnl) > 0);
  const losingTrades = closedTrades.filter((trade) => Number(trade.net_pnl) < 0);
  const realizedPnl = closedTrades.reduce((total, trade) => total + Number(trade.net_pnl), 0);
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
