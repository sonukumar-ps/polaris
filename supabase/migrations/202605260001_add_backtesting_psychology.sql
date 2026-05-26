-- After applying this migration, regenerate types:
-- supabase gen types typescript --linked > polaris/lib/database.types.ts

create table public.trade_psychology (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trade_id uuid not null references public.trades (id) on delete cascade,

  -- Pre-trade state (captured BEFORE knowing outcome)
  setup_quality smallint check (setup_quality between 1 and 5),
  conviction_level smallint check (conviction_level between 1 and 10),
  energy_level smallint check (energy_level between 1 and 5),
  focus_level smallint check (focus_level between 1 and 5),
  emotional_state text check (emotional_state in (
    'neutral', 'confident', 'anxious', 'frustrated',
    'fearful', 'euphoric', 'bored', 'impatient', 'revenge'
  )),

  -- Execution assessment (captured AFTER trade closes)
  followed_plan boolean,
  entry_timing text check (entry_timing in ('early', 'on_time', 'late', 'missed_better')),
  exit_timing text check (exit_timing in ('early', 'on_time', 'late', 'stopped_out')),
  moved_stop_loss boolean,
  moved_take_profit boolean,
  position_size_adherence text check (position_size_adherence in ('undersized', 'correct', 'oversized')),

  -- Post-trade reflection
  lesson text,

  -- Market context
  market_condition text check (market_condition in (
    'trending_up', 'trending_down', 'ranging', 'choppy',
    'breakout', 'reversal', 'news_driven', 'low_volatility'
  )),
  session text check (session in ('london', 'new_york', 'asian', 'sydney', 'overlap_london_ny')),
  htf_bias text check (htf_bias in ('bullish', 'bearish', 'neutral', 'no_bias')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (trade_id)
);

create index trade_psychology_user_id_idx on public.trade_psychology (user_id);
create index trade_psychology_trade_id_idx on public.trade_psychology (trade_id);

alter table public.trade_psychology enable row level security;

create policy "Users can manage their trade psychology"
  on public.trade_psychology for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.trade_psychology
  to authenticated;

alter table public.trades
  add column if not exists planned_rr numeric(8, 2),
  add column if not exists stop_loss_price numeric(20, 8),
  add column if not exists take_profit_price numeric(20, 8),
  add column if not exists timeframe text,
  add column if not exists htf_timeframe text;

alter type public.tag_type add value if not exists 'psychology';
alter type public.tag_type add value if not exists 'market_context';
