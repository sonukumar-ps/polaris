import type { TradeDirection } from './service';

export type RealizedPnlInput = {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  fees?: number;
  quantity: number;
};

export type RealizedPnl = {
  grossPnl: number;
  netPnl: number;
};

export function calculateRealizedPnl(input: RealizedPnlInput): RealizedPnl {
  const directionMultiplier = input.direction === 'long' ? 1 : -1;
  const grossPnl =
    (input.exitPrice - input.entryPrice) * input.quantity * directionMultiplier;

  return {
    grossPnl,
    netPnl: grossPnl - (input.fees ?? 0)
  };
}
