# 🛠️ Development Guide

Developer documentation for contributing to and self-hosting Unbiased.

---

## 📚 Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development Setup](#development-setup)
- [Database Setup](#database-setup)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Automated Country Addition](#automated-country-addition)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

---

## 🎯 Tech Stack

### Frontend
- **Framework**: Vite + React 19 + TypeScript
- **UI Library**: Tailwind CSS + shadcn/ui
- **Routing**: React Router v7
- **State Management**: React Contexts (discussion, etc.)
- **i18n**: i18next with 6 languages
- **Animation**: Framer Motion

### Backend
- **API Framework**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Real-time**: Cloudflare Durable Objects (WebSocket)
- **AI Models**: Google Gemini API (analysis & translation)
- **Code Generation**: Anthropic Claude API
- **Hosting**: Cloudflare Workers with Static Assets

### Key Benefits of This Stack

✅ **Global Edge Deployment** - Low latency worldwide via Cloudflare
✅ **Real-time Capable** - WebSocket + SSE streaming for live discussions
✅ **Type-Safe End-to-End** - TypeScript + Drizzle for full type safety
✅ **Cost-Efficient** - Serverless pricing, pay-per-use
✅ **Fast Iteration** - Hot reload on both frontend and backend
✅ **Scalable by Default** - Workers auto-scale, D1 replicates automatically

---

## 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** ([Install](https://pnpm.io/installation))
- **Cloudflare Account** ([Sign up](https://dash.cloudflare.com/sign-up))
- **Google Gemini API Key** ([Get key](https://aistudio.google.com/app/apikey))
- **Git** for version control

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/unbiased.git
cd unbiased

# Install dependencies
pnpm install

# Set up environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your GEMINI_API_KEY
```

---

## 💻 Development Setup

### Local Development

Run **two terminals** for full local development:

**Terminal 1: Frontend (Vite dev server with HMR)**
```bash
pnpm dev
```
- Runs on `http://localhost:5173`
- Hot module replacement enabled
- Proxies API requests to worker

**Terminal 2: Worker (API + WebSocket + Durable Objects)**
```bash
pnpm dev:worker
```
- Runs on `http://localhost:8787`
- Full API and WebSocket support
- Persists state to `.wrangler/state`

### Development Workflow

1. **Frontend changes** - Edit files in `src/`, Vite hot-reloads instantly
2. **API changes** - Edit files in `functions/`, Wrangler restarts automatically
3. **Database changes** - See [Database Setup](#database-setup)
4. **Type checking** - Run `pnpm typecheck` before committing

---

## 🗄️ Database Setup

### Local Database

```bash
# Create D1 database locally (auto-created by dev:worker)
pnpm dev:worker

# Generate migration from schema changes
pnpm db:generate

# Apply migrations locally
pnpm db:migrate:local

# Open Drizzle Studio to view/edit data
pnpm db:studio
```

### Production Database

```bash
# Create production D1 database
wrangler d1 create unbiased-db

# Copy the database_id from output and add to wrangler.toml:
# [[d1_databases]]
# binding = "DB"
# database_name = "unbiased-db"
# database_id = "your-database-id-here"

# Apply migrations to production
pnpm db:migrate
```

### Database Schema

Located in `db/schema.ts`:
- **reports** - Feasibility reports with translations
- **panelDiscussions** - Discussion metadata
- **discussionMessages** - Chat messages
- **discussionParticipants** - Presence tracking
- **jobs** - Unified job tracking (analysis, translations)
- **discussionTranslations** - Cached translations
- **countryRequests** - Automated country addition tracking

---

## 🏗️ Architecture

### Workers with Static Assets

Uses **Cloudflare Workers with Static Assets** (not Pages):
- Durable Objects for real-time WebSocket connections
- Unified deployment (frontend + API + WebSocket in one worker)
- Full Workers features without separate service bindings

### Frontend-Backend Split

- **Frontend** (`src/`): React 19 SPA built with Vite, served as static assets
- **Backend** (`functions/`): Cloudflare Worker handling API + WebSocket
- **Proxy**: Vite dev server proxies `/api/*` to Wrangler dev server (port 8787)

### API Structure

Routes are modular Hono apps in `functions/api/routes/` mounted on `/api`:

- **analysis.ts** - AI feasibility analysis with streaming
- **reports.ts** - CRUD operations for reports
- **discussion.ts** - Panel discussion management
- **websocket.ts** - WebSocket upgrade handler
- **translation.ts** - On-demand translation with caching
- **country-request.ts** - Automated country addition workflow

Shared utilities in `functions/api/lib/`:
- **gemini.ts** - Gemini client with retry logic
- **validation.ts** - Zod schemas
- **slug-generator.ts** - Unique slug generation
- **job-utils.ts** - Job deduplication and tracking

### Real-time Discussion System

**Durable Objects for WebSocket:**
- `DiscussionRoom` class (`functions/discussion-room.ts`) manages connections per discussion
- Each discussion room is a Durable Object instance
- Participants connect via WebSocket for real-time updates
- Messages broadcast to all connected clients

**Client-side WebSocket Management:**
- `DiscussionContext` (`src/contexts/discussion-context.tsx`) handles:
  - Connection lifecycle
  - Reconnection with exponential backoff
  - Message deduplication
  - Silent background sync
  - Typing indicators

**SSE Streaming:**
- AI responses stream via Server-Sent Events
- Typing indicators show which expert is "thinking"
- Graceful fallback to polling if SSE unavailable

### AI Expert Personas

**6 Domain Experts + Moderator:**

Defined in `src/types/index.ts` and `functions/api/experts/personas.ts`:
- Each expert has unique `focusAreas`, `personalityTraits`, `speakingStyle`
- Region-specific names (Maldives, India, Bangladesh, Sri Lanka, default)
- Expert routing logic in `functions/api/experts/routing.ts`
- Persona prompts in `functions/api/experts/prompts.ts`

---

## 📁 Project Structure

```
unbiased/
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── analysis-form.tsx     # Project submission form
│   │   ├── report-viewer.tsx     # Report display
│   │   ├── discussion-panel.tsx  # Real-time chat
│   │   └── language-switcher.tsx # i18n controls
│   ├── contexts/                 # React contexts
│   │   └── discussion-context.tsx # WebSocket management
│   ├── pages/                    # Route pages
│   │   ├── home.tsx              # Landing page
│   │   ├── report.tsx            # Report view
│   │   └── discussion.tsx        # Discussion view
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities
│   │   ├── countries.ts          # Country configuration
│   │   └── api.ts                # API client
│   ├── locales/                  # i18n translations
│   │   ├── en.json               # English
│   │   ├── dv.json               # Dhivehi
│   │   ├── hi.json               # Hindi
│   │   ├── bn.json               # Bengali
│   │   ├── si.json               # Sinhala
│   │   └── ta.json               # Tamil
│   ├── types/                    # TypeScript types
│   │   └── index.ts              # Expert personas, types
│   └── i18n.ts                   # i18next setup
├── functions/                    # Cloudflare Worker
│   ├── worker.ts                 # Main entry point
│   ├── discussion-room.ts        # Durable Object for WebSocket
│   └── api/                      # API routes (Hono)
│       ├── routes/               # Route handlers
│       │   ├── analysis.ts       # Feasibility analysis
│       │   ├── reports.ts        # Report CRUD
│       │   ├── discussion.ts     # Discussion management
│       │   ├── websocket.ts      # WebSocket upgrade
│       │   ├── translation.ts    # On-demand translation
│       │   └── country-request.ts # Automated country addition
│       ├── lib/                  # Shared utilities
│       │   ├── gemini.ts         # Gemini client
│       │   ├── constants.ts      # Country currencies, languages
│       │   ├── validation.ts     # Zod schemas
│       │   ├── job-utils.ts      # Job tracking
│       │   └── translation-utils.ts # Translation parsing
│       └── experts/              # Expert persona logic
│           ├── personas.ts       # Expert definitions
│           ├── prompts.ts        # System prompts
│           └── routing.ts        # Expert selection
├── db/                           # Database schema
│   └── schema.ts                 # Drizzle schema
├── migrations/                   # D1 migrations
├── public/                       # Static assets
├── .github/                      # GitHub Actions
│   └── workflows/
│       └── add-country.yml       # Automated country addition
├── wrangler.toml                 # Worker configuration
├── vite.config.ts                # Vite configuration
├── drizzle.config.ts             # Drizzle configuration
├── CLAUDE.md                     # Claude Code instructions
├── README.md                     # User documentation
└── DEVELOPMENT.md                # This file
```

### Path Aliases

Configured in `vite.config.ts` and `tsconfig.json`:

```typescript
@/*    → ./src/*      // Frontend code
@db/*  → ./db/*       // Database schema
```

---

## 🔐 Environment Variables

### Required (`.dev.vars` for local, Cloudflare secrets for production)

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ Yes |
| `GEMINI_MODEL` | Gemini model (default: `gemini-2.5-flash`) | No |
| `APP_NAME` | Application name | No |

### For Automated Country Addition

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub token with repo/workflow permissions | For automation |
| `GITHUB_REPO` | Repository in `owner/repo` format | For automation |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications | For automation |
| `TELEGRAM_OWNER_CHAT_ID` | Owner's Telegram chat ID | For automation |
| `CLAUDE_API_KEY` | Anthropic API key for code generation | For automation |
| `RESEND_API_KEY` | Resend API key for email notifications | Optional |
| `FROM_EMAIL` | Sender email (e.g., `Unbiased <noreply@yourdomain.com>`) | Optional |
| `WORKER_URL` | Production worker URL for webhooks | For automation |

### Setting Secrets

**Local development:**
```bash
# Add to .dev.vars file
GEMINI_API_KEY=your-api-key-here
```

**Production:**
```bash
# Using Wrangler CLI
wrangler secret put GEMINI_API_KEY
wrangler secret put GITHUB_TOKEN
wrangler secret put TELEGRAM_BOT_TOKEN
# etc.
```

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Vite dev server (frontend only) |
| `pnpm dev:worker` | Start Wrangler dev server (API + WebSocket) |
| `pnpm build` | Build frontend for production |
| `pnpm preview` | Preview production build locally |
| `pnpm deploy` | Build and deploy to Cloudflare |
| `pnpm db:generate` | Generate Drizzle migrations from schema changes |
| `pnpm db:migrate:local` | Apply migrations to local D1 database |
| `pnpm db:migrate` | Apply migrations to production D1 database |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |

---

## 🤖 Automated Country Addition

### Overview

The platform supports **fully automated on-demand country additions** through an AI-powered pipeline:

1. User requests a country
2. Gemini AI validates it's a real sovereign country
3. Claude AI generates code for 10+ files
4. GitHub Actions creates PR with Cloudflare preview
5. Owner reviews via Telegram and approves/requests fixes
6. PR merges automatically and goes live
7. Requester receives email notification

### Setup Instructions

#### 1. Create GitHub Personal Access Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click "Generate new token"
3. Configure:
   - **Name**: `unbiased-country-automation`
   - **Expiration**: 1 year (or custom)
   - **Repository access**: Only select repositories → Choose your repo
   - **Permissions**:
     - Contents: Read and write
     - Pull requests: Read and write
     - Workflows: Read and write
4. Generate and copy the token

#### 2. Set GitHub Secrets

Add to Cloudflare Worker secrets:
```bash
wrangler secret put GITHUB_TOKEN
# Paste your GitHub token

wrangler secret put GITHUB_REPO
# Enter: yourusername/unbiased
```

#### 3. Set Up Telegram Bot

**Create Bot:**
```bash
# 1. Message @BotFather on Telegram
/newbot
# Follow prompts, get bot token

# 2. Get your chat ID from @userinfobot
# Message @userinfobot, it replies with your chat ID

# 3. Set secrets
wrangler secret put TELEGRAM_BOT_TOKEN
# Paste bot token

wrangler secret put TELEGRAM_OWNER_CHAT_ID
# Paste your chat ID (or group chat ID like -123456789)
```

**Set Webhook:**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-worker.workers.dev/api/country-request/webhook/telegram"
```

#### 4. Set Up Claude API

```bash
wrangler secret put CLAUDE_API_KEY
# Get from https://console.anthropic.com/settings/keys
```

#### 5. Set Up Email Notifications (Optional)

Using [Resend](https://resend.com):

1. Create account at resend.com
2. Add and verify your domain
3. Create API key
4. Set secrets:
```bash
wrangler secret put RESEND_API_KEY
wrangler secret put FROM_EMAIL
# Example: Unbiased <noreply@yourdomain.com>
```

#### 6. Set Worker URL

```bash
wrangler secret put WORKER_URL
# Example: https://unbiased.your-subdomain.workers.dev
```

### Workflow Details

The GitHub Actions workflow (`.github/workflows/add-country.yml`) performs:

1. **Validation**: Checks country doesn't already exist
2. **Code Generation**: Claude reads 12 files and generates complete updated versions
3. **Self-Healing**: Runs TypeScript checks and builds with 3 retry attempts
4. **Error Feedback**: Feeds errors back to Claude for automatic fixing
5. **PR Creation**: Creates pull request with summary
6. **Preview Deployment**: Waits for Cloudflare Pages preview
7. **Telegram Notification**: Sends preview link to owner with action buttons

### Files Modified by Automation

- `src/lib/countries.ts` - Country configuration
- `functions/api/lib/constants.ts` - Currency mappings, supported countries
- `src/types/index.ts` - Expert names by region (TypeScript types)
- `functions/api/experts/personas.ts` - Expert personas by region
- `src/i18n.ts` - Language configuration (if needed)
- `src/locales/en.json` - English translations
- `src/locales/dv.json` - Dhivehi translations
- `src/locales/hi.json` - Hindi translations
- `src/locales/bn.json` - Bengali translations
- `src/locales/si.json` - Sinhala translations
- `src/locales/ta.json` - Tamil translations

---

## 📡 API Documentation

### Core Endpoints

#### Analysis

```bash
POST /api/analysis
Content-Type: application/json

{
  "country": "maldives",
  "projectDescription": "Build a solar farm...",
  "location": "Addu City",
  "estimatedCost": 5000000
}

# Returns: Streaming response with feasibility analysis
```

#### Reports

```bash
# Get report by slug
GET /api/reports/:slug

# List all reports for a country
GET /api/reports?country=maldives
```

#### Translation

```bash
# Translate report
GET /api/translation/report/:slug/translate/:lang
# lang: dv, hi, bn, si, ta

# Translate discussion
GET /api/translation/discussion/:slug/translate/:lang

# Check translation status
GET /api/translation/status/:type/:slug/:lang
# type: report | discussion
```

#### Discussion

```bash
# Start discussion
POST /api/discussion/:reportSlug

# Send message
POST /api/discussion/:reportSlug/messages
{
  "content": "What about environmental impact?",
  "participantName": "User"
}

# Get discussion
GET /api/discussion/:reportSlug

# WebSocket connection
GET /api/discussion/:reportSlug/ws
# Upgrade to WebSocket
```

#### Country Request

```bash
# Submit country request
POST /api/country-request
{
  "countryName": "Japan",
  "requesterName": "John Doe",
  "requesterEmail": "john@example.com"
}

# Get request status
GET /api/country-request/:id

# List all requests (admin)
GET /api/country-requests
```

### WebSocket Protocol

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:8787/api/discussion/my-report-slug/ws');
```

**Messages:**
```javascript
// Heartbeat (keep connection alive)
{ type: 'heartbeat' }

// New message from participant
{
  type: 'message',
  data: {
    id: 123,
    participantType: 'ai_economist',
    participantName: 'Dr. Aishath Laila',
    content: 'From an economic standpoint...',
    createdAt: '2024-01-01T00:00:00Z'
  }
}

// Typing indicator
{
  type: 'typing',
  data: {
    participantType: 'ai_engineer',
    participantName: 'Ahmed Nazim',
    isTyping: true
  }
}
```

---

## 🚀 Deployment

### Initial Deployment

```bash
# 1. Build frontend
pnpm build

# 2. Set up production secrets
wrangler secret put GEMINI_API_KEY
# Add other secrets as needed

# 3. Deploy to Cloudflare Workers
wrangler deploy

# 4. Set up production database
wrangler d1 create unbiased-db
# Copy database_id to wrangler.toml

# 5. Run migrations
pnpm db:migrate
```

### Continuous Deployment

**Option 1: Manual**
```bash
pnpm deploy
```

**Option 2: GitHub Actions (recommended)**

Add `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install
      - run: pnpm build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Environment-specific Configuration

Use `wrangler.toml` environments:

```toml
[env.staging]
name = "unbiased-staging"

[env.production]
name = "unbiased"
```

Deploy to specific environment:
```bash
wrangler deploy --env staging
wrangler deploy --env production
```

---

## 🧪 Testing

*(To be implemented)*

Recommended testing setup:
- **Unit tests**: Vitest for utilities and components
- **Integration tests**: Playwright for E2E
- **API tests**: Hono's built-in testing utilities

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run type checking: `pnpm typecheck`
5. Run linting: `pnpm lint`
6. Commit with conventional commits: `git commit -m "feat: add my feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 🐛 Troubleshooting

### Common Issues

**Issue: Vite can't proxy to worker**
```bash
# Make sure worker is running on port 8787
pnpm dev:worker

# Check vite.config.ts proxy configuration
```

**Issue: Database migrations fail**
```bash
# Reset local database
rm -rf .wrangler/state
pnpm dev:worker
pnpm db:migrate:local
```

**Issue: WebSocket connection fails**
```bash
# Check Durable Objects are enabled in wrangler.toml
# Ensure you're connecting to the correct URL
```

**Issue: Translation not working**
```bash
# Check GEMINI_API_KEY is set
wrangler secret list

# Check API quota limits
```

---

## 📚 Additional Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Gemini API Reference](https://ai.google.dev/api)
- [Anthropic Claude API](https://docs.anthropic.com/)

---

## 📄 License

[Add your license here]

---

**Questions?** Open an issue or discussion on GitHub!
