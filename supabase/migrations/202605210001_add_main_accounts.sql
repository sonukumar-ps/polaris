alter table public.accounts
  add column if not exists is_main boolean not null default false;

with ranked_accounts as (
  select
    id,
    row_number() over (partition by user_id order by created_at, id) as account_rank
  from public.accounts
  where is_archived = false
)
update public.accounts
set is_main = ranked_accounts.account_rank = 1
from ranked_accounts
where accounts.id = ranked_accounts.id;

create unique index if not exists accounts_one_main_per_user_idx
  on public.accounts (user_id)
  where is_main = true;
