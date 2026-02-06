/**
 * Presence tracking endpoints for discussions
 */

import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, gt, lt } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { panelDiscussions, discussionParticipants, discussionMessages } from "../../../db/schema";
import type { HonoEnv } from "../lib/types";
import { HEARTBEAT_TIMEOUT_MS } from "../lib/constants";

const presenceRoutes = new Hono<HonoEnv>();

// Join discussion (register presence)
const joinDiscussionSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().min(1).max(50),
});

presenceRoutes.post("/discussion/:slug/join", zValidator("json", joinDiscussionSchema), async (c) => {
  const slug = c.req.param("slug");
  const { sessionId, name } = c.req.valid("json");
  const db = drizzle(c.env.DB);

  // Get discussion
  const discussionResult = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, slug))
    .limit(1);

  if (discussionResult.length === 0) {
    return c.json({ error: "Discussion not found" }, 404);
  }

  const discussion = discussionResult[0];
  const now = new Date().toISOString();

  // Check if participant already exists (by sessionId)
  const existingParticipant = await db
    .select()
    .from(discussionParticipants)
    .where(eq(discussionParticipants.sessionId, sessionId))
    .limit(1);

  if (existingParticipant.length > 0) {
    // Update heartbeat and name
    await db
      .update(discussionParticipants)
      .set({ lastHeartbeat: now, name })
      .where(eq(discussionParticipants.sessionId, sessionId));

    return c.json({
      participantId: existingParticipant[0]!.id,
      sessionId,
      rejoined: true
    });
  }

  // Create new participant
  const newParticipant = await db
    .insert(discussionParticipants)
    .values({
      discussionId: discussion!.id,
      sessionId,
      name,
      lastHeartbeat: now,
      joinedAt: now,
    })
    .returning();

  return c.json({
    participantId: newParticipant[0]!.id,
    sessionId,
    rejoined: false
  });
});

// Heartbeat (keep presence alive)
const heartbeatSchema = z.object({
  sessionId: z.string().min(1),
});

presenceRoutes.post("/discussion/:slug/heartbeat", zValidator("json", heartbeatSchema), async (c) => {
  const { sessionId } = c.req.valid("json");
  const db = drizzle(c.env.DB);

  const now = new Date().toISOString();

  // Update heartbeat
  const result = await db
    .update(discussionParticipants)
    .set({ lastHeartbeat: now })
    .where(eq(discussionParticipants.sessionId, sessionId))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Participant not found" }, 404);
  }

  return c.json({ success: true, lastHeartbeat: now });
});

// Leave discussion (explicit departure)
presenceRoutes.post("/discussion/:slug/leave", zValidator("json", heartbeatSchema), async (c) => {
  const { sessionId } = c.req.valid("json");
  const db = drizzle(c.env.DB);

  await db
    .delete(discussionParticipants)
    .where(eq(discussionParticipants.sessionId, sessionId));

  return c.json({ success: true });
});

// Get active participants in a discussion
presenceRoutes.get("/discussion/:slug/participants", async (c) => {
  const slug = c.req.param("slug");
  const db = drizzle(c.env.DB);

  // Get discussion
  const discussionResult = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, slug))
    .limit(1);

  if (discussionResult.length === 0) {
    return c.json({ error: "Discussion not found" }, 404);
  }

  const discussion = discussionResult[0];
  const cutoffTime = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS).toISOString();

  // Get active participants (heartbeat within timeout)
  const participants = await db
    .select()
    .from(discussionParticipants)
    .where(
      and(
        eq(discussionParticipants.discussionId, discussion!.id),
        gt(discussionParticipants.lastHeartbeat, cutoffTime)
      )
    );

  // Clean up stale participants (optional, runs in background)
  db.delete(discussionParticipants)
    .where(
      and(
        eq(discussionParticipants.discussionId, discussion!.id),
        lt(discussionParticipants.lastHeartbeat, cutoffTime)
      )
    )
    .execute()
    .catch(() => {}); // Fire and forget

  return c.json({
    participants: participants.map((p) => ({
      id: p.sessionId,
      name: p.name,
      isOnline: true,
      joinedAt: p.joinedAt,
    })),
  });
});

// Poll for updates (messages since a given ID)
presenceRoutes.get("/discussion/:slug/poll", async (c) => {
  const slug = c.req.param("slug");
  const sinceId = parseInt(c.req.query("sinceId") || "0", 10);
  const db = drizzle(c.env.DB);

  // Get discussion
  const discussionResult = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, slug))
    .limit(1);

  if (discussionResult.length === 0) {
    return c.json({ error: "Discussion not found" }, 404);
  }

  const discussion = discussionResult[0]!;

  // Get messages newer than sinceId
  const messages = await db
    .select()
    .from(discussionMessages)
    .where(
      and(
        eq(discussionMessages.discussionId, discussion.id),
        gt(discussionMessages.id, sinceId)
      )
    )
    .orderBy(discussionMessages.createdAt);

  // Get active participants
  const cutoffTime = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS).toISOString();
  const participants = await db
    .select()
    .from(discussionParticipants)
    .where(
      and(
        eq(discussionParticipants.discussionId, discussion.id),
        gt(discussionParticipants.lastHeartbeat, cutoffTime)
      )
    );

  return c.json({
    messages: messages.map((m) => ({
      id: m.id,
      discussionId: m.discussionId,
      participantType: m.participantType,
      participantName: m.participantName,
      content: m.content,
      replyToId: m.replyToId,
      metadata: m.metadata,
      createdAt: m.createdAt,
    })),
    participants: participants.map((p) => ({
      id: p.sessionId,
      name: p.name,
      isOnline: true,
      joinedAt: p.joinedAt,
    })),
    discussionStatus: discussion.status,
  });
});

export { presenceRoutes };
