-- Daily P&L circuit breaker — configurable per-user drawdown limits

alter table public.profiles
  add column if not exists max_daily_loss_pct numeric(5, 2),
  add column if not exists max_daily_loss_amount numeric(20, 2),
  add column if not exists max_weekly_loss_pct numeric(5, 2),
  add column if not exists max_weekly_loss_amount numeric(20, 2),
  add column if not exists circuit_breaker_enabled boolean not null default true;

comment on column public.profiles.max_daily_loss_pct
  is 'Percentage of account equity that triggers daily circuit breaker (e.g. 3.00 = 3%).';
comment on column public.profiles.max_daily_loss_amount
  is 'Absolute amount in base currency that triggers daily circuit breaker. If both pct and amount are set, the lower threshold wins.';
comment on column public.profiles.max_weekly_loss_pct
  is 'Percentage of account equity that triggers weekly circuit breaker.';
comment on column public.profiles.max_weekly_loss_amount
  is 'Absolute amount in base currency that triggers weekly circuit breaker.';
