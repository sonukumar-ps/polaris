-- Phase 2: Order management fields on trades table
-- Supports Jason's pending order workflow (buy stop / sell stop with 24h expiry)
-- and his 3-tier management system (basic / intermediate / advanced)

-- Order placement fields
alter table public.trades
  add column if not exists entry_order_type text
    check (entry_order_type in ('pending_buy_stop', 'pending_sell_stop', 'market')),
  add column if not exists order_placed_at timestamptz,
  add column if not exists order_expiry_at timestamptz,
  add column if not exists order_triggered boolean default false,
  add column if not exists order_expired boolean default false;

-- Trade management fields
alter table public.trades
  add column if not exists management_option text
    check (management_option in ('basic', 'intermediate', 'advanced')),
  add column if not exists is_bulletproof boolean default false,
  add column if not exists trailing_stop_count smallint default 0;

-- Additional R:R tracking (targets assessed during setup)
alter table public.trades
  add column if not exists rr_to_last_swing numeric(8, 2),
  add column if not exists rr_to_next_sr numeric(8, 2);

-- Slippage tracking (blind spot: partial fills / slippage)
alter table public.trades
  add column if not exists intended_entry_price numeric(20, 8),
  add column if not exists slippage_pips numeric(8, 2);

-- Checklist linkage (which checklist spawned this trade)
alter table public.trades
  add column if not exists checklist_id uuid
    references public.strategy_checklists (id) on delete set null;

-- Stop-loss history table for advanced management trailing
create table if not exists public.stop_loss_history (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  moved_at timestamptz not null default now(),
  old_price numeric(20, 8) not null,
  new_price numeric(20, 8) not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists stop_loss_history_trade_id_idx
  on public.stop_loss_history (trade_id);
create index if not exists stop_loss_history_user_id_idx
  on public.stop_loss_history (user_id);
create index if not exists trades_checklist_id_idx
  on public.trades (checklist_id);

alter table public.stop_loss_history enable row level security;

create policy "Users can manage their stop loss history"
  on public.stop_loss_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.stop_loss_history
  to authenticated;
