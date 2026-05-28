/**
 * Glossary of trading terms used across Polaris.
 * Keep entries concise — 1-3 sentences max.
 */
export const GLOSSARY: Record<string, { definition: string; title: string }> = {
  bulletproof: {
    title: 'Bulletproof trade',
    definition:
      "A trade where the stop loss has been moved to the entry price or better. Worst case is now breakeven — you can't lose money. Jason's rule: bulletproof trades don't count toward your same-currency exposure risk."
  },
  consistency_rate: {
    title: 'Consistency rate',
    definition:
      'Percentage of days in the selected range where you actually filled out at least one checklist. Jason\'s system relies on daily repetition to train your RAS — high consistency matters more than perfect days.'
  },
  critical_columns: {
    title: 'Critical columns',
    definition:
      'The 4 must-pass criteria in Jason\'s system: market condition (oscillating), market phase (pullback), S/R reaction (3+ touches), and deceleration (smaller candles). If any fail, skip the trade.'
  },
  deceleration: {
    title: 'Deceleration',
    definition:
      "Market momentum slowing down — shown by smaller candle bodies, doji, tweezers, inside bars, or HLT patterns. Means the current move is exhausting, increasing odds of reversal/pullback completion. Avoid trading large-bodied momentum candles."
  },
  doji: {
    title: 'Doji',
    definition:
      'A candle where open and close are nearly equal, producing a tiny body with wicks on both sides. Signals indecision and often appears at turning points or pauses.'
  },
  dynamic_ema: {
    title: 'Dynamic EMA',
    definition:
      "A moving average that acts as support or resistance — most commonly the 20 or 50 EMA. 'Dynamic' because the level moves with each candle, unlike horizontal levels which stay fixed."
  },
  engulfing: {
    title: 'Engulfing candle',
    definition:
      "A candle whose body fully covers the previous candle's body in the opposite direction. Bullish engulfing after a downmove signals reversal up; bearish engulfing after an upmove signals reversal down."
  },
  expired_order: {
    title: 'Expired order',
    definition:
      "A pending order (buy stop / sell stop) that wasn't triggered within the 24-hour window. Jason expects ~30-50% of orders to expire — that's the system filtering out setups the market didn't validate."
  },
  flip_zone: {
    title: 'Flip zone',
    definition:
      'A price level that was once support but broke and became resistance (or vice versa). Markets remember these — sellers who got stuck above a former support now want out at breakeven when price returns. High-confidence reaction zones.'
  },
  hlt: {
    title: 'HLT (High/Low Test)',
    definition:
      "A candle that pokes above/below a key level but closes back inside — testing the level then rejecting it. Often a stronger reversal signal than a simple touch because it shows trapped breakout traders."
  },
  htf_bias: {
    title: 'HTF bias',
    definition:
      "Higher Timeframe bias — your view of trend direction on a chart larger than your trading timeframe (e.g. weekly/daily when you trade H1). Trading with HTF bias improves win rate; trading against it requires stronger justification."
  },
  inside_bar: {
    title: 'Inside bar',
    definition:
      "A candle whose entire range (high to low) is contained within the previous candle. Signals consolidation/indecision and often precedes a breakout move."
  },
  intermediate_management: {
    title: 'Intermediate management',
    definition:
      "Jason's tier 2 management: stop loss placed 3-5 pips beyond the last 1H swing, take profit 3-5 pips before next horizontal S/R. Tighter stops, more frequent trade activity than basic."
  },
  basic_management: {
    title: 'Basic management',
    definition:
      "Jason's tier 1 management: stop loss 3-5 pips beyond last daily low/high, take profit 3-5 pips before last swing. Wider stops, slower management — best for traders who can't watch charts during the day."
  },
  advanced_management: {
    title: 'Advanced management',
    definition:
      "Jason's tier 3 management: discretionary stops maximizing S/R barriers between entry and SL, trailing once trade reaches 1% running profit. Highest skill ceiling, biggest reward — but requires active screen time."
  },
  market_phase: {
    title: 'Market phase',
    definition:
      'Where price is in its cycle: pullback (countering the trend temporarily), impulse (riding the trend hard), or consolidation (ranging sideways). Trade only in pullback phase aligned with your direction.'
  },
  mtf_confirmation: {
    title: 'Multi-timeframe confirmation',
    definition:
      "Cross-checking your setup against a higher timeframe (e.g. daily setup confirmed by weekly direction, or H1 setup with H4 alignment). When timeframes agree, win rate improves significantly."
  },
  net_exposure: {
    title: 'Net exposure',
    definition:
      'Combined long/short exposure on a currency across all open trades. Long GBPUSD + long GBPJPY = 2x long GBP. The bar shows -1 (full short) to +1 (full long); 0 means balanced.'
  },
  pending_buy_stop: {
    title: 'Pending buy stop',
    definition:
      "An order to buy when price rises to a level above current price. Jason places these 3-5 pips above the last daily high — only triggers if the market actually breaks out, filtering false signals."
  },
  pending_sell_stop: {
    title: 'Pending sell stop',
    definition:
      "An order to sell when price falls to a level below current price. Jason places these 3-5 pips below the last daily low — only triggers on confirmed breakdown."
  },
  planned_rr: {
    title: 'Planned R:R (Risk to Reward)',
    definition:
      "Ratio of potential profit to potential loss before entry. R:R of 2 means you're risking $1 to make $2. Jason requires minimum 1:1, prefers 2:1+. Higher R:R compensates for lower win rates."
  },
  qualified_setup: {
    title: 'Qualified setup',
    definition:
      'A pair where all 4 critical columns passed AND the decision is "trade". This is the green light — every condition Jason\'s system requires has been met.'
  },
  qualify_rate: {
    title: 'Qualify rate',
    definition:
      'Percentage of checklists where all 4 critical columns passed. Low qualify rate (e.g. 10%) is normal and healthy — discipline means most pairs DON\'T meet criteria on any given day.'
  },
  qualified_win_rate: {
    title: 'Qualified win rate',
    definition:
      'Win rate of trades that came from a qualified checklist (all critical columns passed) compared to wins/losses overall. This should be meaningfully higher than your general win rate — that\'s the proof your checklist works.'
  },
  revenge_trade: {
    title: 'Revenge trade',
    definition:
      'Entering a trade right after a loss to "make it back" — usually without checking criteria, oversized, and emotionally driven. Most destructive habit in trading; the seed data flags these for you.'
  },
  sr_touch_count: {
    title: 'S/R touch count',
    definition:
      'How many times price has tested a support or resistance level. Jason requires 3+ previous touches — proves the level matters to enough market participants to react to it.'
  },
  trailing_stop: {
    title: 'Trailing stop',
    definition:
      "Moving the stop loss in the direction of profit to lock in gains. Jason's rule: trail max 1x per day, to last daily low/high (long) or last daily high/low (short). Prevents over-managing winning trades."
  },
  trigger_rate: {
    title: 'Trigger rate',
    definition:
      "Percentage of placed pending orders that actually filled within their 24h expiry. Healthy range is 40-70%. Too high = entries too close to current price (taking lower-quality fills); too low = entries too far away (missing real breakouts)."
  },
  tweezer: {
    title: 'Tweezer pattern',
    definition:
      "Two consecutive candles with matching highs (tweezer top) or matching lows (tweezer bottom). Indicates a price level was tested twice and rejected — short-term reversal signal."
  }
};

export type GlossaryTerm = keyof typeof GLOSSARY;
