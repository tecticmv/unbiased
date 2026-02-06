/**
 * Unified Worker Entry Point
 * Combines API routes (Hono), static assets, and Durable Objects for WebSocket support
 */

// Re-export the Durable Object class
export { DiscussionRoom } from "./discussion-room";

// Import the Hono app
import apiApp from "./api/[[route]]";

interface Env {
  ASSETS: { fetch: typeof fetch };
  DB: D1Database;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  APP_NAME: string;
  DISCUSSION_ROOM?: DurableObjectNamespace;
  DO_SERVICE?: Fetcher;
}

// Export the default fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route API requests to Hono
    if (url.pathname.startsWith("/api/")) {
      return apiApp.fetch(request, env, ctx);
    }

    // For all other requests, serve static assets
    // The ASSETS binding handles SPA fallback via not_found_handling config
    return env.ASSETS.fetch(request);
  }
};
