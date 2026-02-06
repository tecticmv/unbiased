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

## License

MIT
