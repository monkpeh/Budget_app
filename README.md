# Budget Tracker

A production-grade personal finance dashboard with Plaid bank integration, AI spending insights, and a premium dark-mode UI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BUDGET TRACKER                                  │
│                                                                          │
│  ┌─────────────────────┐          ┌─────────────────────────────────┐   │
│  │      FRONTEND        │          │            BACKEND               │   │
│  │   React + TypeScript │◄────────►│      Node.js + Express           │   │
│  │   TailwindCSS        │  REST    │      TypeScript                  │   │
│  │   React Query        │  API     │      JWT Auth (15m/7d)           │   │
│  │   Recharts           │          │      Zod Validation              │   │
│  │   Zustand            │          │      Helmet + CORS + Rate Limit  │   │
│  │   :5173              │          │      :3001                        │   │
│  └─────────────────────┘          └───────────────┬─────────────────┘   │
│                                                    │                      │
│                          ┌─────────────────────────┼──────────────┐      │
│                          │                          │              │      │
│                   ┌──────▼──────┐          ┌───────▼──────┐       │      │
│                   │  PostgreSQL  │          │    Redis      │       │      │
│                   │  :5432       │          │    :6379      │       │      │
│                   │             │          │               │       │      │
│                   │  users      │          │  rate limit   │       │      │
│                   │  accounts   │          │  cache        │       │      │
│                   │  transactions│         └───────────────┘       │      │
│                   │  budgets    │                                   │      │
│                   │  plaid_items│                                   │      │
│                   │  refresh_   │                                   │      │
│                   │  tokens     │                                   │      │
│                   └─────────────┘                                   │      │
│                                                                     │      │
└─────────────────────────────────────────────────────────────────────┘      │
                                                                             │
         ┌───────────────────────────────────────────────────────────────┐  │
         │                      PLAID (External)                          │  │
         │                                                                │  │
         │   Browser ──► Plaid Link UI ──► public_token                  │  │
         │                                      │                        │  │
         │               Backend ◄──────────────┘                        │  │
         │                  │                                             │  │
         │                  ▼                                             │  │
         │         exchange_public_token                                  │  │
         │                  │                                             │  │
         │                  ▼                                             │  │
         │         access_token (AES-256-GCM encrypted at rest)          │  │
         │                  │                                             │  │
         │      ┌───────────▼─────────────────────────────────────┐      │  │
         │      │  /transactions/sync  →  cursor-based pagination  │      │  │
         │      │  /accounts/get       →  live balances             │      │  │
         │      │  /institutions/get   →  logos & names             │      │  │
         │      │  Webhooks            →  real-time sync trigger    │      │  │
         │      └─────────────────────────────────────────────────-┘      │  │
         └───────────────────────────────────────────────────────────────┘  │
```

---

## Page Map

```
/login           Sign in
/register        Create account
/                Dashboard        ← net worth, cash flow, spending donut,
│                                   budget health, recent transactions,
│                                   AI insights preview
├── /transactions  Transaction list  ← search, filter, category edit, CSV export
├── /accounts      Accounts          ← connected + manual, sync, net worth
├── /budgets       Budgets           ← set limits, track spend, 6-month chart
├── /analytics     Analytics         ← trends, merchants, subscriptions, savings rate
├── /insights      Insights          ← health score, AI insights, projections, forecast
└── /settings      Settings          ← password, data export, account delete
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS (dark-mode first) |
| Charts | Recharts |
| State | Zustand + TanStack React Query v5 |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 (Drizzle ORM) |
| Cache | Redis 7 |
| Auth | JWT (access 15m + refresh 7d, httpOnly cookie, token rotation) |
| Security | AES-256-GCM (Plaid tokens), bcrypt, Helmet, Zod, rate limiting |
| Banking | Plaid Node SDK (sandbox → production via env var) |
| Infra | Docker Compose |

---

## How to Run

### Option A — Docker (recommended, zero setup)

```bash
# 1. Clone the repo
git clone https://github.com/monkpeh/budget_app.git
cd budget_app

# 2. Copy and fill in credentials
cp backend/.env.example backend/.env
# Open backend/.env and set your Plaid keys + secrets (see below)

# 3. Start everything
docker compose up --build

# 4. Run the database migration (first time only)
docker compose exec backend node dist/db/migrate.js
```

App is now at → **http://localhost** (frontend) and **http://localhost:3001/api** (backend)

---

### Option B — Local development (hot reload)

**Prerequisites:** Node.js 20+, PostgreSQL 16, Redis 7

```bash
# ── Backend ───────────────────────────────────────────────────────────
cd backend
cp .env.example .env        # fill in values (see env reference below)
npm install
npm run db:migrate          # creates all tables
npm run dev                 # starts on :3001 with hot reload

# ── Frontend (new terminal) ───────────────────────────────────────────
cd frontend
cp .env.example .env
npm install
npm run dev                 # starts on :5173 with HMR
```

Open → **http://localhost:5173**

---

## Plaid Setup

