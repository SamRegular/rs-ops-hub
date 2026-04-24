# Quick Start: Supabase Setup (5 minutes)

## 1. Create Supabase Project (2 min)

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Name: `rs-ops-hub`
4. Create a password (save it!)
5. Pick your region
6. **Wait** for it to initialize

## 2. Load Database Schema (1 min)

1. In Supabase, click **SQL Editor**
2. Click **New Query**
3. Paste the entire contents of `supabase-schema.sql`
4. Click **Run**
5. Check for ✅ green checkmarks

## 3. Get Your Credentials (30 sec)

1. Click **Settings** → **API**
2. Copy **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy **anon public** API key
4. Create `.env.local` in project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

## 4. Install & Test Locally (1 min)

```bash
npm install
npm run dev
```

You should see a **Log In / Sign Up** page.

## 5. Create First Account (1 min)

1. Click **Sign Up**
2. Enter your email
3. Create a password
4. Check email for confirmation link
5. Click the link
6. Go back and **Log In**
7. ✅ You're in!

## 6. Test Multi-Device (30 sec)

1. Open app in **different browser/incognito**
2. Sign up with **same email**
3. Confirm email
4. Log in
5. ✅ See same data!

## 7. Add Environment Variables to Netlify

1. Go to https://app.netlify.com
2. Click your site
3. **Site Settings** → **Build & Deploy** → **Environment**
4. Add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key

## 8. Deploy

```bash
git add .
git commit -m "Add Supabase"
git push origin main
```

Netlify deploys automatically. Done! 🚀

---

## Invite Team Members

Your teammates visit your live site → **Sign Up** → same email domain → automatically joins your team and sees all data.

That's it!
