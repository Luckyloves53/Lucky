# 🎱 PCSO Hot Numbers Tracker

Auto-updating Philippine lottery frequency analyzer.  
Built with **Next.js** + **Supabase** + **Vercel** — all free tiers.

---

## How It Works

```
Every draw night (9PM PHT):
  Vercel Cron → /api/scrape → Claude scrapes lottopcso.com → Supabase DB
                                        ↓
                              User opens the app → /api/draws → Supabase DB
```

---

## 🚀 Setup Guide (Step by Step)

### STEP 1 — Create a Supabase project (free)

1. Go to **https://supabase.com** → Sign up / Log in
2. Click **"New Project"**
3. Give it a name: `pcso-lotto` → Set a database password → Create
4. Wait ~1 minute for it to initialize
5. Go to **Settings → API**
6. Copy these 3 values (you'll need them later):
   - `Project URL` → this is your `SUPABASE_URL`
   - `anon / public` key → this is your `SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

### STEP 2 — Create the database tables

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **"Run"** (green button)
6. You should see "Success. No rows returned."

### STEP 3 — Get your Anthropic API key (free credits available)

1. Go to **https://console.anthropic.com** → Sign up / Log in
2. Go to **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`)

### STEP 4 — Deploy to Vercel (free)

1. Go to **https://vercel.com** → Sign up with GitHub
2. Push this project folder to a **GitHub repository**:
   ```bash
   cd pcso-lotto
   git init
   git add .
   git commit -m "Initial commit"
   # Create a repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/pcso-lotto.git
   git push -u origin main
   ```
3. In Vercel: click **"Add New Project"** → Import your GitHub repo
4. Before deploying, click **"Environment Variables"** and add:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key |
   | `CRON_SECRET` | Any random string (e.g. `pcso-secret-2026`) |

5. Click **Deploy** → Wait ~2 minutes → Your app is live! 🎉

### STEP 5 — Load the initial data

The database starts empty. Do a manual first scrape:

1. Open your browser and go to:
   ```
   https://YOUR-APP.vercel.app/api/scrape?game=6%2F58
   ```
   With the Authorization header — easiest via curl:
   ```bash
   curl -H "Authorization: Bearer pcso-secret-2026" \
     "https://YOUR-APP.vercel.app/api/scrape"
   ```
2. This will scrape all 5 games and populate your database (takes ~1-2 min)
3. Open your app — you should see real draw history!

---

## ⏰ Auto-Update Schedule

The `vercel.json` file configures a cron job:

```json
"schedule": "30 13 * * 0,2,4,5"
```

This runs at **9:30 PM PHT** on:
- **Sunday** (6/58, 6/49)
- **Tuesday** (6/58, 6/49, 6/42)
- **Thursday** (6/49, 6/45, 6/42)
- **Friday** (6/58, 6/55, 6/45)

> **Note:** Vercel cron requires the **Pro plan** ($20/mo) for custom schedules.  
> On the **free plan**, you can use a free external cron service instead:
> - **cron-job.org** (free) → set it to call your `/api/scrape` URL 3x/week

---

## 📁 Project Structure

```
pcso-lotto/
├── pages/
│   ├── index.jsx          ← Main app UI
│   └── api/
│       ├── draws.js       ← GET /api/draws?game=6/58
│       ├── analyze.js     ← POST /api/analyze (AI analysis)
│       └── scrape.js      ← GET /api/scrape (cron scraper)
├── supabase-schema.sql    ← Run once in Supabase SQL Editor
├── vercel.json            ← Cron schedule config
├── package.json
├── .env.example           ← Copy to .env.local and fill in
└── README.md
```

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (free) | $0/mo |
| Supabase | Free tier | $0/mo |
| Anthropic API | Pay per use | ~$0.01 per scrape |
| **Total** | | **~$0.10/month** |

---

## ⚠️ Disclaimer

This app is for **entertainment purposes only**.  
Lottery draws are random — no frequency analysis can predict results.  
Play responsibly. Must be 18+ to play PCSO games. 🇵🇭
