import { createManualTrade, listAccounts, listStrategies } from './service';
import { markBulletproof } from './orders/order';
import type { CreateManualTradeInput } from './service';

type OpenSeedTrade = Omit<CreateManualTradeInput, 'accountId' | 'strategyId'>;

/**
 * Seeds 6 OPEN trades with deliberate currency overlap so the exposure
 * dashboard demonstrates both safe patterns and warning patterns.
 *
 * Currency exposure layout (after seeding):
 *  - GBP: long 3x (GBPUSD long, GBPJPY long, EURGBP short) → HIGH WARNING
 *  - USD: short 2x (GBPUSD long, EURUSD long) → MEDIUM WARNING
 *  - JPY: short 1x (GBPJPY long) → no warning
 *  - EUR: 1 long (EURUSD long) + 1 short (EURGBP short) → balanced
 *  - AUD: long 1x (AUDUSD long) → no warning
 *  - NZD: short 1x (NZDUSD short) → no warning
 *
 * One trade is marked bulletproof to show how that affects warnings.
 */
export async function seedOpenTrades(): Promise<number> {
  const [accounts, strategies] = await Promise.all([listAccounts(), listStrategies()]);

  if (accounts.length === 0) {
    throw new Error('Create at least one trading account before seeding.');
  }

  if (strategies.length === 0) {
    throw new Error('Create at least one strategy before seeding.');
  }

  const accountId = accounts[0].id;
  const strategyId = strategies[0].id;

  // Use yesterday's date so they show up as recent
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const trades: OpenSeedTrade[] = [
    {
      direction: 'long',
      entryPrice: 1.2750,
      notes: 'Long GBPUSD — clean trend setup at 50 EMA pullback',
      openedAt: yesterday,
      quantity: 10000,
      stopLossPrice: 1.2720,
      symbol: 'GBPUSD',
      takeProfitPrice: 1.2820
    },
    {
      direction: 'long',
      entryPrice: 191.50,
      notes: 'Long GBPJPY — momentum continuation',
      openedAt: yesterday,
      quantity: 5000,
      stopLossPrice: 190.80,
      symbol: 'GBPJPY',
      takeProfitPrice: 193.00
    },
    {
      direction: 'short',
      entryPrice: 0.8580,
      notes: 'Short EURGBP — GBP strength play',
      openedAt: yesterday,
      quantity: 10000,
      stopLossPrice: 0.8610,
      symbol: 'EURGBP',
      takeProfitPrice: 0.8520
    },
    {
      direction: 'long',
      entryPrice: 1.0900,
      notes: 'Long EURUSD — at major weekly support',
      openedAt: yesterday,
      quantity: 10000,
      stopLossPrice: 1.0870,
      symbol: 'EURUSD',
      takeProfitPrice: 1.0970
    },
    {
      direction: 'long',
      entryPrice: 0.6650,
      notes: 'Long AUDUSD — bulletproof, already at +1R',
      openedAt: yesterday,
      quantity: 10000,
      stopLossPrice: 0.6650,
      symbol: 'AUDUSD',
      takeProfitPrice: 0.6720
    },
    {
      direction: 'short',
      entryPrice: 0.6020,
      notes: 'Short NZDUSD — reversal at resistance',
      openedAt: yesterday,
      quantity: 10000,
      stopLossPrice: 0.6050,
      symbol: 'NZDUSD',
      takeProfitPrice: 0.5950
    }
  ];

  let count = 0;
  let audusdTradeId: string | null = null;

  for (const trade of trades) {
    const saved = await createManualTrade({
      ...trade,
      accountId,
      strategyId
    });
    count++;

    if (trade.symbol === 'AUDUSD') {
      audusdTradeId = saved.id;
    }
  }

  // Mark AUDUSD as bulletproof to demonstrate the badge
  if (audusdTradeId) {
    try {
      await markBulletproof(audusdTradeId);
    } catch {
      // silent
    }
  }

  return count;
}
