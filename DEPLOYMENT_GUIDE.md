# Deployment Guide: RS Ops Hub with Supabase

## Overview

RS Ops Hub now uses **Supabase** for shared team data. Every user sees the same data across all devices and browsers, organized by team.

## Prerequisites

- A Supabase account (free at https://supabase.com)
- Your Netlify account (already set up)
- Node.js 16+ installed locally

## Step 1: Set Up Supabase

### 1.1 Create Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Fill in:
   - **Project Name**: `rs-ops-hub`
   - **Database Password**: Something secure (save this!)
   - **Region**: Pick closest to you (e.g., `us-east-1`)
4. Wait ~2 minutes for the project to initialize

### 1.2 Load the Schema

1. Click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open `supabase-schema.sql` from the project root
4. Copy and paste the entire contents
5. Click **Run** (Cmd+Enter)
6. Verify: You should see ✅ green checkmarks for all table creations

### 1.3 Get Your Credentials

1. Click **Settings** → **API** in the sidebar
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **API Keys** → Copy the **anon public** key (NOT the secret key)

3. Create `.env.local` in your project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

4. **IMPORTANT**: Never commit `.env.local` to git. It's already in `.gitignore`.

### 1.4 Enable Email Authentication

1. Click **Authentication** in the sidebar
2. Click **Providers**
3. Find **Email**
4. Make sure the toggle is **ON** (default)
5. Click **Save**

## Step 2: Update Your Local App

### 2.1 Install Dependencies

```bash
cd /path/to/rs-ops-hub
npm install
```

This adds `@supabase/supabase-js` to your project.

### 2.2 Test Locally

```bash
npm run dev
```

You should see:
- ✅ A new **Log In / Sign Up** page (not the old password page)
- No errors in the browser console

### 2.3 Create Your First Account

1. Click **Sign Up** tab
2. Enter your email and password
3. **Check your email** for a confirmation link (check spam folder)
4. Click the link to confirm
5. Go back to the app and **Log In** with your email/password
6. You should now see the app
7. Add a client/project to test

### 2.4 Test Multi-Device Sync

1. Open the app in a **different browser** or **incognito window**
2. Log in with the **same email**
3. You should see the **same data** you just added ✅

## Step 3: Add Team Members

### 3.1 Invite Team Members

1. Have your colleague go to your deployed app URL
2. Click **Sign Up**
3. They enter their email and create a password
4. They check email for confirmation link
5. They log in
6. **They automatically join your team** and see all the data ✅

### 3.2 Add More Members

Repeat the process. Every new signup automatically joins the existing team.

## Step 4: Deploy to Netlify

### 4.1 Update Environment Variables

1. Go to https://app.netlify.com
2. Select your `rs-ops-hub` site
3. Click **Site Settings** → **Build & Deploy** → **Environment**
4. Add these environment variables:
   - **VITE_SUPABASE_URL** = `https://xxxxx.supabase.co`
   - **VITE_SUPABASE_ANON_KEY** = (your anon public key)

### 4.2 Deploy

Push your changes to GitHub:

```bash
git add .
git commit -m "Switch to Supabase team database"
git push origin main
```

Netlify will automatically build and deploy. Check https://app.netlify.com for build status.

### 4.3 Verify Deployment

1. Go to your deployed site URL
2. You should see the new **Log In / Sign Up** page
3. Log in with your account
4. Data should load correctly

## Troubleshooting

### "Cannot find module @supabase/supabase-js"

Run: `npm install`

### Login page appears but says "Error: Missing environment variables"

Your `.env.local` is missing or incomplete. Check Step 1.3.

### Data not showing after login

1. Check the browser console (F12) for errors
2. Verify `.env.local` has correct URLs and keys
3. Go to Supabase dashboard → **SQL Editor** and check that tables exist

### Row Level Security (RLS) error

This is security working as intended. Make sure:
1. You're logged in
2. The user account exists in Supabase (check **Authentication** → **Users**)
3. Your `.env.local` has the correct `VITE_SUPABASE_ANON_KEY`

### Email confirmation not arriving

1. Check spam folder
2. In Supabase → **Authentication** → **Users**, manually confirm the user by clicking their row and changing the status

### Different data appearing for different users

This should NOT happen. If it does:
1. Check the browser console for errors
2. Make sure both users are in the same team
3. In Supabase → **SQL Editor**, run: `SELECT * FROM team_members;`
4. Both users should appear with the same `team_id`

## How It Works

### Architecture

```
Browser (React App)
    ↓ HTTPS
Supabase Database
    ↓ PostgreSQL
All team data shared
```

**Key concepts:**
- **Teams**: Groups of users. All data is scoped to a team.
- **Row Level Security (RLS)**: Automatic security that prevents users from seeing other teams' data.
- **Auth**: Email/password authentication built-in to Supabase.

### User Flow

1. New user signs up with email/password
2. Supabase sends confirmation email
3. User confirms email
4. On next login, app checks: "Does this user have a team?"
5. If no team exists, app creates one and adds them as admin
6. If a team exists, app adds them to it as a member
7. From then on, all users see the same data

### Data Structure

```
Team
├── Team Members (users assigned to the team)
├── Clients
├── Projects
│   ├── Deliverables (per project)
│   └── Payment Tranches (per project)
├── Documents (Quotes, SOWs, Invoices)
└── Retainers
```

All data automatically filtered by `team_id` via RLS.

## Next Steps

### Optional: Make a Public Share Link

If you want to share read-only data with clients:

1. In Supabase, create a separate "Public" role
2. Create a shared link that uses that role
3. This is a paid feature (Supabase Team plan)

### Optional: Custom Domain

Your app is currently at `rs-ops-hub.netlify.app`. To use a custom domain:

1. In Netlify, go **Site Settings** → **Domain Management**
2. Click **Add domain**
3. Follow the instructions

### Optional: Backup Data

Supabase provides daily automated backups. To export data manually:

1. Go Supabase → **Database** → **Backups**
2. Or use the Supabase CLI to export

## Security Notes

✅ **What's secure:**
- Passwords are hashed by Supabase
- Your API key is in `.env` and never sent to browsers
- Row Level Security prevents data leaks between teams
- SSL/TLS encryption for all data in transit

⚠️ **What to watch out for:**
- Never commit `.env.local` to git
- Don't share your Supabase database password
- The `VITE_SUPABASE_ANON_KEY` is "public" (that's OK—it's scoped by auth and RLS)

## Support

For issues:
1. Check the browser console (F12) for error messages
2. Check Netlify build logs (https://app.netlify.com)
3. Check Supabase logs (**Supabase Dashboard** → **Logs**)
4. Visit https://supabase.com/docs for documentation

---

**Your app is now team-ready!** 🚀
