# RS Ops Hub: Team Database Edition

Your app now supports **shared team data** using Supabase. Every team member sees the same data across all devices and browsers.

## 📋 Quick Overview

| Feature | Before (localStorage) | Now (Supabase) |
|---------|----------------------|---------|
| **Data Storage** | Each browser/device separate | Shared PostgreSQL database |
| **Authentication** | Single password | Individual email/password accounts |
| **Team Access** | Not possible | ✅ Full team sync |
| **Cross-Device** | Isolated data | ✅ Same data everywhere |
| **Backup** | Manual export only | ✅ Automatic daily backups |
| **Scalability** | Single user per device | ✅ Unlimited team members |

## 🚀 Setup (15 minutes)

### Step 1: Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Enter project name: `rs-ops-hub`
4. Create a strong database password
5. Select your region
6. Wait ~2 minutes for initialization

### Step 2: Load Database Schema
1. In Supabase, go to **SQL Editor** → **New Query**
2. Copy all content from `supabase-schema.sql`
3. Paste into the query editor
4. Click **Run**
5. Verify: All tables created successfully (green checkmarks)

### Step 3: Get Your Credentials
1. Go to **Settings** → **API**
2. Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy **anon public** API key (NOT the secret)
4. Create `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Install & Test
```bash
npm install
npm run dev
```

You should see a **Log In / Sign Up** page (not the old password page).

### Step 5: Create Your Account
1. Click **Sign Up**
2. Enter your email and password
3. Check email for confirmation link
4. Click the link to confirm
5. Go back and **Log In**
6. ✅ You're in! Add a test client.

### Step 6: Test Multi-Device Sync
1. Open the app in a **different browser** or **incognito window**
2. Sign up with the **same email**
3. Confirm email
4. Log in
5. ✅ You should see the same data!

### Step 7: Deploy to Netlify

1. Go to https://app.netlify.com → your site
2. **Site Settings** → **Build & Deploy** → **Environment**
3. Add environment variables:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key

4. Deploy:
```bash
git add .
git commit -m "Add Supabase team database"
git push origin main
```

Netlify builds automatically.

## 👥 Inviting Team Members

Your teammates:
1. Visit your live app URL
2. Click **Sign Up**
3. Enter their email and password
4. Confirm email
5. Log in
6. ✅ They automatically join your team and see all data

That's it! No admin setup needed.

## 📊 How It Works

### Architecture
```
All Users → Supabase Database → PostgreSQL
                ↓
          Automatic sync
          via RLS policies
```

### Data Flow
1. User logs in → Supabase authenticates
2. Supabase returns session token
3. App queries database with token
4. Row-level security (RLS) automatically filters data by team
5. Changes sync instantly across all devices

### Team Management
- **First user** to sign up → creates a team and becomes admin
- **Subsequent users** → automatically join that team as members
- **Same team_id** → see all the same data
- **Different team_id** → completely isolated data

## 🔐 Security

✅ **Secure:**
- Passwords hashed by Supabase
- Row-level security prevents data leaks
- SSL/TLS encryption in transit
- Your API key is "public" but scoped by auth + RLS
- Automatic daily backups

⚠️ **Important:**
- Never commit `.env.local` to git (already in `.gitignore`)
- Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` private
- Don't share your Supabase database password

## 🗄️ Database Schema

```
Teams (team_id, name)
├── Team Members (user_id, role: admin/member)
├── Clients (name, company, email, phone, sector, source, etc.)
├── Projects (name, status: Lead/Quoted/Confirmed/Active/Complete/Lost)
│   ├── Deliverables (per project)
│   └── Payment Tranches (per project, for cash flow)
├── Documents (Quotes, SOWs, Invoices)
└── Retainers (monthly recurring)
```

All data automatically scoped to team via `team_id`.

## 📝 What Changed in Your Code

### Files Updated
- `src/storage/index.js` → Now uses Supabase
- `src/components/Login.jsx` → Email/password auth
- `src/App.jsx` → Supabase auth state management
- `src/hooks/useStore.js` → Loads deliverables & payment tranches
- `package.json` → Added `@supabase/supabase-js`

### New Files Created
- `src/storage/supabase.js` → Supabase adapter
- `supabase-schema.sql` → Database schema
- `.env.example` → Environment template

### Unchanged
- All UI components (Clients, Projects, Documents, Pipeline)
- All features and styling
- All business logic

## 🐛 Troubleshooting

### "Missing environment variables"
→ Create `.env.local` with Supabase credentials (Step 3)

### Login page shows but says "Error"
→ Check browser console (F12) for details

### Data not syncing across devices
→ Make sure both users are confirmed and logged in with same email domain

### "Cannot find module @supabase/supabase-js"
→ Run: `npm install`

### Email confirmation not arriving
→ Check spam folder
→ In Supabase → **Authentication** → **Users**, manually confirm the user

### Different data for different users
→ This shouldn't happen! Check:
1. Are both users in the same team?
2. Run in Supabase: `SELECT * FROM team_members;`
3. Both should have the same `team_id`

### RLS error when trying to save data
→ Verify you're authenticated
→ Check browser console for full error message
→ Ensure `.env.local` has correct credentials

## 📚 Documentation

- **QUICKSTART.md** - 5-minute quick reference
- **DEPLOYMENT_GUIDE.md** - Detailed deployment steps
- **MIGRATION_SUMMARY.md** - What changed and why
- **SUPABASE_SETUP.md** - Detailed Supabase setup

## ✨ Features Now Working

✅ **Multi-User Team Collaboration**
- All team members see the same data
- Changes sync instantly across devices
- Add unlimited team members

✅ **Projects with Deliverables**
- Each project has deliverables list
- Auto-populated in quotes/SOWs

✅ **Payment Tranches**
- Track money across multiple months
- Timeline shows cash flow visibility
- Invoice creation supports tranches

✅ **Automatic Team Formation**
- First user creates team
- Other users auto-join
- No setup required

✅ **Secure Authentication**
- Individual email/password accounts
- Password reset capability (optional to add)
- Sessions persist across browser refreshes

## 🔄 Data Migration

If you had test data in localStorage:
- **It will not automatically migrate**
- Create fresh data in Supabase (recommended for clean start)
- Or manually export localStorage and import to Supabase (advanced)

## 🎯 Next Steps

1. ✅ Follow the setup above
2. ✅ Invite your first team member
3. ✅ Add some test data
4. ✅ Deploy to Netlify
5. ✅ Share the link with your team

## 💡 Tips

**For Adding More Team Members:**
- Send them the app URL
- They sign up (don't need an invite)
- They automatically see your team's data
- Done!

**For Local Development:**
- Your `.env.local` is ignored by git (safe)
- Each developer can have their own credentials
- All pointing to same Supabase project = shared testing data

**For Backups:**
- Supabase does automatic daily backups
- You can also manually export from Supabase dashboard
- Data is preserved forever (until you delete it)

## 📞 Support

For issues:
1. Check browser console (F12)
2. Check Netlify build logs
3. Check Supabase **Logs** section
4. Refer to troubleshooting above

---

**Your app is now enterprise-ready for team collaboration!** 🚀

Questions? See DEPLOYMENT_GUIDE.md for detailed help.
