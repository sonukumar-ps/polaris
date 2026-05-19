create extension if not exists pgcrypto;

create or replace function public.enable_rls_for_new_public_tables()
returns event_trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  command record;
begin
  for command in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE TABLE'
      and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', command.object_identity);
  end loop;
end;
$$;

drop event trigger if exists enable_rls_on_public_table_create;

create event trigger enable_rls_on_public_table_create
  on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function public.enable_rls_for_new_public_tables();

create type public.trade_direction as enum ('long', 'short');
create type public.trade_status as enum ('open', 'closed', 'cancelled');
create type public.asset_class as enum ('stock', 'option', 'future', 'forex', 'crypto', 'other');
create type public.tag_type as enum ('strategy', 'emotion', 'mistake', 'setup', 'session', 'custom');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  base_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  broker_name text,
  currency text not null default 'USD',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text,
  asset_class public.asset_class not null default 'other',
  exchange text,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  unique (symbol, asset_class, exchange)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  asset_id uuid not null references public.assets (id),
  direction public.trade_direction not null,
  status public.trade_status not null default 'open',
  opened_at timestamptz not null,
  closed_at timestamptz,
  entry_price numeric(20, 8) not null,
  exit_price numeric(20, 8),
  quantity numeric(20, 8) not null,
  fees numeric(20, 8) not null default 0,
  gross_pnl numeric(20, 8),
  net_pnl numeric(20, 8),
  risk_amount numeric(20, 8),
  r_multiple numeric(12, 4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint closed_trades_have_exit check (
    status <> 'closed'
    or (closed_at is not null and exit_price is not null)
  )
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type public.tag_type not null default 'custom',
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, type, name)
);

create table public.trade_tags (
  trade_id uuid not null references public.trades (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trade_id, tag_id)
);

create table public.trade_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trade_id uuid not null references public.trades (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table public.daily_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  snapshot_date date not null,
  equity numeric(20, 8) not null,
  cash_balance numeric(20, 8),
  realized_pnl numeric(20, 8),
  created_at timestamptz not null default now(),
  unique (account_id, snapshot_date)
);

create index accounts_user_id_idx on public.accounts (user_id);
create index trades_user_closed_at_idx on public.trades (user_id, closed_at);
create index trades_user_asset_idx on public.trades (user_id, asset_id);
create index trades_user_account_closed_idx on public.trades (user_id, account_id, closed_at);
create index trades_user_net_pnl_idx on public.trades (user_id, net_pnl);
create index tags_user_type_idx on public.tags (user_id, type);
create index trade_images_trade_id_idx on public.trade_images (trade_id);
create index daily_account_snapshots_user_date_idx on public.daily_account_snapshots (user_id, snapshot_date);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.assets enable row level security;
alter table public.trades enable row level security;
alter table public.tags enable row level security;
alter table public.trade_tags enable row level security;
alter table public.trade_images enable row level security;
alter table public.daily_account_snapshots enable row level security;

create policy "Users can read their profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can manage their accounts"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can read assets"
  on public.assets for select
  to authenticated
  using (true);

create policy "Authenticated users can insert assets"
  on public.assets for insert
  to authenticated
  with check (true);

create policy "Users can manage their trades"
  on public.trades for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their tags"
  on public.tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage tags on their trades"
  on public.trade_tags for all
  using (
    exists (
      select 1
      from public.trades
      where trades.id = trade_tags.trade_id
        and trades.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.trades
      where trades.id = trade_tags.trade_id
        and trades.user_id = auth.uid()
    )
  );

create policy "Users can manage their trade images"
  on public.trade_images for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their daily snapshots"
  on public.daily_account_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
