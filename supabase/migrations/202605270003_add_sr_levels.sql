-- Phase 5: Support/Resistance level library
-- Reusable price level database per pair — saves re-identifying the same
-- levels across daily checklists.

create table public.sr_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  symbol text not null,
  price numeric(20, 8) not null,
  type text not null check (type in ('horizontal', 'angular_trendline', 'dynamic_ema')),
  level_role text check (level_role in ('support', 'resistance', 'flip_zone')),
  touch_count smallint not null default 1,
  last_touched_date date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sr_levels_user_symbol_idx
  on public.sr_levels (user_id, symbol)
  where is_active = true;

create index sr_levels_user_id_idx
  on public.sr_levels (user_id);

alter table public.sr_levels enable row level security;

create policy "Users can manage their sr levels"
  on public.sr_levels for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.sr_levels
  to authenticated;
