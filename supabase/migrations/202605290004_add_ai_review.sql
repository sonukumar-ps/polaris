-- ============================================================
-- AI Evidence Coach: psychology-aware post-market review
--
-- Three tables:
--   1. trader_psychology_profile  — stable baseline per user
--   2. daily_psychology_reviews   — pre/post-market state per day
--   3. ai_review_runs             — every AI call persisted with
--                                   prompt version, evidence IDs,
--                                   structured output and feedback
--
-- After applying this migration, regenerate types:
--   supabase gen types typescript --linked > polaris/lib/database.types.ts
-- ============================================================

-- ------------------------------------------------------------
-- 1. Stable trader baseline
-- ------------------------------------------------------------
create table public.trader_psychology_profile (
  user_id uuid primary key references public.profiles (id) on delete cascade,

  -- Free-text stable inputs (rarely change)
  trading_goals text,
  known_triggers text,
  fears text,
  strengths text,
  common_mistakes text,

  -- Active themes the trader is working on (jsonb array of {theme, started_at, status})
  active_improvement_themes jsonb not null default '[]'::jsonb,

  -- Coaching tone preference
  coaching_tone text check (coaching_tone in (
    'direct', 'analytical', 'supportive', 'socratic'
  )) default 'direct',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trader_psychology_profile enable row level security;

create policy "Users manage own psychology profile"
  on public.trader_psychology_profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.trader_psychology_profile to authenticated;

-- ------------------------------------------------------------
-- 2. Daily pre/post-market reviews
-- ------------------------------------------------------------
create table public.daily_psychology_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_date date not null,

  -- Pre-market state (logged before session)
  pre_energy smallint check (pre_energy between 1 and 5),
  pre_focus smallint check (pre_focus between 1 and 5),
  pre_anxiety smallint check (pre_anxiety between 1 and 5),
  pre_confidence smallint check (pre_confidence between 1 and 5),
  pre_emotional_state text check (pre_emotional_state in (
    'neutral', 'confident', 'anxious', 'frustrated',
    'fearful', 'euphoric', 'bored', 'impatient', 'revenge', 'fomo'
  )),
  pre_context_tags text[] not null default '{}',  -- e.g. {'after_loss','behind_goal'}
  pre_notes text,
  pre_logged_at timestamptz,

  -- Post-market state (logged after session)
  post_energy smallint check (post_energy between 1 and 5),
  post_satisfaction smallint check (post_satisfaction between 1 and 5),
  post_emotional_state text check (post_emotional_state in (
    'neutral', 'confident', 'anxious', 'frustrated',
    'fearful', 'euphoric', 'bored', 'impatient', 'revenge', 'fomo'
  )),
  post_rule_discipline smallint check (post_rule_discipline between 1 and 5),
  post_reaction_to_outcome text,
  post_notes text,
  post_logged_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, review_date)
);

create index daily_psychology_reviews_user_date_idx
  on public.daily_psychology_reviews (user_id, review_date desc);

alter table public.daily_psychology_reviews enable row level security;

create policy "Users manage own daily reviews"
  on public.daily_psychology_reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.daily_psychology_reviews to authenticated;

-- ------------------------------------------------------------
-- 3. AI review runs — one row per AI call
-- ------------------------------------------------------------
create table public.ai_review_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,

  -- Scope of the review
  account_ids uuid[] not null default '{}',
  window_start date not null,
  window_end date not null,

  -- Prompt + model lineage (so we can debug drift over time)
  prompt_version text not null,
  model text not null,

  -- Inputs: bounded evidence pack + outputs from the model
  evidence_pack jsonb not null,
  structured_output jsonb,        -- validated AI response or null on failure
  raw_output text,                -- raw text for debugging
  error text,                     -- error message if call failed

  -- Pointers into actual records (for the "why we think this" drawer)
  evidence_trade_ids uuid[] not null default '{}',
  evidence_daily_review_ids uuid[] not null default '{}',

  -- User feedback on the review
  feedback text check (feedback in (
    'useful', 'not_useful', 'already_knew', 'wrong_pattern'
  )),
  feedback_note text,
  accepted_as_focus boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_review_runs_user_created_idx
  on public.ai_review_runs (user_id, created_at desc);

alter table public.ai_review_runs enable row level security;

create policy "Users read own ai reviews"
  on public.ai_review_runs for select
  using (auth.uid() = user_id);

create policy "Users update own ai review feedback"
  on public.ai_review_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Inserts come from the edge function using the service role; no
-- insert policy granted to authenticated users.
grant select, update on public.ai_review_runs to authenticated;
grant insert, update on public.ai_review_runs to service_role;
