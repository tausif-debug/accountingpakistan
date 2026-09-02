# Supabase Troubleshooting Guide

## Step 1: Verify Environment Variables

✅ Check that your `.env` file has the correct values:

```bash
cat .env
```

Should show:
```
VITE_SUPABASE_URL=https://qcofsvsbvoqemcqznkna.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_hpdXfQlobNEUobd8DtzaOA_v0AgRAib
```

**If `.env` is missing or empty:**
```bash
cp .env.example .env
# Then edit with your Supabase credentials
```

---

## Step 2: Check Database Tables Exist

1. Go to https://app.supabase.com
2. Select your project `qcofsvsbvoqemcqznkna`
3. Click **Table Editor** in the left sidebar
4. You should see these tables:
   - [ ] profiles
   - [ ] customers
   - [ ] vendors
   - [ ] transactions
   - [ ] invoices
   - [ ] invoice_items
   - [ ] expenses
   - [ ] accounts

**If tables are missing:**
- Go to **SQL Editor**
- Click **New query**
- Copy entire contents of `supabase/schema.sql`
- Paste into editor
- Click **Run**
- Wait for completion (may take 30 seconds)

---

## Step 3: Verify Authentication is Enabled

1. Go to https://app.supabase.com → your project
2. Click **Authentication** in the left sidebar
3. Click **Providers** tab
4. Ensure **Email** provider is enabled (toggle should be ON)

**If Email is OFF:**
- Click toggle to enable
- Save changes

---

## Step 4: Check CORS Settings

1. In Supabase dashboard, go to **Settings** → **API**
2. Look for **CORS settings**
3. For local development, add: `http://localhost:5173`
4. For production, add your domain: `https://yourdomain.com`

---

## Step 5: Test the App Locally

```bash
# Make sure you're in the project directory
cd /Users/tausif/pakistan-accounting-app

# Start the development server
npm run dev
```

App should be available at: `http://localhost:5173`

---

## Step 6: Check Browser Console for Errors

1. Open your browser
2. Press `F12` to open Developer Tools
3. Click **Console** tab
4. Look for red errors

### Common Error Messages & Fixes

#### ❌ Error: "Supabase is not configured"
**Cause:** `.env` variables not loaded  
**Fix:**
```bash
# Restart dev server to reload .env
npm run dev
# Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
```

#### ❌ Error: "CORS error" or "fetch failed"
**Cause:** CORS not allowed  
**Fix:**
1. Go to Supabase Settings → API
2. Add `http://localhost:5173` to allowed origins
3. Wait 1 minute for changes to propagate
4. Try again

#### ❌ Error: "relation does not exist"
**Cause:** Database schema not executed  
**Fix:**
1. Go to Supabase SQL Editor
2. Paste contents of `supabase/schema.sql`
3. Click Run
4. Wait for all tables to be created

#### ❌ Error: "Permission denied" or "row level security"
**Cause:** RLS policies not configured correctly  
**Fix:**
1. Go to Supabase → SQL Editor
2. Run schema again to ensure policies are created
3. Check Authentication is working (can sign up/login)

#### ❌ Error: "Email provider not configured"
**Cause:** Email authentication not enabled  
**Fix:**
1. Go to Supabase → Authentication → Providers
2. Make sure Email toggle is ON
3. Save changes

---

## Step 7: Test Sign Up

1. Click **Login** in sidebar
2. Switch to **Sign up** tab
3. Enter:
   - Full name: `Test User`
   - Email: `test@example.com`
   - Password: `TestPassword123`
4. Click **Create account**

**Expected:** Message says "Account created. Please confirm your email if required."

**If fails:**
- Check browser console for error message
- Go to Supabase → Authentication → Users
- Look for the user you tried to create
- If user exists, email might need confirmation

---

## Step 8: Test Data Persistence

After signing up:

1. Go to **Contacts** tab
2. Switch to **Customers**
3. Fill in customer form:
   - Name: `Test Customer`
   - Email: `customer@test.com`
   - Phone: `+92 300 1234567`
   - City: `Karachi`
   - GST: `27-1234567-9`
4. Click **Add customer**

**Expected:** Customer appears in list below form

**If fails:**
- Check browser console for error
- Go to Supabase → Table Editor → customers
- Check if row was created there
- If yes, issue is with React rendering
- If no, issue is with Supabase connection

---

## Step 9: Check Supabase Logs

1. In Supabase dashboard, go to **Logs** (left sidebar)
2. Click **API requests** or **Database**
3. Look for errors in the logs
4. Copy error message and check against common issues above

---

## Step 10: Full Diagnostic Checklist

Print this checklist and confirm each item:

- [ ] `.env` file exists and has correct URL and API key
- [ ] Can access Supabase dashboard (login works)
- [ ] Database tables exist in Table Editor
- [ ] Email provider is enabled in Authentication
- [ ] CORS allows `http://localhost:5173`
- [ ] Dev server is running (`npm run dev`)
- [ ] Can see app at `http://localhost:5173`
- [ ] Browser console shows no red errors
- [ ] Can sign up with email
- [ ] User appears in Supabase → Authentication → Users
- [ ] Can add customer and it appears in list
- [ ] Customer data appears in Supabase → Table Editor → customers

---

## Step 11: Restart Everything

If nothing works, try a full reset:

```bash
# Stop the dev server (Ctrl+C)

# Clear node modules (optional, takes time)
# rm -rf node_modules
# npm install

# Clear dist folder
rm -rf dist/

# Restart dev server
npm run dev

# Open fresh browser tab
# Go to http://localhost:5173
# Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
```

---

## Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| "Supabase not configured" | Restart dev server, hard refresh browser |
| CORS error | Add domain to Supabase CORS settings |
| Tables don't exist | Run schema.sql in Supabase SQL Editor |
| Can't sign up | Enable Email in Authentication Providers |
| Data not saving | Check Table Editor to verify table exists |
| RLS permission error | Verify auth is working, run schema again |
| Wrong Supabase project | Check URL matches your project in `.env` |
| Old cached data | Hard refresh (Cmd+Shift+R), clear browser cache |

---

## Quick Copy-Paste: Execute Schema

If tables are missing, do this:

1. Go to: https://app.supabase.com/project/qcofsvsbvoqemcqznkna/sql/new
2. Paste this entire block:

```sql
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
```

3. Click **Run**
4. Wait for success message
5. Refresh browser and try again

---

## Still Not Working?

Try these steps in order:

1. **Verify URL is correct**
   ```
   https://qcofsvsbvoqemcqznkna.supabase.co
   ```

2. **Check API key is correct**
   ```
   sb_publishable_hpdXfQlobNEUobd8DtzaOA_v0AgRAib
   ```

3. **Confirm `.env` file exists**
   ```bash
   ls -la .env
   ```

4. **Check that dev server sees env vars**
   - Open browser Console (F12)
   - Type: `console.log(import.meta.env)`
   - You should see both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

5. **If not showing, restart dev server**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   # Hard refresh browser (Cmd+Shift+R)
   ```

---

## Get Help

Share these details if asking for help:

1. Screenshot of browser console error (F12)
2. Output of: `cat .env | grep VITE`
3. Screenshot of Supabase Table Editor (showing tables)
4. What exact action failed (sign up? add customer? view data?)
5. Error message from browser or Supabase logs
