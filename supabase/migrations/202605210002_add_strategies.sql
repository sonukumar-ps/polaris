create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  market_conditions text,
  must_have_rules text[] not null default '{}',
  preferred_rules text[] not null default '{}',
  qualitative_notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strategies enable row level security;

create unique index if not exists strategies_user_active_name_idx
  on public.strategies (user_id, lower(name))
  where is_archived = false;

create index if not exists strategies_user_id_idx
  on public.strategies (user_id);

create policy "Users can manage their strategies"
  on public.strategies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.trades
  add column if not exists strategy_id uuid references public.strategies (id) on delete set null;

create index if not exists trades_user_strategy_idx
  on public.trades (user_id, strategy_id);

grant select, insert, update, delete
  on public.strategies
  to authenticated;
