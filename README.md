# Alpha Ledger: Pakistan Accounting App

A modern accounting application for Pakistani businesses, built with React 19, TypeScript, Vite, and Supabase.

![Status](https://img.shields.io/badge/Status-Actively%20Hardened-blue)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node-22+-brightgreen)

---

## Core features

- Dashboard backed by authoritative invoice and expense records
- Invoice creation with per-invoice tax and unique invoice numbers per business
- Expense tracking with vendor/category support
- Customer and vendor CRUD with persistent updates and deletes
- Supabase authentication with session change handling and sign-out
- Financial reports based on stored accounting records
- Row-level security for accounting data
- Production lint/build checks through GitHub Actions

## Setup

1. Install Node.js 22 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Run `npm run dev`.

The browser must only use the Supabase publishable/anon key. Never put a `service_role` or secret key in Vite client-side environment variables.

## Development checks

```bash
npm run lint
npm run build
```

The CI workflow runs both commands on pushes and pull requests targeting `main`.

## Database

The accounting schema is in `supabase/schema.sql`. It uses RLS ownership policies, monetary constraints, per-user invoice-number uniqueness, and indexes for the main accounting access paths.

The application treats `invoices` and `expenses` as the authoritative source for dashboard financial totals. The legacy `transactions` table remains available for payment/transfer-style ledger records.

## Security

- RLS is enabled on all accounting tables.
- Update policies include both ownership checks and `WITH CHECK` protections.
- SECURITY DEFINER helper functions are not exposed to anonymous/authenticated API callers.
- Supabase Auth leaked-password protection should be enabled in the project Auth settings before production launch.
