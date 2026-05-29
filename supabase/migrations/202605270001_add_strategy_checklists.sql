-- After applying this migration, regenerate types:
-- supabase gen types typescript --linked > polaris/lib/database.types.ts

create table public.strategy_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  symbol text not null,
  checklist_date date not null,
  direction text check (direction in ('long', 'short')),

  -- Strategy type for this checklist session (trend vs reversal)
  strategy_type text not null default 'trend' check (strategy_type in ('trend', 'reversal')),

  -- Critical columns (4 compulsory tick/cross)
  market_condition_pass boolean,
  market_condition_note text,
  market_phase text check (market_phase in ('pullback', 'impulse', 'consolidation')),
  market_phase_pass boolean,
  sr_reaction_pass boolean,
  sr_touch_count smallint,
  sr_types text[],
  deceleration_pass boolean,
  deceleration_evidence text check (deceleration_evidence in (
    'small_candles', 'doji', 'tweezer', 'inside_bar', 'hlt', 'engulfing'
  )),

  -- Trend-specific columns
  ema50_position_pass boolean,
  ema_zone_visited_pass boolean,

  -- Reversal-specific columns
  reversal_sr_pass boolean,
  reversal_pattern text,

  -- Preferred analysis (optional)
  candlestick_pattern text,
  mtf_confirmation text,
  indicator_signal text,
  emotional_rating smallint check (emotional_rating between 0 and 10),

  -- Qualitative analysis
  total_sr_touches smallint,
  rr_to_last_swing numeric(8, 2),
  rr_to_next_sr numeric(8, 2),
  rr_on_trade numeric(8, 2),

  -- Trade decision
  decision text check (decision in ('trade', 'skip', 'watch')),
  decision_reason text,
  correlation_pairs text[],
  news_check_clear boolean,

  -- Link to the resulting trade (if decision = trade and order triggered)
  trade_id uuid references public.trades (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One checklist row per pair per day per strategy
  unique (user_id, strategy_id, symbol, checklist_date)
);

create index strategy_checklists_user_id_idx
  on public.strategy_checklists (user_id);

create index strategy_checklists_user_date_idx
  on public.strategy_checklists (user_id, checklist_date);

create index strategy_checklists_user_symbol_idx
  on public.strategy_checklists (user_id, symbol);

create index strategy_checklists_trade_id_idx
  on public.strategy_checklists (trade_id)
  where trade_id is not null;

alter table public.strategy_checklists enable row level security;

create policy "Users can manage their strategy checklists"
  on public.strategy_checklists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.strategy_checklists
  to authenticated;
