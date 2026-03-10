# MetaPLM Workspace

Solopreneur ERP — CRM, Timesheet & Finance — built with Next.js 14 + Prisma + PostgreSQL.

## Stack
- **Frontend**: Next.js 14 (App Router), TailwindCSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL via Prisma ORM
- **Deploy**: Vercel (frontend + API) + Neon/Supabase (DB)

## Modules
1. **CRM** — Companies (with Magic Web Scraper), Contacts, Deals pipeline
2. **Timesheet** — Color-coded calendar, 1 Day = 8 Hours rule, billable tracking
3. **Finance** — Invoices, Expenses (#hashtag tags), P&L & cash flow dashboard

## Quick Start

### Local Development

```bash
# 1. Clone & install
npm install

# 2. Set up database
cp .env.example .env.local
# Fill in DATABASE_URL with your Neon/Supabase connection string

# 3. Push schema to DB
npm run db:push

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

**Step 1: Create a free PostgreSQL database**

Option A — [Neon](https://neon.tech) (recommended, free tier):
1. Sign up at neon.tech
2. Create a project → Copy the connection string

Option B — [Supabase](https://supabase.com) (free tier):
1. Sign up at supabase.com
2. Create project → Settings → Database → Copy connection string (use "Transaction" mode pooler URL)

**Step 2: Deploy to Vercel**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Import to Vercel
3. Add environment variable:
   - `DATABASE_URL` = your Neon/Supabase connection string
4. Deploy — Prisma will auto-run schema push during build

**Step 3: Done!** ✅

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (required) |

## Features

### CRM
- 🏢 **Magic Company Add** — Enter a URL, auto-scrapes meta description, logo (Clearbit fallback), LinkedIn
- 👤 **Contact Cards** — LinkedIn deep-link integration  
- 📊 **Pipeline Stages** — LEAD → QUALIFIED → PROPOSAL → NEGOTIATION → WON/LOST
- 🎯 **Won deals** — Automatically become billable projects in Timesheet

### Timesheet
- 📅 **Calendar View** — Click any day to log time (no stopwatch!)
- ⚡ **1 Day = 8 Hours** — Enter in days or hours, stored as hours
- 🎨 **Color coding** — Green (8h optimal), Yellow (<8h), Orange (overtime)
- 💼 **Category-based billability** — Auto-toggles, manually editable

### Finance
- 📄 **Invoices** — Multi-currency (USD/EUR/TRY), due date tracking, overdue alerts
- 💸 **Expenses** — Quick #hashtag tagging, project linking
- 📈 **P&L Dashboard** — 6-month cash flow, expense breakdown, VAT estimate
