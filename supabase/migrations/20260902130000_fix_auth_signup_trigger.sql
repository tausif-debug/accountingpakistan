-- Fix Supabase Auth signup trigger.
-- Keep the trigger security-definer and use an empty search_path so auth.users
-- inserts are not dependent on the caller's database search path.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_user_id_code_key'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_user_id_code_key unique (user_id, code);
  end if;
end;
$$;

create or replace function public.handle_new_accounting_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data->>'company_name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, type, code) values
    (new.id, 'Accounts Receivable', 'asset', '1100'),
    (new.id, 'Cash / Bank', 'asset', '1200'),
    (new.id, 'Accounts Payable', 'liability', '2000'),
    (new.id, 'Tax Payable', 'liability', '2100'),
    (new.id, 'Sales Revenue', 'revenue', '4000'),
    (new.id, 'Operating Expenses', 'expense', '5000')
  on conflict (user_id, code) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_accounting_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_accounting on auth.users;

create trigger on_auth_user_created_accounting
after insert on auth.users
for each row execute function public.handle_new_accounting_user();
