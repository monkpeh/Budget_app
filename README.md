# Budget Tracker

A production-grade personal finance dashboard with Plaid bank integration.

## Stack

- **Backend**: Node.js + Express + TypeScript, Drizzle ORM, PostgreSQL, Redis
- **Frontend**: React + TypeScript, TailwindCSS, React Query, Recharts
- **Auth**: JWT with refresh token rotation (httpOnly cookies)
- **Security**: AES-256-GCM encrypted Plaid tokens, Zod validation, rate limiting, Helmet

---

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env with your Plaid credentials and secrets

# 2. Run migrations
docker compose run --rm backend node dist/db/migrate.js

# 3. Start everything
docker compose up
```

App available at http://localhost (frontend) and http://localhost:3001 (API).

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7

### Backend

```bash
cd backend
cp .env.example .env    # fill in values
npm install
npm run db:migrate
npm run dev             # runs on :3001
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev             # runs on :5173
```

---

## Plaid Setup

1. Sign up at https://dashboard.plaid.com
2. Create a new app → copy **Client ID** and **Sandbox Secret**
3. Set in `backend/.env`:
   ```
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_sandbox_secret
   PLAID_ENV=sandbox
   ```
4. In Plaid dashboard, add `http://localhost:3001/api/plaid/webhook` as a webhook URL
5. Use sandbox test credentials to connect accounts:
   - Username: `user_good`
   - Password: `pass_good`

### Upgrading to Production Plaid

1. Complete Plaid's production application process
2. Get your Production secret from the Plaid dashboard
3. Change in `.env`:
   ```
   PLAID_ENV=production
   PLAID_SECRET=your_production_secret
   ```

---

## Environment Variables Reference

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port (default: 3001) | No |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | No |
| `JWT_ACCESS_SECRET` | Secret for access tokens (≥32 chars) | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (≥32 chars) | Yes |
| `ENCRYPTION_KEY` | AES-256 key as 64-char hex string | Yes |
| `PLAID_CLIENT_ID` | Plaid app client ID | Yes |
| `PLAID_SECRET` | Plaid secret (sandbox or production) | Yes |
| `PLAID_ENV` | `sandbox`, `development`, or `production` | Yes |
| `PLAID_WEBHOOK_URL` | Public URL for Plaid webhooks | No |
| `FRONTEND_URL` | Allowed CORS origin | Yes |

### Generating an ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Plaid
| Method | Route | Description |
|---|---|---|
| POST | `/api/plaid/create-link-token` | Get Plaid Link token |
| POST | `/api/plaid/exchange-token` | Exchange public token |
| POST | `/api/plaid/sync` | Manually sync all accounts |
| POST | `/api/plaid/webhook` | Plaid webhook handler |

### Transactions
| Method | Route | Description |
|---|---|---|
| GET | `/api/transactions` | List with filters/pagination |
| PATCH | `/api/transactions/:id` | Update category/notes/tags |
| POST | `/api/transactions/export` | Download CSV |

### Accounts
| Method | Route | Description |
|---|---|---|
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts/manual` | Add manual account |
| DELETE | `/api/accounts/:id` | Remove account |

### Dashboard
| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard` | Full dashboard data |

---

## Phase 2 (coming next)

- Budget management (set, track, rollover, alerts)
- Analytics (spending trends, merchant analysis, subscription detector)
- Accounts detail page with investment holdings
- Full mobile nav and responsive polish
- Notification preferences
