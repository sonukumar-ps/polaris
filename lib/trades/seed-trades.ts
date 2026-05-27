import { createManualTrade, listAccounts, listStrategies } from './service';
import type { CreateManualTradeInput } from './service';
import type { TradePsychologyInput } from './backtesting/psychology.types';

type SeedTrade = Omit<CreateManualTradeInput, 'accountId' | 'strategyId'> & {
  psychology: TradePsychologyInput;
};

/**
 * Seeds 20 realistic closed trades with full psychology and execution data.
 * Designed to populate the Psychology and Best Process insight tabs.
 *
 * Requires: at least one account + one strategy to exist.
 */
export async function seedDemoTrades(): Promise<number> {
  const [accounts, strategies] = await Promise.all([listAccounts(), listStrategies()]);

  if (accounts.length === 0) {
    throw new Error('Create at least one trading account before seeding.');
  }

  if (strategies.length === 0) {
    throw new Error('Create at least one strategy before seeding.');
  }

  const accountId = accounts[0].id;
  const strategyId = strategies[0].id;

  const trades = buildDemoTrades();
  let count = 0;

  for (const trade of trades) {
    await createManualTrade({
      ...trade,
      accountId,
      strategyId
    });
    count++;
  }

  return count;
}

function buildDemoTrades(): SeedTrade[] {
  // 20 trades across 3 weeks, mix of winners/losers, varied psychology
  return [
    // ── Week 1: Strong start, disciplined ──

    // Trade 1: Clean winner, followed plan perfectly
    {
      closedAt: '2026-05-12T15:30:00.000Z',
      symbol: 'GBPUSD',
      direction: 'long',
      entryPrice: 1.265,
      exitPrice: 1.2715,
      fees: 2.5,
      notes: 'Textbook trend trade. Pullback into 20/50 EMA zone, doji at support.',
      openedAt: '2026-05-12T08:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.2615,
      takeProfitPrice: 1.2720,
      timeframe: 'H1',
      plannedRr: 1.9,
      psychology: {
        convictionLevel: 8,
        emotionalState: 'confident',
        energyLevel: 4,
        entryTiming: 'on_time',
        exitTiming: 'on_time',
        focusLevel: 5,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Patience at the EMA zone paid off. The entry signal was clear.',
        marketCondition: 'trending_up',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'london',
        setupQuality: 5
      }
    },
    // Trade 2: Another winner, slightly early entry
    {
      closedAt: '2026-05-12T19:00:00.000Z',
      symbol: 'NZDUSD',
      direction: 'short',
      entryPrice: 0.8445,
      exitPrice: 0.8390,
      fees: 2.0,
      notes: 'NZDUSD reversal at weekly resistance. Strong bearish engulfing.',
      openedAt: '2026-05-12T13:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 0.8475,
      takeProfitPrice: 0.8385,
      timeframe: 'H4',
      plannedRr: 2.0,
      psychology: {
        convictionLevel: 7,
        emotionalState: 'confident',
        energyLevel: 4,
        entryTiming: 'early',
        exitTiming: 'on_time',
        focusLevel: 4,
        followedPlan: true,
        htfBias: 'bearish',
        lesson: 'Entered slightly before the daily close candle confirmed. Still worked but risky.',
        marketCondition: 'reversal',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'new_york',
        setupQuality: 4
      }
    },
    // Trade 3: Small loss, followed plan
    {
      closedAt: '2026-05-13T14:00:00.000Z',
      symbol: 'EURUSD',
      direction: 'long',
      entryPrice: 1.0825,
      exitPrice: 1.0790,
      fees: 2.5,
      notes: 'EURUSD hit SL. Market reversed on surprise ECB comment.',
      openedAt: '2026-05-13T08:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.0790,
      takeProfitPrice: 1.0890,
      timeframe: 'H1',
      plannedRr: 1.8,
      psychology: {
        convictionLevel: 6,
        emotionalState: 'neutral',
        energyLevel: 3,
        entryTiming: 'on_time',
        exitTiming: 'stopped_out',
        focusLevel: 4,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Fundamental surprise. Nothing wrong with the setup. Accept the loss.',
        marketCondition: 'news_driven',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'london',
        setupQuality: 3
      }
    },
    // Trade 4: Winner — good focus, trending market
    {
      closedAt: '2026-05-14T16:00:00.000Z',
      symbol: 'GBPJPY',
      direction: 'long',
      entryPrice: 191.50,
      exitPrice: 192.80,
      fees: 3.0,
      notes: 'GBPJPY long on pullback to trendline. Trailed stop to breakeven.',
      openedAt: '2026-05-14T09:00:00.000Z',
      quantity: 5000,
      stopLossPrice: 190.80,
      takeProfitPrice: 193.00,
      timeframe: 'H1',
      plannedRr: 2.1,
      psychology: {
        convictionLevel: 9,
        emotionalState: 'confident',
        energyLevel: 5,
        entryTiming: 'on_time',
        exitTiming: 'late',
        focusLevel: 5,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Let it run a bit past TP but gave back some profit. Stick to targets.',
        marketCondition: 'trending_up',
        movedStopLoss: false,
        movedTakeProfit: true,
        positionSizeAdherence: 'correct',
        session: 'overlap_london_ny',
        setupQuality: 5
      }
    },
    // Trade 5: Loss — low energy, impulsive
    {
      closedAt: '2026-05-15T11:00:00.000Z',
      symbol: 'GBPUSD',
      direction: 'short',
      entryPrice: 1.2540,
      exitPrice: 1.2590,
      fees: 2.5,
      notes: 'Forced a trade on GBPUSD. No clear deceleration. Bad entry.',
      openedAt: '2026-05-15T08:30:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.2580,
      takeProfitPrice: 1.2470,
      timeframe: 'M30',
      plannedRr: 1.7,
      psychology: {
        convictionLevel: 3,
        emotionalState: 'impatient',
        energyLevel: 2,
        entryTiming: 'early',
        exitTiming: 'stopped_out',
        focusLevel: 2,
        followedPlan: false,
        htfBias: 'neutral',
        lesson: 'Traded on a day I felt tired. Should have sat out. Low energy = no trades.',
        marketCondition: 'choppy',
        movedStopLoss: true,
        movedTakeProfit: false,
        positionSizeAdherence: 'oversized',
        session: 'london',
        setupQuality: 2
      }
    },

    // ── Week 2: Emotional swings, revenge trading ──

    // Trade 6: Loss after trade 5 — revenge trade
    {
      closedAt: '2026-05-15T14:00:00.000Z',
      symbol: 'EURUSD',
      direction: 'long',
      entryPrice: 1.0810,
      exitPrice: 1.0775,
      fees: 2.5,
      notes: 'Jumped into EURUSD to make back the GBPUSD loss. No checklist done.',
      openedAt: '2026-05-15T12:00:00.000Z',
      quantity: 15000,
      stopLossPrice: 1.0770,
      takeProfitPrice: 1.0870,
      timeframe: 'M15',
      plannedRr: 1.5,
      psychology: {
        convictionLevel: 2,
        emotionalState: 'revenge',
        energyLevel: 2,
        entryTiming: 'early',
        exitTiming: 'stopped_out',
        focusLevel: 1,
        followedPlan: false,
        htfBias: 'no_bias',
        lesson: 'Classic revenge trade. 2 losses in a row because I didn\'t respect the process.',
        marketCondition: 'choppy',
        movedStopLoss: true,
        movedTakeProfit: false,
        positionSizeAdherence: 'oversized',
        session: 'new_york',
        setupQuality: 1
      }
    },
    // Trade 7: Recovery win — back to process
    {
      closedAt: '2026-05-19T15:00:00.000Z',
      symbol: 'GBPUSD',
      direction: 'long',
      entryPrice: 1.2680,
      exitPrice: 1.2740,
      fees: 2.5,
      notes: 'GBPUSD long after sitting out 2 days. Clean pullback to 50 EMA.',
      openedAt: '2026-05-19T08:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.2650,
      takeProfitPrice: 1.2750,
      timeframe: 'H1',
      plannedRr: 2.3,
      psychology: {
        convictionLevel: 7,
        emotionalState: 'neutral',
        energyLevel: 4,
        entryTiming: 'on_time',
        exitTiming: 'on_time',
        focusLevel: 4,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Taking 2 days off after the revenge trade was the right call.',
        marketCondition: 'trending_up',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'london',
        setupQuality: 4
      }
    },
    // Trade 8: Ranging market loss
    {
      closedAt: '2026-05-19T18:00:00.000Z',
      symbol: 'AUDUSD',
      direction: 'short',
      entryPrice: 0.6520,
      exitPrice: 0.6550,
      fees: 2.0,
      notes: 'AUDUSD short at resistance. But market was ranging — no trend.',
      openedAt: '2026-05-19T14:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 0.6555,
      takeProfitPrice: 0.6470,
      timeframe: 'H4',
      plannedRr: 1.4,
      psychology: {
        convictionLevel: 5,
        emotionalState: 'neutral',
        energyLevel: 3,
        entryTiming: 'on_time',
        exitTiming: 'stopped_out',
        focusLevel: 3,
        followedPlan: true,
        htfBias: 'bearish',
        lesson: 'Setup looked OK on H4 but daily was ranging. Checklist should have flagged it.',
        marketCondition: 'ranging',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'new_york',
        setupQuality: 3
      }
    },
    // Trade 9: Small win in NY session
    {
      closedAt: '2026-05-20T19:00:00.000Z',
      symbol: 'EURUSD',
      direction: 'long',
      entryPrice: 1.0870,
      exitPrice: 1.0910,
      fees: 2.5,
      notes: 'EURUSD long on NY open breakout. Quick scalp at support.',
      openedAt: '2026-05-20T14:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.0845,
      takeProfitPrice: 1.0920,
      timeframe: 'M30',
      plannedRr: 2.0,
      psychology: {
        convictionLevel: 6,
        emotionalState: 'neutral',
        energyLevel: 4,
        entryTiming: 'on_time',
        exitTiming: 'early',
        focusLevel: 4,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Took profit early at first resistance. Should have held to original TP.',
        marketCondition: 'breakout',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'new_york',
        setupQuality: 4
      }
    },
    // Trade 10: Loss — anxious, undersized
    {
      closedAt: '2026-05-20T23:00:00.000Z',
      symbol: 'EURJPY',
      direction: 'short',
      entryPrice: 164.20,
      exitPrice: 164.60,
      fees: 3.0,
      notes: 'EURJPY short at round number. Bounced hard. Was hesitant on entry.',
      openedAt: '2026-05-20T16:00:00.000Z',
      quantity: 3000,
      stopLossPrice: 164.65,
      takeProfitPrice: 163.40,
      timeframe: 'H1',
      plannedRr: 1.8,
      psychology: {
        convictionLevel: 4,
        emotionalState: 'anxious',
        energyLevel: 3,
        entryTiming: 'late',
        exitTiming: 'stopped_out',
        focusLevel: 3,
        followedPlan: true,
        htfBias: 'neutral',
        lesson: 'Anxiety made me size down too much and enter late. If I\'m anxious, skip it.',
        marketCondition: 'ranging',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'undersized',
        session: 'new_york',
        setupQuality: 3
      }
    },

    // ── Week 3: Finding rhythm ──

    // Trade 11: Big winner — high conviction
    {
      closedAt: '2026-05-21T16:00:00.000Z',
      symbol: 'GBPUSD',
      direction: 'long',
      entryPrice: 1.2700,
      exitPrice: 1.2810,
      fees: 2.5,
      notes: 'GBPUSD long on weekly support bounce. All 4 critical columns ticked.',
      openedAt: '2026-05-21T08:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.2660,
      takeProfitPrice: 1.2820,
      timeframe: 'H4',
      plannedRr: 3.0,
      psychology: {
        convictionLevel: 10,
        emotionalState: 'confident',
        energyLevel: 5,
        entryTiming: 'on_time',
        exitTiming: 'on_time',
        focusLevel: 5,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'This is what a perfect setup looks like. All criteria met, high conviction, excellent R:R.',
        marketCondition: 'trending_up',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'london',
        setupQuality: 5
      }
    },
    // Trade 12: Small winner — Asian session
    {
      closedAt: '2026-05-22T05:00:00.000Z',
      symbol: 'AUDJPY',
      direction: 'long',
      entryPrice: 92.30,
      exitPrice: 92.65,
      fees: 2.0,
      notes: 'AUDJPY long in Asian session. Tight range breakout.',
      openedAt: '2026-05-22T01:00:00.000Z',
      quantity: 5000,
      stopLossPrice: 92.10,
      takeProfitPrice: 92.70,
      timeframe: 'M30',
      plannedRr: 2.0,
      psychology: {
        convictionLevel: 5,
        emotionalState: 'neutral',
        energyLevel: 3,
        entryTiming: 'on_time',
        exitTiming: 'on_time',
        focusLevel: 3,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Asian session can work but requires patience. Lower volatility, tighter stops.',
        marketCondition: 'low_volatility',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'asian',
        setupQuality: 3
      }
    },
    // Trade 13: Loss — choppy market
    {
      closedAt: '2026-05-22T14:00:00.000Z',
      symbol: 'USDCHF',
      direction: 'short',
      entryPrice: 0.9050,
      exitPrice: 0.9080,
      fees: 2.0,
      notes: 'USDCHF short. Whipsaw on Fed minutes leak. Market was already choppy.',
      openedAt: '2026-05-22T09:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 0.9085,
      takeProfitPrice: 0.8990,
      timeframe: 'H1',
      plannedRr: 1.7,
      psychology: {
        convictionLevel: 4,
        emotionalState: 'frustrated',
        energyLevel: 3,
        entryTiming: 'on_time',
        exitTiming: 'stopped_out',
        focusLevel: 3,
        followedPlan: true,
        htfBias: 'bearish',
        lesson: 'Choppy markets are not my strength. Should avoid when structure is unclear.',
        marketCondition: 'choppy',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'london',
        setupQuality: 2
      }
    },
    // Trade 14: Winner after loss — disciplined recovery
    {
      closedAt: '2026-05-23T16:00:00.000Z',
      symbol: 'EURUSD',
      direction: 'long',
      entryPrice: 1.0900,
      exitPrice: 1.0965,
      fees: 2.5,
      notes: 'EURUSD long on clean pullback. Waited for daily close confirmation.',
      openedAt: '2026-05-23T08:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.0870,
      takeProfitPrice: 1.0970,
      timeframe: 'H4',
      plannedRr: 2.3,
      psychology: {
        convictionLevel: 7,
        emotionalState: 'neutral',
        energyLevel: 4,
        entryTiming: 'on_time',
        exitTiming: 'on_time',
        focusLevel: 4,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Patience after yesterday\'s loss. Waited for confirmation. This is the process.',
        marketCondition: 'trending_up',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'london',
        setupQuality: 4
      }
    },
    // Trade 15: Loss — bored trading
    {
      closedAt: '2026-05-23T20:00:00.000Z',
      symbol: 'USDCAD',
      direction: 'short',
      entryPrice: 1.3660,
      exitPrice: 1.3700,
      fees: 2.0,
      notes: 'USDCAD short. No real setup. Bored after the EURUSD win and looking for action.',
      openedAt: '2026-05-23T17:00:00.000Z',
      quantity: 8000,
      stopLossPrice: 1.3695,
      takeProfitPrice: 1.3600,
      timeframe: 'M15',
      plannedRr: 1.7,
      psychology: {
        convictionLevel: 3,
        emotionalState: 'bored',
        energyLevel: 2,
        entryTiming: 'early',
        exitTiming: 'stopped_out',
        focusLevel: 2,
        followedPlan: false,
        htfBias: 'no_bias',
        lesson: 'Boredom trading is the same as revenge trading. No setup = no trade.',
        marketCondition: 'low_volatility',
        movedStopLoss: true,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'new_york',
        setupQuality: 1
      }
    },
    // Trade 16: Nice winner — London session
    {
      closedAt: '2026-05-26T14:00:00.000Z',
      symbol: 'GBPUSD',
      direction: 'long',
      entryPrice: 1.2750,
      exitPrice: 1.2830,
      fees: 2.5,
      notes: 'GBPUSD continuation trade. Trend intact, pullback to dynamic EMA.',
      openedAt: '2026-05-26T08:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.2720,
      takeProfitPrice: 1.2840,
      timeframe: 'H1',
      plannedRr: 2.7,
      psychology: {
        convictionLevel: 8,
        emotionalState: 'confident',
        energyLevel: 5,
        entryTiming: 'on_time',
        exitTiming: 'on_time',
        focusLevel: 5,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'London open continues to be the best session for GBP pairs.',
        marketCondition: 'trending_up',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'london',
        setupQuality: 5
      }
    },
    // Trade 17: Small loss — tight stop
    {
      closedAt: '2026-05-26T17:00:00.000Z',
      symbol: 'USDJPY',
      direction: 'short',
      entryPrice: 157.30,
      exitPrice: 157.55,
      fees: 3.0,
      notes: 'USDJPY short at resistance. Got squeezed out by 5 pips. Setup was right.',
      openedAt: '2026-05-26T13:00:00.000Z',
      quantity: 5000,
      stopLossPrice: 157.55,
      takeProfitPrice: 156.50,
      timeframe: 'H1',
      plannedRr: 3.2,
      psychology: {
        convictionLevel: 6,
        emotionalState: 'neutral',
        energyLevel: 4,
        entryTiming: 'on_time',
        exitTiming: 'stopped_out',
        focusLevel: 4,
        followedPlan: true,
        htfBias: 'bearish',
        lesson: 'Stop was too tight for JPY volatility. Should use wider stops on JPY pairs.',
        marketCondition: 'trending_down',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'overlap_london_ny',
        setupQuality: 4
      }
    },
    // Trade 18: Winner — euphoric but still followed plan
    {
      closedAt: '2026-05-27T15:00:00.000Z',
      symbol: 'EURUSD',
      direction: 'long',
      entryPrice: 1.0950,
      exitPrice: 1.1020,
      fees: 2.5,
      notes: 'EURUSD long. Felt great after the GBPUSD win. But stuck to the checklist.',
      openedAt: '2026-05-27T08:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.0920,
      takeProfitPrice: 1.1030,
      timeframe: 'H1',
      plannedRr: 2.7,
      psychology: {
        convictionLevel: 7,
        emotionalState: 'euphoric',
        energyLevel: 5,
        entryTiming: 'on_time',
        exitTiming: 'early',
        focusLevel: 4,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Euphoria after wins is dangerous. I followed the plan but exited early — fear of giving back.',
        marketCondition: 'trending_up',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'london',
        setupQuality: 4
      }
    },
    // Trade 19: Loss — fear after winning streak
    {
      closedAt: '2026-05-27T19:00:00.000Z',
      symbol: 'NZDUSD',
      direction: 'short',
      entryPrice: 0.8430,
      exitPrice: 0.8460,
      fees: 2.0,
      notes: 'NZDUSD reversal attempt. Got scared and widened stop. Classic fear-based error.',
      openedAt: '2026-05-27T14:00:00.000Z',
      quantity: 5000,
      stopLossPrice: 0.8455,
      takeProfitPrice: 0.8370,
      timeframe: 'H4',
      plannedRr: 2.4,
      psychology: {
        convictionLevel: 5,
        emotionalState: 'fearful',
        energyLevel: 3,
        entryTiming: 'late',
        exitTiming: 'stopped_out',
        focusLevel: 3,
        followedPlan: false,
        htfBias: 'bearish',
        lesson: 'Widened stop because I was afraid of another loss. That is NOT following the plan.',
        marketCondition: 'reversal',
        movedStopLoss: true,
        movedTakeProfit: false,
        positionSizeAdherence: 'undersized',
        session: 'new_york',
        setupQuality: 3
      }
    },
    // Trade 20: Clean closer — end of the run
    {
      closedAt: '2026-05-27T22:00:00.000Z',
      symbol: 'GBPUSD',
      direction: 'long',
      entryPrice: 1.2800,
      exitPrice: 1.2870,
      fees: 2.5,
      notes: 'GBPUSD long — end of week clean setup. All criteria met. Closed before weekend.',
      openedAt: '2026-05-27T16:00:00.000Z',
      quantity: 10000,
      stopLossPrice: 1.2770,
      takeProfitPrice: 1.2880,
      timeframe: 'H1',
      plannedRr: 2.7,
      psychology: {
        convictionLevel: 8,
        emotionalState: 'neutral',
        energyLevel: 4,
        entryTiming: 'on_time',
        exitTiming: 'on_time',
        focusLevel: 5,
        followedPlan: true,
        htfBias: 'bullish',
        lesson: 'Ended the week strong. Neutral emotion + high conviction = best trades.',
        marketCondition: 'trending_up',
        movedStopLoss: false,
        movedTakeProfit: false,
        positionSizeAdherence: 'correct',
        session: 'new_york',
        setupQuality: 5
      }
    }
  ];
}
