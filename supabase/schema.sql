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
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  city text,
  gst_number text,
  created_at timestamptz default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  city text,
  created_at timestamptz default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  code text,
  balance numeric(14,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  client_name text not null,
  type text not null check (type in ('Invoice', 'Expense', 'Payment', 'Transfer')),
  status text not null default 'Pending' check (status in ('Paid', 'Pending', 'Review')),
  amount numeric(14,2) not null,
  transaction_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  invoice_number text not null,
  customer_id uuid references public.customers(id),
  issue_date date not null default current_date,
  due_date date,
  status text default 'Draft' check (status in ('Draft', 'Sent', 'Paid', 'Overdue')),
  subtotal numeric(14,2) default 0,
  tax numeric(14,2) default 0,
  total numeric(14,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(14,2) not null,
  total numeric(14,2) not null,
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  vendor_id uuid references public.vendors(id),
  description text not null,
  amount numeric(14,2) not null,
  expense_date date not null default current_date,
  category text,
  status text default 'Pending' check (status in ('Paid', 'Pending', 'Review')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.vendors enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.expenses enable row level security;

create policy "Users can view their own profile" on public.profiles
for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
for update using (auth.uid() = id);

create policy "Users can manage their customers" on public.customers
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their vendors" on public.vendors
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their accounts" on public.accounts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their transactions" on public.transactions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their invoices" on public.invoices
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their invoice items" on public.invoice_items
for all using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.user_id = auth.uid()
  )
);

create policy "Users can manage their expenses" on public.expenses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
