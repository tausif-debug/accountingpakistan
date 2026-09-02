create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  business_type text,
  city text default 'Karachi',
  currency text default 'PKR',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  city text,
  gst_number text,
  created_at timestamptz default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  city text,
  created_at timestamptz default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  code text,
  balance numeric(14,2) not null default 0,
  created_at timestamptz default now(),
  unique (user_id, code)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_name text not null,
  type text not null check (type in ('Invoice', 'Expense', 'Payment', 'Transfer')),
  status text not null default 'Pending' check (status in ('Paid', 'Pending', 'Review')),
  amount numeric(14,2) not null check (amount >= 0),
  transaction_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  invoice_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Paid', 'Overdue')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  created_at timestamptz default now(),
  unique (user_id, invoice_number)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total numeric(14,2) not null check (total >= 0),
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  category text,
  status text not null default 'Pending' check (status in ('Paid', 'Pending', 'Review')),
  created_at timestamptz default now()
);

-- Double-entry accounting foundation. Every journal entry must balance: total debits = total credits.
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null default current_date,
  reference_type text,
  reference_id uuid,
  description text not null,
  created_at timestamptz default now()
);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  created_at timestamptz default now(),
  check ((debit = 0 and credit > 0) or (credit = 0 and debit > 0))
);

create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists vendors_user_id_idx on public.vendors(user_id);
create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoices_user_status_idx on public.invoices(user_id, status);
create index if not exists invoices_user_due_date_idx on public.invoices(user_id, due_date);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index if not exists expenses_vendor_id_idx on public.expenses(vendor_id);
create index if not exists expenses_user_date_idx on public.expenses(user_id, expense_date desc);
create index if not exists journal_entries_user_date_idx on public.journal_entries(user_id, entry_date desc);
create index if not exists journal_lines_entry_idx on public.journal_lines(journal_entry_id);
create index if not exists journal_lines_account_idx on public.journal_lines(account_id);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.vendors enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.expenses enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can manage their customers" on public.customers;
drop policy if exists "Users can manage their vendors" on public.vendors;
drop policy if exists "Users can manage their accounts" on public.accounts;
drop policy if exists "Users can manage their transactions" on public.transactions;
drop policy if exists "Users can manage their invoices" on public.invoices;
drop policy if exists "Users can manage their invoice items" on public.invoice_items;
drop policy if exists "Users can manage their expenses" on public.expenses;
drop policy if exists "Users can manage their journal entries" on public.journal_entries;
drop policy if exists "Users can manage their journal lines" on public.journal_lines;

create policy "Users can view their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users can manage their customers" on public.customers for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can manage their vendors" on public.vendors for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can manage their accounts" on public.accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can manage their transactions" on public.transactions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can manage their invoices" on public.invoices for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can manage their invoice items" on public.invoice_items for all to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.user_id = (select auth.uid()))) with check (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.user_id = (select auth.uid())));
create policy "Users can manage their expenses" on public.expenses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can manage their journal entries" on public.journal_entries for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can manage their journal lines" on public.journal_lines for all to authenticated using (exists (select 1 from public.journal_entries e where e.id = journal_lines.journal_entry_id and e.user_id = (select auth.uid()))) with check (exists (select 1 from public.journal_entries e where e.id = journal_lines.journal_entry_id and e.user_id = (select auth.uid())));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Server-side dashboard aggregation avoids downloading the entire ledger just to calculate totals.
create or replace function public.get_dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from public.invoices where user_id = (select auth.uid()) and status = 'Paid'), 0),
    'expenses', coalesce((select sum(amount) from public.expenses where user_id = (select auth.uid())), 0),
    'dueTax', coalesce((select sum(tax) from public.invoices where user_id = (select auth.uid()) and status in ('Sent','Overdue')), 0),
    'transactions', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, client_name, type, status, amount, transaction_date, notes from (
          select id, client_name, type, status, amount, transaction_date, notes, created_at from public.transactions where user_id = (select auth.uid())
          union all
          select id, invoice_number as client_name, 'Invoice'::text as type,
                 case when status = 'Paid' then 'Paid' when status = 'Overdue' then 'Review' else 'Pending' end as status,
                 total as amount, issue_date as transaction_date, customer_id::text as notes, created_at
          from public.invoices where user_id = (select auth.uid())
          union all
          select id, coalesce(description, category, 'Expense') as client_name, 'Expense'::text as type, status,
                 amount, expense_date as transaction_date, category as notes, created_at
          from public.expenses where user_id = (select auth.uid())
        ) combined order by transaction_date desc, created_at desc limit 25
      ) x
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_dashboard_summary() from public, anon;
grant execute on function public.get_dashboard_summary() to authenticated;

-- Prevent journal entries from being posted unless they balance exactly.
create or replace function public.validate_journal_entry_balance()
returns trigger
language plpgsql
as $$
declare
  debit_total numeric(14,2);
  credit_total numeric(14,2);
begin
  select coalesce(sum(debit),0), coalesce(sum(credit),0)
    into debit_total, credit_total
    from public.journal_lines
   where journal_entry_id = new.journal_entry_id;
  if debit_total <> credit_total then
    raise exception 'Journal entry % is unbalanced: debits % credits %', new.journal_entry_id, debit_total, credit_total;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_journal_entry_balance() from public, anon, authenticated;
