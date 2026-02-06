/**
 * WebSocket endpoints for real-time discussion updates
 */

import { Hono } from "hono";
import type { HonoEnv, Bindings } from "../lib/types";

const websocketRoutes = new Hono<HonoEnv>();

// WebSocket endpoint for real-time discussion updates
websocketRoutes.get("/discussion/:slug/ws", async (c) => {
  const slug = c.req.param("slug");
  const sessionId = c.req.query("sessionId");
  const name = c.req.query("name");

  if (!sessionId || !name) {
    return c.json({ error: "Missing sessionId or name" }, 400);
  }

  // Use service binding to DO worker (production) or direct DO binding
  if (c.env.DO_SERVICE) {
    // Proxy to the DO service worker
    const url = new URL(c.req.url);
    url.pathname = `/room/${slug}/ws`;
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("name", name);
    url.searchParams.set("slug", slug);

    return c.env.DO_SERVICE.fetch(url.toString(), {
      headers: c.req.raw.headers,
    });
  }

  if (c.env.DISCUSSION_ROOM) {
    // Direct DO binding
    const id = c.env.DISCUSSION_ROOM.idFromName(slug);
    const stub = c.env.DISCUSSION_ROOM.get(id);

    const url = new URL(c.req.url);
    url.pathname = "/ws";  // DO expects path ending with /ws
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("name", name);

    return stub.fetch(url.toString(), {
      headers: c.req.raw.headers,
    });
  }

  return c.json({ error: "WebSocket not available" }, 503);
});

// Get participants from WebSocket room (fallback for HTTP clients)
websocketRoutes.get("/discussion/:slug/ws-participants", async (c) => {
  const slug = c.req.param("slug");

  try {
    if (c.env.DO_SERVICE) {
      // Use service binding
      const response = await c.env.DO_SERVICE.fetch(`https://internal/room/${slug}/participants`);
      return new Response(response.body, {
        headers: { "Content-Type": "application/json" },
      });
    } else if (c.env.DISCUSSION_ROOM) {
      // Direct DO binding
      const id = c.env.DISCUSSION_ROOM.idFromName(slug);
      const stub = c.env.DISCUSSION_ROOM.get(id);
      const response = await stub.fetch("https://internal/participants");
      return new Response(response.body, {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Error getting WS participants:", err);
  }

  return c.json({ participants: [] });
});

/**
 * Helper function to broadcast message to WebSocket room
 */
export async function broadcastToRoom(
  env: Bindings,
  slug: string,
  message: Record<string, unknown>
): Promise<void> {
  try {
    if (env.DO_SERVICE) {
      // Use service binding
      await env.DO_SERVICE.fetch(`https://internal/room/${slug}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
    } else if (env.DISCUSSION_ROOM) {
      // Direct DO binding
      const id = env.DISCUSSION_ROOM.idFromName(slug);
      const stub = env.DISCUSSION_ROOM.get(id);
      await stub.fetch("https://internal/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
    }
  } catch (err) {
    console.error("Error broadcasting to room:", err);
  }
}

export { websocketRoutes };
