export type EmotionalState =
  | 'neutral' | 'confident' | 'anxious' | 'frustrated'
  | 'fearful' | 'euphoric' | 'bored' | 'impatient' | 'revenge';

export type EntryTiming = 'early' | 'on_time' | 'late' | 'missed_better';
export type ExitTiming = 'early' | 'on_time' | 'late' | 'stopped_out';
export type PositionSizeAdherence = 'undersized' | 'correct' | 'oversized';

export type MarketCondition =
  | 'trending_up' | 'trending_down' | 'ranging' | 'choppy'
  | 'breakout' | 'reversal' | 'news_driven' | 'low_volatility';

export type TradingSession = 'london' | 'new_york' | 'asian' | 'sydney' | 'overlap_london_ny';
export type HtfBias = 'bullish' | 'bearish' | 'neutral' | 'no_bias';

export type TradePsychologyInput = {
  convictionLevel?: number;
  emotionalState?: EmotionalState;
  energyLevel?: number;
  entryTiming?: EntryTiming;
  exitTiming?: ExitTiming;
  focusLevel?: number;
  followedPlan?: boolean;
  htfBias?: HtfBias;
  lesson?: string;
  marketCondition?: MarketCondition;
  movedStopLoss?: boolean;
  movedTakeProfit?: boolean;
  positionSizeAdherence?: PositionSizeAdherence;
  session?: TradingSession;
  setupQuality?: number;
};

export type TradePsychologyRow = {
  conviction_level: number | null;
  created_at: string;
  emotional_state: string | null;
  energy_level: number | null;
  entry_timing: string | null;
  exit_timing: string | null;
  focus_level: number | null;
  followed_plan: boolean | null;
  htf_bias: string | null;
  id: string;
  lesson: string | null;
  market_condition: string | null;
  moved_stop_loss: boolean | null;
  moved_take_profit: boolean | null;
  position_size_adherence: string | null;
  session: string | null;
  setup_quality: number | null;
  trade_id: string;
  updated_at: string;
  user_id: string;
};
