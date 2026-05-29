export type ChecklistDecision = 'trade' | 'skip' | 'watch';
export type ChecklistDirection = 'long' | 'short';
export type DecelerationEvidence = 'small_candles' | 'doji' | 'tweezer' | 'inside_bar' | 'hlt' | 'engulfing';
export type MarketPhase = 'pullback' | 'impulse' | 'consolidation';
export type SrType = 'horizontal' | 'angular_trendline' | 'dynamic_ema';
export type StrategyType = 'trend' | 'reversal';

export const MAJOR_PAIRS = [
  'AUDCAD', 'AUDCHF', 'AUDJPY', 'AUDNZD', 'AUDUSD',
  'CADCHF', 'CADJPY',
  'CHFJPY',
  'EURAUD', 'EURCAD', 'EURCHF', 'EURGBP', 'EURJPY', 'EURNZD', 'EURUSD',
  'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPJPY', 'GBPNZD', 'GBPUSD',
  'NZDCAD', 'NZDCHF', 'NZDJPY', 'NZDUSD',
  'USDCAD', 'USDCHF', 'USDJPY'
] as const;

export type StrategyChecklistInput = {
  // Identity (required to create/find)
  checklistDate: string;
  strategyId: string;
  strategyType: StrategyType;
  symbol: string;

  // Optional fields (filled incrementally)
  candlestickPattern?: string;
  correlationPairs?: string[];
  decelerationEvidence?: DecelerationEvidence;
  decelerationPass?: boolean | null;
  decision?: ChecklistDecision;
  decisionReason?: string;
  direction?: ChecklistDirection | null;
  ema50PositionPass?: boolean | null;
  emaZoneVisitedPass?: boolean | null;
  emotionalRating?: number | null;
  indicatorSignal?: string;
  marketConditionNote?: string;
  marketConditionPass?: boolean | null;
  marketPhase?: MarketPhase;
  marketPhasePass?: boolean | null;
  mtfConfirmation?: string;
  newsCheckClear?: boolean | null;
  reversalPattern?: string;
  reversalSrPass?: boolean | null;
  rrOnTrade?: number | null;
  rrToLastSwing?: number | null;
  rrToNextSr?: number | null;
  srReactionPass?: boolean | null;
  srTouchCount?: number | null;
  srTypes?: SrType[];
  totalSrTouches?: number | null;
  tradeId?: string | null;
};

export type StrategyChecklistRow = {
  candlestick_pattern: string | null;
  checklist_date: string;
  correlation_pairs: string[] | null;
  created_at: string;
  deceleration_evidence: string | null;
  deceleration_pass: boolean | null;
  decision: string | null;
  decision_reason: string | null;
  direction: string | null;
  ema50_position_pass: boolean | null;
  ema_zone_visited_pass: boolean | null;
  emotional_rating: number | null;
  id: string;
  indicator_signal: string | null;
  market_condition_note: string | null;
  market_condition_pass: boolean | null;
  market_phase: string | null;
  market_phase_pass: boolean | null;
  mtf_confirmation: string | null;
  news_check_clear: boolean | null;
  reversal_pattern: string | null;
  reversal_sr_pass: boolean | null;
  rr_on_trade: number | null;
  rr_to_last_swing: number | null;
  rr_to_next_sr: number | null;
  sr_reaction_pass: boolean | null;
  sr_touch_count: number | null;
  sr_types: string[] | null;
  strategy_id: string;
  strategy_type: string;
  symbol: string;
  total_sr_touches: number | null;
  trade_id: string | null;
  updated_at: string;
  user_id: string;
};
