# Unbiased - AI Feasibility Analysis

AI-powered feasibility analysis for development projects. Get unbiased insights on infrastructure, housing, energy, and development projects.

## Stack

- **Frontend**: Vite + React 19 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **API**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 + Drizzle ORM
- **Real-time**: Cloudflare Durable Objects (WebSocket)
- **AI**: Google Gemini API
- **Hosting**: Cloudflare Workers with Static Assets

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account
- Google Gemini API key

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your GEMINI_API_KEY
```

### Development

Run two terminals for local development:

```bash
# Terminal 1: Frontend (Vite dev server with HMR)
pnpm dev

# Terminal 2: Worker (API + WebSocket + Durable Objects)
pnpm dev:worker
```

The frontend runs on `http://localhost:5173` and proxies API requests.
The worker runs on `http://localhost:8787` with full API and WebSocket support.

### Database Setup

```bash
# Create D1 database
wrangler d1 create unbiased-db

# Update wrangler.toml with the database_id

# Run migrations locally
pnpm db:migrate:local

# Run migrations in production
pnpm db:migrate
```

### Deployment

```bash
# Add Gemini API key as secret
wrangler secret put GEMINI_API_KEY

# Build and deploy to Cloudflare Workers
pnpm deploy
```

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── contexts/           # React contexts (discussion, etc.)
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities
│   ├── locales/            # i18n translations
│   └── types/              # TypeScript types
├── functions/              # Cloudflare Worker
│   ├── worker.ts           # Main entry point
│   ├── discussion-room.ts  # Durable Object for WebSocket
│   └── api/                # API routes (Hono)
├── db/                     # Database schema
├── migrations/             # D1 migrations
└── public/                 # Static assets
```

## Architecture

### Workers with Static Assets

The app uses Cloudflare Workers with Static Assets (not Pages). This allows:
- Durable Objects for real-time WebSocket connections
- Unified deployment (frontend + API + WebSocket in one worker)
- Full Workers features without separate service bindings

### Real-time Discussion

Panel discussions use WebSocket via Durable Objects:
- Each discussion room is a Durable Object instance
- Participants connect via WebSocket for real-time updates
- Messages are broadcast to all connected clients
- Graceful reconnection with exponential backoff

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model (default: gemini-2.5-flash) |
| `APP_NAME` | Application name |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Vite dev server (frontend only) |
| `pnpm dev:worker` | Start Wrangler dev server (API + WebSocket) |
| `pnpm build` | Build frontend for production |
| `pnpm deploy` | Build and deploy to Cloudflare |
| `pnpm db:migrate:local` | Run migrations on local D1 |
| `pnpm db:migrate` | Run migrations on production D1 |
| `pnpm typecheck` | Run TypeScript type checking |

## Supported Countries

- Maldives
- India
- Bangladesh
- Sri Lanka

## Automated Country Addition

The platform supports automated on-demand country additions through a fully automated pipeline:

### How It Works

1. **User Request**: Users click "Request a country" in the country selector dropdown
2. **Instant Validation**: Gemini AI validates the country immediately in the API:
   - Checks if it's a real sovereign country (rejects cities, regions, fictional places)
   - User gets instant feedback if invalid (no workflow triggered)
   - Gathers data: regions, currency, expert names, translations for all 6 languages
3. **Code Generation**: Claude AI generates code changes for 10+ files with TypeScript validation
4. **Preview Deployment**: Creates a feature branch, PR, and Cloudflare deploys a preview
5. **Owner Review**: Owner receives Telegram notification with Approve/Retry/Fix buttons
6. **Feedback Loop**: Owner can retry (auto-feedback) or provide specific feedback to re-trigger generation
7. **Go Live**: On approval, PR merges to main and country goes live

### Files Modified by Automation

- `src/lib/countries.ts` - Country configuration
- `functions/api/lib/constants.ts` - Currency and supported countries
- `src/types/index.ts` - Expert names by region
- `functions/api/experts/personas.ts` - Expert personas by region
- `src/locales/*.json` - All 6 locale files (en, dv, hi, bn, si, ta)

### Required Secrets

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | GitHub token with repo/workflow permissions |
| `GITHUB_REPO` | Repository in `owner/repo` format |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications |
| `TELEGRAM_OWNER_CHAT_ID` | Owner's Telegram chat ID (can be group ID, e.g., `-123456789`) |
| `CLAUDE_API_KEY` | Anthropic API key for code generation |
| `GEMINI_API_KEY` | Google Gemini API key for validation |
| `RESEND_API_KEY` | Resend API key for email notifications |
| `FROM_EMAIL` | Sender email (e.g., `Unbiased <noreply@yourdomain.com>`) |

### Email Notifications (Resend)

Users who provide their email when requesting a country receive:
- **Confirmation email** when their request is submitted
- **Success email** when the country goes live

Note: Workflow failures and retries are internal - only the owner is notified via Telegram. End users only hear back when their country is successfully added.

Setup:
1. Create an account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create an API key
4. Set the secrets:
   ```bash
   wrangler secret put RESEND_API_KEY
   wrangler secret put FROM_EMAIL
   ```

### Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID via [@userinfobot](https://t.me/userinfobot)
3. Set the webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-worker.workers.dev/api/country-request/webhook/telegram"
   ```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/country-request` | Submit a new country request |
| `GET /api/country-request/:id` | Get request status |
| `GET /api/country-requests` | List all requests (admin) |
| `POST /api/country-request/webhook/github` | GitHub Actions callback |
| `POST /api/country-request/webhook/telegram` | Telegram bot callback |
