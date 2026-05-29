import type { TradeSummary } from './service';

export type CurrencyExposure = {
  currency: string;
  longCount: number;
  netExposure: number;  // -1 (full short) to +1 (full long); 0 = balanced
  shortCount: number;
  totalTrades: number;
  trades: ExposureTradeRow[];
};

export type ExposureTradeRow = {
  direction: 'long' | 'short' | string;
  isBulletproof: boolean;
  // For each currency in the pair, is this trade long or short on it?
  role: 'base_long' | 'base_short' | 'quote_long' | 'quote_short';
  symbol: string;
  tradeId: string;
};

export type ExposureWarning = {
  currency: string;
  message: string;
  severity: 'high' | 'medium';
  tradeIds: string[];
};

/**
 * Splits a forex pair into base and quote currency.
 * "GBPUSD" → { base: "GBP", quote: "USD" }
 * Returns null for non-6-char symbols (e.g. stocks).
 */
function splitPair(symbol: string): { base: string; quote: string } | null {
  if (symbol.length !== 6) return null;
  return {
    base: symbol.slice(0, 3).toUpperCase(),
    quote: symbol.slice(3, 6).toUpperCase()
  };
}

/**
 * Calculates currency exposure across open trades.
 *
 * For each pair (e.g. long GBPUSD), the user has:
 *   - Long exposure to the base currency (GBP)
 *   - Short exposure to the quote currency (USD)
 *
 * Short trades flip this — long on quote, short on base.
 */
export function calculateCurrencyExposure(trades: TradeSummary[]): CurrencyExposure[] {
  const openTrades = trades.filter((t) => t.status === 'open');
  const exposureMap = new Map<string, CurrencyExposure>();

  function getOrCreate(currency: string): CurrencyExposure {
    const existing = exposureMap.get(currency);
    if (existing) return existing;
    const fresh: CurrencyExposure = {
      currency,
      longCount: 0,
      netExposure: 0,
      shortCount: 0,
      totalTrades: 0,
      trades: []
    };
    exposureMap.set(currency, fresh);
    return fresh;
  }

  for (const trade of openTrades) {
    const symbol = trade.asset?.symbol;
    if (!symbol) continue;
    const pair = splitPair(symbol);
    if (!pair) continue;

    const isLong = trade.direction === 'long';

    // Base currency exposure
    const baseExposure = getOrCreate(pair.base);
    const baseRole = isLong ? 'base_long' : 'base_short';
    if (isLong) baseExposure.longCount++;
    else baseExposure.shortCount++;
    baseExposure.totalTrades++;
    baseExposure.trades.push({
      direction: trade.direction,
      isBulletproof: trade.is_bulletproof === true,
      role: baseRole,
      symbol,
      tradeId: trade.id
    });

    // Quote currency exposure (inverted)
    const quoteExposure = getOrCreate(pair.quote);
    const quoteRole = isLong ? 'quote_short' : 'quote_long';
    if (isLong) quoteExposure.shortCount++;
    else quoteExposure.longCount++;
    quoteExposure.totalTrades++;
    quoteExposure.trades.push({
      direction: trade.direction,
      isBulletproof: trade.is_bulletproof === true,
      role: quoteRole,
      symbol,
      tradeId: trade.id
    });
  }

  // Calculate net exposure: (long - short) / total, range [-1, 1]
  for (const exposure of exposureMap.values()) {
    if (exposure.totalTrades === 0) {
      exposure.netExposure = 0;
    } else {
      exposure.netExposure = (exposure.longCount - exposure.shortCount) / exposure.totalTrades;
    }
  }

  // Sort by abs(netExposure) desc, then by totalTrades desc
  return Array.from(exposureMap.values()).sort((a, b) => {
    const aMag = Math.abs(a.netExposure) * a.totalTrades;
    const bMag = Math.abs(b.netExposure) * b.totalTrades;
    return bMag - aMag;
  });
}

/**
 * Generates warnings for doubled-up currency exposure.
 *
 * Jason's rule: avoid doubling up on the same currency unless one
 * trade is bulletproof.
 */
export function calculateExposureWarnings(exposures: CurrencyExposure[]): ExposureWarning[] {
  const warnings: ExposureWarning[] = [];

  for (const exposure of exposures) {
    // Doubled-up: same direction on the same currency in 2+ trades
    if (exposure.longCount >= 2) {
      const nonBulletproof = exposure.trades.filter(
        (t) => (t.role === 'base_long' || t.role === 'quote_long') && !t.isBulletproof
      );
      if (nonBulletproof.length >= 2) {
        warnings.push({
          currency: exposure.currency,
          message: `Long ${exposure.currency} in ${exposure.longCount} trades (${nonBulletproof.length} not bulletproof). Reduce size or mark bulletproof to manage risk.`,
          severity: exposure.longCount >= 3 ? 'high' : 'medium',
          tradeIds: nonBulletproof.map((t) => t.tradeId)
        });
      }
    }

    if (exposure.shortCount >= 2) {
      const nonBulletproof = exposure.trades.filter(
        (t) => (t.role === 'base_short' || t.role === 'quote_short') && !t.isBulletproof
      );
      if (nonBulletproof.length >= 2) {
        warnings.push({
          currency: exposure.currency,
          message: `Short ${exposure.currency} in ${exposure.shortCount} trades (${nonBulletproof.length} not bulletproof). Reduce size or mark bulletproof to manage risk.`,
          severity: exposure.shortCount >= 3 ? 'high' : 'medium',
          tradeIds: nonBulletproof.map((t) => t.tradeId)
        });
      }
    }
  }

  return warnings;
}