### Step 1 — Get Sandbox credentials (free, instant)

1. Go to **https://dashboard.plaid.com** and create an account
2. Create a new app
3. Copy your **Client ID** and **Sandbox Secret** from the dashboard

### Step 2 — Configure your `.env`

```bash
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_sandbox_secret_here
PLAID_ENV=sandbox
PLAID_WEBHOOK_URL=https://your-domain.com/api/plaid/webhook  # optional for local
```

### Step 3 — Connect a test bank account

1. Register an account in the app
2. Click **"Connect Bank"** on the Dashboard or Accounts page
3. Plaid Link will open — use these **sandbox test credentials**:

```
Institution:  Any bank shown
Username:     user_good
Password:     pass_good
MFA code:     1234  (if prompted)
```

Transactions will sync automatically after connection.

### Step 4 — Upgrade to Production Plaid

When you're ready to connect real bank accounts:

1. Complete Plaid's production application at dashboard.plaid.com
2. Get approved (typically 1–3 business days)
3. Get your Production secret
4. Update one line in `.env`:

```bash
PLAID_ENV=production           # was: sandbox
PLAID_SECRET=your_prod_secret  # was: sandbox secret
```

No code changes needed — the switch is fully env-var driven.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `3001`) |
| `NODE_ENV` | No | `development` / `production` |
| `FRONTEND_URL` | Yes | CORS origin (e.g. `http://localhost:5173`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | No | Redis URL (default: `redis://localhost:6379`) |
| `JWT_ACCESS_SECRET` | Yes | Random string, ≥ 32 chars |
| `JWT_REFRESH_SECRET` | Yes | Random string, ≥ 32 chars (different from above) |
| `JWT_ACCESS_EXPIRES_IN` | No | Token lifetime (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh lifetime (default: `7d`) |
| `ENCRYPTION_KEY` | Yes | 64-char hex string (= 32 bytes) — encrypts Plaid tokens |
| `PLAID_CLIENT_ID` | Yes | From Plaid dashboard |
| `PLAID_SECRET` | Yes | Sandbox or production secret |
| `PLAID_ENV` | Yes | `sandbox`, `development`, or `production` |
| `PLAID_WEBHOOK_URL` | No | Public URL for real-time transaction webhooks |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend URL (default: proxied via Vite to `http://localhost:3001`) |

### Generating secret values

```bash
# JWT secrets (run twice for two different values)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Encryption key (exactly 64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register with email + password |
| `POST` | `/api/auth/login` | — | Login, sets refresh token cookie |
| `POST` | `/api/auth/refresh` | cookie | Rotate refresh token, get new access token |
| `POST` | `/api/auth/logout` | Bearer | Revoke refresh token |
| `GET` | `/api/auth/me` | Bearer | Get current user |

### Plaid

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/plaid/create-link-token` | Generate Plaid Link token |
| `POST` | `/api/plaid/exchange-token` | Exchange public token → store encrypted access token |
| `POST` | `/api/plaid/sync` | Force sync all accounts |
| `POST` | `/api/plaid/webhook` | Plaid webhook (signature-verified) |

### Transactions

| Method | Endpoint | Query Params |
|---|---|---|
| `GET` | `/api/transactions` | `search`, `startDate`, `endDate`, `category`, `accountId`, `minAmount`, `maxAmount`, `page`, `limit`, `sortBy`, `sortOrder` |
| `PATCH` | `/api/transactions/:id` | — body: `userCategory`, `notes`, `tags`, `rememberCategory` |
| `POST` | `/api/transactions/export` | Downloads CSV |

### Accounts

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/accounts` | List all accounts |
| `POST` | `/api/accounts/manual` | Add a manual (non-Plaid) account |
| `DELETE` | `/api/accounts/:id` | Remove account |

### Budgets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/budgets` | List with live spend tracking |
| `POST` | `/api/budgets` | Create budget |
| `PUT` | `/api/budgets/:id` | Update budget |
| `DELETE` | `/api/budgets/:id` | Delete budget |
| `GET` | `/api/budgets/history` | 6-month budget vs actual |

### Analytics

| Method | Endpoint | Query Params |
|---|---|---|
| `GET` | `/api/analytics/spending-trends` | `months` (3/6/12) |
| `GET` | `/api/analytics/top-merchants` | — |
| `GET` | `/api/analytics/subscriptions` | — |
| `GET` | `/api/analytics/savings-rate` | — |

### Insights

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/insights/health-score` | 0–100 financial health score + grade |
| `GET` | `/api/insights/spending-insights` | AI-style spending alerts |
| `GET` | `/api/insights/net-worth-projection` | 12-month net worth forecast |
| `GET` | `/api/insights/cash-flow-forecast` | End-of-month balance projection |

### User / Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user/profile` | Get profile |
| `POST` | `/api/user/change-password` | Update password |
| `GET` | `/api/user/export?format=json\|csv` | Download full data export |
| `DELETE` | `/api/user/account` | Permanently delete account + all data |

---

## Database Schema

```
users
  id · email · password_hash · email_verified · created_at · updated_at

refresh_tokens
  id · user_id → users · token_hash · expires_at · revoked

plaid_items
  id · user_id → users · item_id · access_token_encrypted
  institution_id · institution_name · institution_logo · cursor · last_synced_at

accounts
  id · user_id → users · plaid_item_id → plaid_items
  plaid_account_id · name · official_name · type · subtype
  current_balance · available_balance · currency_code · mask
  is_manual · institution_name

transactions
  id · user_id → users · account_id → accounts
  plaid_transaction_id · name · merchant_name · amount · currency_code
  date · category[] · plaid_category_id · user_category
  tags[] · notes · pending

budgets
  id · user_id → users · category · monthly_limit · rollover

category_rules
  id · user_id → users · merchant_pattern · category
```

---

## Security Notes

- Plaid access tokens are **never stored in plaintext** — AES-256-GCM encrypted at rest
- Plaid public tokens are exchanged immediately and discarded
- Refresh tokens are stored as **SHA-256 hashes** — the raw token only lives in the httpOnly cookie
- All auth endpoints rate-limited to **10 requests / 15 minutes**
- All API endpoints validated with **Zod schemas** — no raw user input reaches the DB
- Database queries use **Drizzle ORM parameterized queries** — no SQL injection surface
- CORS locked to `FRONTEND_URL` env var — no wildcard origins
- `helmet()` sets security headers on every response

---

## Project Structure

```
budget_app/
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts                  ← Express app bootstrap
│       ├── config/
│       │   └── env.ts                ← Zod-validated env config
│       ├── db/
│       │   ├── schema.ts             ← Drizzle table definitions
│       │   ├── connection.ts         ← pg pool + Drizzle instance
│       │   ├── migrate.ts            ← migration runner
│       │   └── migrations/
│       │       └── 0001_initial.sql
│       ├── middleware/
│       │   ├── auth.ts               ← JWT Bearer verification
│       │   ├── rateLimiter.ts        ← express-rate-limit configs
│       │   └── validate.ts           ← Zod body/query validators
│       ├── services/
│       │   ├── encryption.ts         ← AES-256-GCM encrypt/decrypt
│       │   ├── tokenService.ts       ← JWT sign/verify/hash
│       │   └── plaid.ts              ← Plaid SDK wrapper
│       └── routes/
│           ├── index.ts              ← router aggregation
│           ├── auth.ts
│           ├── plaid.ts
│           ├── transactions.ts
│           ├── accounts.ts
│           ├── dashboard.ts
│           ├── budgets.ts
│           ├── analytics.ts
│           ├── insights.ts
│           └── user.ts
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                   ← routes + auth guards
        ├── index.css
        ├── lib/
        │   ├── api.ts                ← Axios instance + token refresh
        │   └── utils.ts              ← formatCurrency, cn, colors
        ├── store/
        │   └── authStore.ts          ← Zustand auth state
        ├── hooks/
        │   ├── useAuth.ts
        │   └── usePlaidLink.ts
        ├── components/
        │   ├── ui/                   ← Card, Button, Input, Skeleton, Badge, ProgressBar
        │   ├── layout/               ← AppLayout, Sidebar, MobileNav
        │   ├── dashboard/            ← NetWorthCard, CashFlowCard, SpendingDonut,
        │   │                            BudgetHealth, RecentTransactions, AccountsOverview
        │   ├── transactions/         ← TransactionTable, TransactionRow,
        │   │                            TransactionFilters, CategoryBadge
        │   ├── budgets/              ← BudgetCard, BudgetModal
        │   ├── plaid/                ← ConnectBankButton
        │   └── insights/             ← HealthScore, SpendingInsights,
        │                                NetWorthProjection, CashFlowForecast
        └── pages/
            ├── auth/                 ← LoginPage, RegisterPage
            ├── DashboardPage.tsx
            ├── TransactionsPage.tsx
            ├── AccountsPage.tsx
            ├── BudgetsPage.tsx
            ├── AnalyticsPage.tsx
            ├── InsightsPage.tsx
            └── SettingsPage.tsx
```

---

## Common Issues

**Docker port already in use**
```bash
# Find what's using port 5432 (postgres)
lsof -i :5432
# Then either stop that process or change the port in docker-compose.yml
```

**Plaid Link doesn't open**
- Make sure `PLAID_CLIENT_ID` and `PLAID_SECRET` are set and the backend is running
- Check browser console — the `/api/plaid/create-link-token` call will show the error

**"Invalid environment variables" on backend start**
- All required env vars must be set — check `backend/.env` against `.env.example`
- `ENCRYPTION_KEY` must be exactly 64 hex chars (32 bytes)
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be ≥ 32 chars

**Transactions not showing after connecting bank**
- In sandbox mode, sync can take a few seconds — click **Sync** on the dashboard
- Check backend logs for Plaid API errors

**Database migration fails**
```bash
# Ensure PostgreSQL is running and DATABASE_URL is correct, then:
cd backend && npm run db:migrate
```
