grant usage on schema public to authenticated;

grant select, insert, update, delete
  on public.profiles,
     public.accounts,
     public.trades,
     public.tags,
     public.trade_tags,
     public.trade_images,
     public.daily_account_snapshots
  to authenticated;

grant select, insert
  on public.assets
  to authenticated;
