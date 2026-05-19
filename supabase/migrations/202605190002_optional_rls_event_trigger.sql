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
