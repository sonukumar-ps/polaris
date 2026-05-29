import { supabase } from '@/lib/supabase';
import { listAccounts, listStrategies, createManualTrade } from '../service';
import { upsertChecklist, getChecklistForPairDate } from './checklist';
import { markOrderTriggered, markOrderExpired } from '../orders/order';
import type { StrategyChecklistInput } from './checklist.types';
import type { CreateManualTradeInput } from '../service';

const PAIR_POOL = [
  'GBPUSD', 'EURUSD', 'GBPJPY', 'USDJPY', 'AUDUSD',
  'NZDUSD', 'EURGBP', 'USDCAD', 'AUDJPY', 'EURJPY'
];

/**
 * Seeds 14 days of checklists with realistic patterns to populate
 * the analytics dashboard. Includes:
 *  - Variable pair coverage per day (3-8 pairs)
 *  - 1-2 qualified setups per day with trades linked
 *  - Mix of triggered/expired orders
 *  - Some days completely skipped (consistency dip)
 *  - Outcomes: wins, losses, untriggered fills
 */
export async function seedAnalyticsDemoData(): Promise<{
  checklistsCreated: number;
  daysSeeded: number;
  ordersExpired: number;
  ordersTriggered: number;
  tradesCreated: number;
}> {
  const [accounts, strategies] = await Promise.all([listAccounts(), listStrategies()]);

  if (accounts.length === 0 || strategies.length === 0) {
    throw new Error('Create at least one account and one strategy first.');
  }

  const accountId = accounts[0].id;
  const strategyId = strategies[0].id;

  const today = new Date();
  // Skip days: pretend we missed 3 days (consistency dip)
  const skipDays = new Set([3, 7, 11]); // 3, 7, 11 days ago skipped

  let checklistsCreated = 0;
  let daysSeeded = 0;
  let tradesCreated = 0;
  let ordersTriggered = 0;
  let ordersExpired = 0;

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    if (skipDays.has(daysAgo)) continue;

    const date = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().slice(0, 10);

    // Vary number of pairs checked each day (3-8)
    const pairsToday = 3 + (daysAgo % 6);
    const pairsShuffled = [...PAIR_POOL].sort(() => Math.random() - 0.5).slice(0, pairsToday);

    // Number of qualified setups today (varies)
    const qualifiedTargetCount = daysAgo % 3 === 0 ? 2 : daysAgo % 3 === 1 ? 1 : 0;
    let qualifiedCreated = 0;

    for (let i = 0; i < pairsShuffled.length; i++) {
      const symbol = pairsShuffled[i];
      const shouldBeQualified = qualifiedCreated < qualifiedTargetCount;

      const checklistInput = buildChecklistVariant(
        symbol,
        dateStr,
        strategyId,
        shouldBeQualified,
        i
      );

      try {
        const checklist = await upsertChecklist(checklistInput);
        checklistsCreated++;

        // Link a trade for qualified setups with decision=trade
        if (shouldBeQualified && checklistInput.decision === 'trade' && daysAgo >= 1) {
          qualifiedCreated++;

          const tradeOutcome = (daysAgo + i) % 5; // 5 outcomes cycle

          const tradeResult = await createTradeFromChecklist(
            accountId,
            strategyId,
            symbol,
            checklist.id,
            date,
            tradeOutcome
          );

          if (tradeResult) {
            tradesCreated++;

            // Link checklist to trade
            await supabase
              .from('strategy_checklists')
              .update({ trade_id: tradeResult.tradeId })
              .eq('id', checklist.id);

            if (tradeResult.triggered) {
              try {
                await markOrderTriggered(tradeResult.tradeId);
                ordersTriggered++;
              } catch {
                // silent
              }
            } else if (tradeResult.expired) {
              try {
                await markOrderExpired(tradeResult.tradeId);
                ordersExpired++;
              } catch {
                // silent
              }
            }
          }
        }
      } catch {
        // silent — skip conflicts
      }
    }

    daysSeeded++;
  }

  return {
    checklistsCreated,
    daysSeeded,
    ordersExpired,
    ordersTriggered,
    tradesCreated
  };
}

