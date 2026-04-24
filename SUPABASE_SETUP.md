# Supabase Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New project"
3. Fill in:
   - **Name**: `rs-ops-hub` (or similar)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you (e.g., `us-east-1`)
4. Click "Create new project" and wait ~2 minutes for setup

## Step 2: Run the Schema

1. In Supabase dashboard, go to **SQL Editor** on the left
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** (or Cmd+Enter)
5. You should see "Success" messages for each table

## Step 3: Get Your Credentials

1. Go to **Settings** → **API** on the left
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** (under "Project API keys")
3. Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

4. Save the file

## Step 4: Enable Email Authentication

1. In Supabase, go to **Authentication** → **Providers**
2. Click **Email**
3. Make sure the toggle is **enabled** (should be by default)
4. Click **Save**

## Step 5: Verify Setup

1. Terminal: `npm install @supabase/supabase-js`
2. Start your dev server: `npm run dev`
3. You should see the new login page
4. Go to Supabase → **Authentication** → **Users** (you'll create users there if needed)

## Team Setup for First User

When the first user signs up:
1. An automatic email is sent (check spam folder)
2. Click the link to confirm email
3. The app will create a team and add them as admin
4. Share the app URL with teammates
5. They sign up with their own email
6. They'll automatically join the existing team

## Troubleshooting

**"Cannot find module '@supabase/supabase-js'"**
- Run: `npm install @supabase/supabase-js`

**Data not appearing after login**
- Check that you ran the SQL schema (should see tables in Supabase → SQL Editor)
- Verify `.env.local` has correct values
- Check browser console for errors

**Row Level Security (RLS) errors**
- This is a security feature. Make sure you're authenticated
- Team members only see their team's data automatically

**Email confirmation not arriving**
- Check spam folder
- In Supabase → Authentication, you can manually confirm a user by clicking the user and changing status

## Making Your First Entry

1. Log in with your email
2. Add a client, project, or document
3. The data is automatically saved to Supabase
4. Open the app in another browser/device and log in with the same email
5. You'll see the same data! ✅

## Database Structure

- **Teams**: Groups of users. All data is scoped to a team.
- **Team Members**: Links users to teams with roles (admin/member)
- **Clients**, **Projects**, **Documents**, **Retainers**: All reference `team_id`
- **Row Level Security (RLS)**: Automatically prevents users from seeing other teams' data

That's it! Your app now has shared data for your team.
