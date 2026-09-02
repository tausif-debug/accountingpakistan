# Setup & Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier available at https://supabase.com)
- Git (for version control)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tausif-debug/accountingpakistan.git
cd pakistan-accounting-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root by copying from `.env.example`:

```bash
cp .env.example .env
```

Then edit `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**How to get your Supabase credentials:**
1. Go to https://app.supabase.com
2. Create a new project or select an existing one
3. In the project settings, find:
   - Project URL (under "API")
   - Public API Key (anon key, under "API")
4. Copy these values into your `.env` file

### 4. Set Up the Database

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste into the SQL editor
6. Click **Run**
7. Verify that all tables are created (check **Table Editor**)

#### Option B: Using CLI (Advanced)

```bash
npm install -g supabase
supabase link --project-ref your-project-ref
supabase db push
```

### 5. Enable Row Level Security (RLS)

After running the schema, verify RLS is enabled:

1. In Supabase, go to **Authentication** → **Policies**
2. Confirm all tables have policies enabled
3. Test with a sample sign-up and data entry

## Development

### Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Features Available Locally

- ✅ Dashboard with metrics and transactions
- ✅ Invoice and expense management
- ✅ Customer and vendor contacts (CRUD)
- ✅ Reports with monthly breakdown
- ✅ Transaction status management
- ✅ Date range filtering

**Note:** Without Supabase configured, the app runs with sample data that doesn't persist.

## Production Build

### Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized, production-ready files.

### Preview Production Build

```bash
npm run preview
```

### File Size

- Main JS bundle: ~420 KB (gzipped: ~119 KB)
- CSS bundle: ~8.5 KB (gzipped: ~2.5 KB)

## Deployment Options

### Option 1: Netlify (Recommended for Quick Start)

1. Push code to GitHub
2. Go to https://netlify.com
3. Click **New site from Git**
4. Select your repository
5. Set build command: `npm run build`
6. Set publish directory: `dist`
7. Add environment variables in Netlify settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
8. Deploy

### Option 2: Vercel

1. Go to https://vercel.com
2. Import your GitHub repository
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables
6. Deploy

### Option 3: Self-Hosted

1. Build the project: `npm run build`
2. Upload `dist/` folder to your server
3. Configure web server (nginx/Apache) to serve `dist/index.html` for all routes
4. Ensure environment variables are set in deployment environment

## Common Issues & Fixes

### Issue: "Supabase is not configured"

**Cause:** `.env` file missing or incorrect credentials

**Fix:**
```bash
cp .env.example .env
# Edit .env with correct Supabase URL and API key
```

### Issue: "User authentication failed"

**Cause:** Email confirmation required (check your email)

**Fix:** Supabase sends a confirmation link by default. Check spam folder or disable email confirmation in Supabase settings.

### Issue: "Tables don't exist"

**Cause:** Schema SQL hasn't been executed

**Fix:** Execute the schema.sql file in Supabase SQL Editor (see Setup Step 4)

### Issue: "CORS errors in browser"

**Cause:** Supabase URL not added to allowed origins

**Fix:**
1. Go to Supabase → Settings → API
2. Add your domain to CORS allowed origins
3. For localhost: `http://localhost:5173`

## Security Notes

⚠️ **Important:**
- Never commit `.env` (it's in `.gitignore`)
- Keep `VITE_SUPABASE_ANON_KEY` private when deployed
- Row Level Security (RLS) policies are configured to ensure users only see their own data
- Use HTTPS in production
- Enable email verification for sign-ups

## Database Backup

To backup your data from Supabase:

1. Go to Supabase dashboard
2. Click **Database** → **Backups**
3. Create a manual backup
4. Or use the CLI:

```bash
supabase db pull
```

## Monitoring & Maintenance

- **Check logs:** Supabase dashboard → Logs
- **Database size:** Supabase dashboard → Database
- **Auth issues:** Supabase dashboard → Authentication → Users

## Support & Documentation

- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev
- **Vite Docs:** https://vitejs.dev
- **Project Repo:** https://github.com/tausif-debug/accountingpakistan

## Next Steps After Deployment

1. ✅ Test user authentication
2. ✅ Create sample transactions
3. ✅ Verify Supabase data persistence
4. ✅ Set up custom domain (if needed)
5. ✅ Configure email notifications (optional)
6. ✅ Set up analytics (optional)

## Version & Updates

- **App Version:** 1.0.0
- **Node Version:** 18+
- **React:** 19
- **Vite:** 8+
- **Supabase JS Client:** Latest
