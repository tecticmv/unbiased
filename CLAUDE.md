# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unbiased is an AI-powered feasibility analysis platform for development projects. Users submit project descriptions and receive comprehensive feasibility reports with scores across multiple categories (technical, economic, environmental, social, legal, operational). Reports can be discussed in real-time panel discussions with AI expert personas.

**📚 For complete development documentation, see [DEVELOPMENT.md](DEVELOPMENT.md)**

## Quick Reference

```bash
# Install dependencies
pnpm install

# Development (run both in separate terminals)
pnpm dev              # Frontend: Vite on localhost:5173
pnpm dev:worker       # Backend: Wrangler on localhost:8787

# Build and deploy
pnpm build            # Build frontend to dist/
pnpm deploy           # Build + deploy to Cloudflare Workers

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate:local # Apply migrations to local D1
pnpm db:migrate       # Apply migrations to production D1
pnpm db:studio        # Open Drizzle Studio

# Code quality
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint
```

## Architecture

### Frontend-Backend Split
- **Frontend** (`src/`): React 19 SPA built with Vite, served as static assets
- **Backend** (`functions/`): Cloudflare Worker handling API + WebSocket

The Vite dev server proxies `/api/*` to the Wrangler dev server (port 8788).

### API Structure (`functions/api/`)
- Routes are modular Hono apps in `routes/` mounted on `/api`
- Core routes: `analysis.ts` (AI feasibility analysis), `reports.ts` (CRUD), `discussion.ts` (panel discussions), `websocket.ts` (real-time)
- Shared utilities in `lib/`: Gemini client, validation, slug generation

### Real-time Discussion System
- `DiscussionRoom` Durable Object (`functions/discussion-room.ts`) manages WebSocket connections per discussion
- `DiscussionContext` (`src/contexts/discussion-context.tsx`) handles client-side WebSocket, reconnection with exponential backoff, message deduplication, and silent background sync
- SSE streaming for AI responses with typing indicators

### AI Expert Personas
- Six domain experts + moderator defined in `src/types/index.ts`
- Expert routing logic in `functions/api/experts/routing.ts`
- Persona prompts in `functions/api/experts/prompts.ts`
- Region-specific names (Maldives, India, Bangladesh, Sri Lanka)

### Database Schema (`db/schema.ts`)
- `reports`: Feasibility reports with translations
- `panelDiscussions`, `discussionMessages`, `discussionParticipants`: Discussion system
- `jobs`: Unified job tracking for async operations (analysis, translations)
- `discussionTranslations`: Cached translations

## Path Aliases

```typescript
@/*    → ./src/*      // Frontend code
@db/*  → ./db/*       // Database schema
```

## Key Configuration

- `wrangler.toml`: Worker config, D1 binding, Durable Objects
- `vite.config.ts`: Build chunks, API proxy to port 8788
- `drizzle.config.ts`: D1 connection for migrations

## Environment Variables

Required in `.dev.vars` (local) or Cloudflare secrets (production):
- `GEMINI_API_KEY`: Google Gemini API key

Configured in `wrangler.toml`:
- `GEMINI_MODEL`: Model to use (default: gemini-2.5-flash)
- `APP_NAME`: Application name
