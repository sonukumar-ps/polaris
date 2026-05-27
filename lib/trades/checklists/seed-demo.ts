import { supabase } from '@/lib/supabase';

import type { StrategyChecklistInput } from './checklist.types';
import { upsertChecklist } from './checklist';

/**
 * Seeds realistic demo checklists for today's date.
 * Call from a dev button — requires an authenticated session
 * and at least one strategy to exist.
 */
export async function seedDemoChecklists(strategyId: string, date: string): Promise<number> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('You must be signed in to seed demo data.');
  }

  const demos: Omit<StrategyChecklistInput, 'checklistDate' | 'strategyId'>[] = [
    // ── Fully qualified trend trade ──
    {
      candlestickPattern: 'Bullish engulfing at 20 EMA',
      correlationPairs: ['GBPJPY'],
      decelerationEvidence: 'small_candles',
      decelerationPass: true,
      decision: 'trade',
      decisionReason: 'All critical pass, strong trend structure, 2.1 R:R',
      direction: 'long',
      ema50PositionPass: true,
      emaZoneVisitedPass: true,
      emotionalRating: 5,
      indicatorSignal: 'RSI 42 bouncing off support',
      marketConditionNote: 'Clean HH/HL on daily, 4 swings visible',
      marketConditionPass: true,
      marketPhase: 'pullback',
      marketPhasePass: true,
      mtfConfirmation: '4H trend aligned bullish, weekly in impulse',
      newsCheckClear: true,
      rrOnTrade: 2.1,
      rrToLastSwing: 1.8,
      rrToNextSr: 2.5,
      srReactionPass: true,
      srTouchCount: 4,
      srTypes: ['horizontal', 'dynamic_ema'],
      strategyType: 'trend',
      symbol: 'GBPUSD',
      totalSrTouches: 7
    },
    // ── Qualified but watching — good setup, news risk ──
    {
      correlationPairs: ['GBPUSD', 'EURJPY'],
      decelerationEvidence: 'doji',
      decelerationPass: true,
      decision: 'watch',
      decisionReason: 'NFP tomorrow, correlated with GBPUSD already in play',
      direction: 'long',
      ema50PositionPass: true,
      emaZoneVisitedPass: true,
      emotionalRating: 5,
      marketConditionNote: '3 clean swings, but JPY pairs volatile ahead of news',
      marketConditionPass: true,
      marketPhase: 'pullback',
      marketPhasePass: true,
      newsCheckClear: false,
      rrOnTrade: 1.6,
      rrToLastSwing: 1.4,
      rrToNextSr: 2.0,
      srReactionPass: true,
      srTouchCount: 3,
      srTypes: ['angular_trendline'],
      strategyType: 'trend',
      symbol: 'GBPJPY',
      totalSrTouches: 5
    },
    // ── Skipped — critical column failed ──
    {
      decelerationPass: false,
      decision: 'skip',
      decisionReason: 'No deceleration — large momentum candles still printing',
      direction: 'short',
      ema50PositionPass: true,
      emaZoneVisitedPass: false,
      marketConditionNote: 'Trending down but impulsive move, no pullback yet',
      marketConditionPass: true,
      marketPhase: 'impulse',
      marketPhasePass: false,
      rrToLastSwing: 0.8,
      srReactionPass: false,
      srTouchCount: 1,
      srTypes: ['horizontal'],
      strategyType: 'trend',
      symbol: 'EURUSD',
      totalSrTouches: 2
    },
    // ── Reversal setup — qualified ──
    {
      candlestickPattern: 'Bearish engulfing at weekly resistance',
      decelerationEvidence: 'engulfing',
      decelerationPass: true,
      decision: 'trade',
      decisionReason: 'Major weekly resistance, double top forming, 1.9 R:R to 50 EMA',
      direction: 'short',
      emotionalRating: 6,
      indicatorSignal: 'RSI divergence on 4H',
      marketConditionNote: 'Strong uptrend but stalling at weekly resistance',
      marketConditionPass: true,
      marketPhase: 'impulse',
      marketPhasePass: true,
      mtfConfirmation: 'Weekly shooting star, daily bearish engulfing',
      newsCheckClear: true,
      reversalPattern: 'Bearish engulfing + RSI divergence',
      reversalSrPass: true,
      rrOnTrade: 1.9,
      rrToLastSwing: 1.5,
      rrToNextSr: 2.3,
      srReactionPass: true,
      srTouchCount: 5,
      srTypes: ['horizontal'],
      strategyType: 'reversal',
      symbol: 'AUDUSD',
      totalSrTouches: 8
    },
    // ── Partial fill — trend, barely passes ──
    {
      decelerationEvidence: 'inside_bar',
      decelerationPass: true,
      decision: 'trade',
      decisionReason: 'Meets all criteria but R:R is marginal. Tight stop on 1H swing.',
      direction: 'long',
      ema50PositionPass: true,
      emaZoneVisitedPass: true,
      emotionalRating: 4,
      marketConditionNote: 'HH/HL intact but swings getting tighter',
      marketConditionPass: true,
      marketPhase: 'pullback',
      marketPhasePass: true,
      newsCheckClear: true,
      rrOnTrade: 1.1,
      rrToLastSwing: 1.0,
      rrToNextSr: 1.4,
      srReactionPass: true,
      srTouchCount: 3,
      srTypes: ['dynamic_ema'],
      strategyType: 'trend',
      symbol: 'NZDUSD',
      totalSrTouches: 4
    },
    // ── Incomplete — just started, only critical columns partially done ──
    {
      direction: 'short',
      marketConditionNote: 'Checking...',
      marketConditionPass: true,
      marketPhasePass: null,
      srReactionPass: null,
      strategyType: 'trend',
      symbol: 'USDCAD'
    },
    // ── Another skip — market condition failed ──
    {
      decision: 'skip',
      decisionReason: 'No clear structure — ranging inside 100-pip box for 2 weeks',
      direction: 'long',
      marketConditionNote: 'Choppy, no identifiable 3 swings',
      marketConditionPass: false,
      strategyType: 'trend',
      symbol: 'EURGBP'
    }
  ];

  let count = 0;

  for (const demo of demos) {
    await upsertChecklist({
      ...demo,
      checklistDate: date,
      strategyId
    });
    count++;
  }

  return count;
}