function buildChecklistVariant(
  symbol: string,
  date: string,
  strategyId: string,
  qualified: boolean,
  variantIdx: number
): StrategyChecklistInput {
  if (qualified) {
    // Fully qualified — all 4 critical pass + decision=trade
    return {
      checklistDate: date,
      decelerationEvidence: 'small_candles',
      decelerationPass: true,
      decision: 'trade',
      decisionReason: 'All critical columns pass, clean setup',
      direction: variantIdx % 2 === 0 ? 'long' : 'short',
      ema50PositionPass: true,
      emaZoneVisitedPass: true,
      emotionalRating: 5,
      marketConditionPass: true,
      marketPhase: 'pullback',
      marketPhasePass: true,
      newsCheckClear: true,
      rrOnTrade: 2.0,
      rrToLastSwing: 1.5,
      rrToNextSr: 2.2,
      srReactionPass: true,
      srTouchCount: 4,
      srTypes: ['horizontal'],
      strategyId,
      strategyType: 'trend',
      symbol,
      totalSrTouches: 6
    };
  }

  // Various failure modes — distribute across critical columns
  const failureMode = variantIdx % 5;
  const base: StrategyChecklistInput = {
    checklistDate: date,
    direction: variantIdx % 2 === 0 ? 'long' : 'short',
    strategyId,
    strategyType: 'trend',
    symbol
  };

  switch (failureMode) {
    case 0: // Market condition fails
      return {
        ...base,
        decision: 'skip',
        decisionReason: 'No clear oscillation, ranging market',
        marketConditionPass: false,
        marketPhasePass: null,
        srReactionPass: null,
        decelerationPass: null
      };
    case 1: // Market phase fails
      return {
        ...base,
        decision: 'skip',
        decisionReason: 'Not in pullback — impulse phase',
        marketConditionPass: true,
        marketPhase: 'impulse',
        marketPhasePass: false,
        srReactionPass: null,
        decelerationPass: null
      };
    case 2: // S/R reaction fails
      return {
        ...base,
        decision: 'skip',
        decisionReason: 'Only 1 prior touch at this S/R',
        marketConditionPass: true,
        marketPhase: 'pullback',
        marketPhasePass: true,
        srReactionPass: false,
        srTouchCount: 1,
        decelerationPass: null
      };
    case 3: // Deceleration fails
      return {
        ...base,
        decision: 'watch',
        decisionReason: 'Still large momentum candles, waiting for deceleration',
        marketConditionPass: true,
        marketPhase: 'pullback',
        marketPhasePass: true,
        srReactionPass: true,
        srTouchCount: 3,
        decelerationPass: false
      };
    default: // All pass but decision=watch or skip for other reasons
      return {
        ...base,
        decision: 'watch',
        decisionReason: 'R:R too marginal, news risk today',
        marketConditionPass: true,
        marketPhase: 'pullback',
        marketPhasePass: true,
        srReactionPass: true,
        srTouchCount: 3,
        decelerationEvidence: 'inside_bar',
        decelerationPass: true,
        newsCheckClear: false
      };
  }
}

async function createTradeFromChecklist(
  accountId: string,
  strategyId: string,
  symbol: string,
  checklistId: string,
  date: Date,
  outcomeCycle: number
): Promise<{ expired: boolean; tradeId: string; triggered: boolean } | null> {
  const openedAt = new Date(date.getTime() + 8 * 60 * 60 * 1000); // 8am UTC
  const closedAt = new Date(date.getTime() + 18 * 60 * 60 * 1000); // 6pm UTC
  const dummyPrice = getDummyPriceForSymbol(symbol);

  // outcomeCycle:
  //  0 = winner triggered
  //  1 = loser triggered
  //  2 = order expired (didn't trigger)
  //  3 = small winner triggered
  //  4 = breakeven triggered
  const isLong = outcomeCycle % 2 === 0;
  const direction = isLong ? 'long' : 'short';
  const slDist = dummyPrice * 0.003;
  const tpDist = dummyPrice * 0.006;

  let exitPrice: number | null = null;
  let expired = false;
  let triggered = true;

  switch (outcomeCycle) {
    case 0:
      exitPrice = isLong ? dummyPrice + tpDist : dummyPrice - tpDist;
      break;
    case 1:
      exitPrice = isLong ? dummyPrice - slDist : dummyPrice + slDist;
      break;
    case 2:
      // Order expired — no fill, no exit
      expired = true;
      triggered = false;
      break;
    case 3:
      exitPrice = isLong ? dummyPrice + tpDist * 0.5 : dummyPrice - tpDist * 0.5;
      break;
    case 4:
      exitPrice = dummyPrice;  // breakeven
      break;
  }

  const input: CreateManualTradeInput = {
    accountId,
    checklistId,
    closedAt: triggered ? closedAt.toISOString() : null,
    direction,
    entryOrderType: isLong ? 'pending_buy_stop' : 'pending_sell_stop',
    entryPrice: dummyPrice,
    exitPrice,
    fees: 2.5,
    intendedEntryPrice: dummyPrice,
    notes: `Seeded from checklist on ${date.toISOString().slice(0, 10)}`,
    openedAt: openedAt.toISOString(),
    orderExpiryAt: new Date(openedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    orderPlacedAt: openedAt.toISOString(),
    plannedRr: 2.0,
    quantity: 10000,
    stopLossPrice: isLong ? dummyPrice - slDist : dummyPrice + slDist,
    strategyId,
    symbol,
    takeProfitPrice: isLong ? dummyPrice + tpDist : dummyPrice - tpDist
  };

  try {
    const saved = await createManualTrade(input);
    return { expired, tradeId: saved.id, triggered };
  } catch {
    return null;
  }
}

function getDummyPriceForSymbol(symbol: string): number {
  const prices: Record<string, number> = {
    AUDJPY: 92.50,
    AUDUSD: 0.665,
    EURGBP: 0.857,
    EURJPY: 164.0,
    EURUSD: 1.09,
    GBPJPY: 191.5,
    GBPUSD: 1.275,
    NZDUSD: 0.6,
    USDCAD: 1.365,
    USDJPY: 157.0
  };
  return prices[symbol] ?? 1.0;
}

export { getChecklistForPairDate };
