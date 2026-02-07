/**
 * Panel discussion endpoints
 */

import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc, gt, and } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { reports, panelDiscussions, discussionMessages } from "../../../db/schema";
import type { HonoEnv } from "../lib/types";
import { getExpertPersona, type ExpertType } from "../experts/personas";
import { buildExpertPrompt, buildAutoDiscussPrompt } from "../experts/prompts";
import { selectRespondingExperts } from "../experts/routing";
import { broadcastToRoom } from "./websocket";

const discussionRoutes = new Hono<HonoEnv>();

// Start or get existing discussion for a report
const startDiscussionSchema = z.object({
  reportSlug: z.string(),
});

discussionRoutes.post("/discussion/start", zValidator("json", startDiscussionSchema), async (c) => {
  const { reportSlug } = c.req.valid("json");
  const db = drizzle(c.env.DB);

  // Check if report exists
  const reportResult = await db
    .select()
    .from(reports)
    .where(eq(reports.slug, reportSlug))
    .limit(1);

  if (reportResult.length === 0) {
    return c.json({ error: "Report not found" }, 404);
  }

  // Check if discussion already exists
  const existingDiscussion = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, reportSlug))
    .limit(1);

  if (existingDiscussion.length > 0) {
    const existing = existingDiscussion[0]!;
    return c.json({
      discussionId: existing.id,
      status: existing.status,
      startedAt: existing.startedAt,
      isExisting: true,
    });
  }

  // Create new discussion
  const newDiscussion = await db
    .insert(panelDiscussions)
    .values({
      reportSlug,
      status: "active",
    })
    .returning();

  const created = newDiscussion[0]!;

  // Add welcome message from the moderator
  const reportData = reportResult[0]!;
  const report = reportData.report as Record<string, unknown> | undefined;
  const projectType = report?.detectedProjectType || "project";
  const overallScore = report?.overallScore || "N/A";
  const location = (report?.location as { specified?: string })?.specified || "the specified location";
  const moderator = getExpertPersona("ai_moderator", reportData.country);

  const welcomeMessage = `Welcome to the Panel Discussion for this ${projectType} analysis!

This project has received an overall feasibility score of **${overallScore}/100** for ${location}.

Our expert panel is ready to discuss the findings:
- **Dr. Economist** - Economic & financial analysis
- **Chief Engineer** - Technical feasibility
- **Legal Counsel** - Regulatory & compliance
- **Dr. Environmentalist** - Environmental impact
- **Community Advocate** - Social implications
- **Operations Director** - Operational viability

Feel free to ask questions about any aspect of the analysis. You can direct questions to specific experts or ask the entire panel.`;

  await db.insert(discussionMessages).values({
    discussionId: created.id,
    participantType: "ai_moderator",
    participantName: moderator.name,
    content: welcomeMessage,
  });

  return c.json({
    discussionId: created.id,
    status: created.status,
    startedAt: created.startedAt,
    isExisting: false,
  });
});

// Get discussion history
// Supports ?after=<messageId> for incremental/silent refresh (Telegram-style sync)
discussionRoutes.get("/discussion/:slug/history", async (c) => {
  const slug = c.req.param("slug");
  const afterId = c.req.query("after");
  const db = drizzle(c.env.DB);

  // Get discussion
  const discussionResult = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, slug))
    .limit(1);

  const discussion = discussionResult[0];
  if (!discussion) {
    return c.json({ error: "Discussion not found" }, 404);
  }

  // Get messages - optionally filter to only messages after a given ID
  let messages;
  if (afterId && !isNaN(parseInt(afterId, 10))) {
    const afterIdNum = parseInt(afterId, 10);
    messages = await db
      .select()
      .from(discussionMessages)
      .where(
        and(
          eq(discussionMessages.discussionId, discussion.id),
          gt(discussionMessages.id, afterIdNum)
        )
      )
      .orderBy(discussionMessages.createdAt);
  } else {
    messages = await db
      .select()
      .from(discussionMessages)
      .where(eq(discussionMessages.discussionId, discussion.id))
      .orderBy(discussionMessages.createdAt);
  }

  return c.json({
    discussion: {
      id: discussion.id,
      reportSlug: discussion.reportSlug,
      status: discussion.status,
      startedAt: discussion.startedAt,
      concludedAt: discussion.concludedAt,
      summary: discussion.summary,
    },
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
  });
});

// Send message and get AI responses (non-streaming)
const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  targetExpert: z.string().optional(),
  replyToId: z.number().optional(),
  guestId: z.string().optional(),
  guestName: z.string().optional(),
});

discussionRoutes.post("/discussion/:slug/message", zValidator("json", sendMessageSchema), async (c) => {
  const slug = c.req.param("slug");
  const { content, targetExpert, guestId, guestName } = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const displayName = guestName || "You";

  // Get discussion
  const discussionResult = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, slug))
    .limit(1);

  const discussion = discussionResult[0];
  if (!discussion) {
    return c.json({ error: "Discussion not found" }, 404);
  }

  if (discussion.status !== "active") {
    return c.json({ error: "Discussion is not active" }, 400);
  }

  // Get report for context
  const reportResult = await db
    .select()
    .from(reports)
    .where(eq(reports.slug, slug))
    .limit(1);

  const reportRow = reportResult[0];
  if (!reportRow) {
    return c.json({ error: "Report not found" }, 404);
  }

  const report = reportRow.report as Record<string, unknown>;
  const projectDescription = reportRow.projectDescription;
  const countrySlug = reportRow.country;

  // Save user message
  const userMessageResult = await db
    .insert(discussionMessages)
    .values({
      discussionId: discussion.id,
      participantType: "user",
      participantName: displayName,
      content,
      metadata: targetExpert
        ? { targetedExperts: [targetExpert], guestId }
        : guestId ? { guestId } : undefined,
    })
    .returning();

  const userMessage = userMessageResult[0];
  if (!userMessage) {
    return c.json({ error: "Failed to save message" }, 500);
  }

  // Get conversation history (last 10 messages for context)
  const historyResult = await db
    .select()
    .from(discussionMessages)
    .where(eq(discussionMessages.discussionId, discussion.id))
    .orderBy(desc(discussionMessages.createdAt))
    .limit(10);

  const conversationHistory = historyResult.reverse().map((m) => ({
    participantName: m.participantName,
    content: m.content,
  }));

  // Determine which experts should respond
  const respondingExperts = selectRespondingExperts(content, targetExpert);

  // Generate AI responses
  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: c.env.GEMINI_MODEL || "gemini-1.5-flash",
  });

  const aiResponses: Array<{
    id: number;
    participantType: string;
    participantName: string;
    content: string;
    createdAt: string;
  }> = [];

  for (const expertId of respondingExperts) {
    const expert = getExpertPersona(expertId, countrySlug);
    const isDirectlyAddressed = targetExpert === expertId;
    const prompt = buildExpertPrompt(expertId, report, conversationHistory, projectDescription, undefined, undefined, isDirectlyAddressed, countrySlug);

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Save AI response
      const aiMessageResult = await db
        .insert(discussionMessages)
        .values({
          discussionId: discussion.id,
          participantType: expertId,
          participantName: expert.name,
          content: responseText,
          replyToId: userMessage.id,
        })
        .returning();

      const aiMessage = aiMessageResult[0];
      if (aiMessage) {
        aiResponses.push({
          id: aiMessage.id,
          participantType: expertId,
          participantName: expert.name,
          content: responseText,
          createdAt: aiMessage.createdAt,
        });
      }

      // Add small delay between expert responses for more natural feel
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error generating response for ${expertId}:`, error);
    }
  }

  return c.json({
    userMessage: {
      id: userMessage.id,
      participantType: "user",
      participantName: displayName,
      content,
      createdAt: userMessage.createdAt,
    },
    aiResponses,
  });
});

// Streaming message endpoint for real-time responses
discussionRoutes.post("/discussion/:slug/message/stream", zValidator("json", sendMessageSchema), async (c) => {
  const slug = c.req.param("slug");
  const { content, targetExpert, replyToId, guestId, guestName } = c.req.valid("json");
  const db = drizzle(c.env.DB);
  const env = c.env;

  // Use guest name if provided, otherwise fallback to "You"
  const displayName = guestName || "You";

  // Get discussion
  const discussionResult = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, slug))
    .limit(1);

  const discussion = discussionResult[0];
  if (!discussion) {
    return c.json({ error: "Discussion not found" }, 404);
  }

  if (discussion.status !== "active") {
    return c.json({ error: "Discussion is not active" }, 400);
  }

  // Get report for context
  const reportResult = await db
    .select()
    .from(reports)
    .where(eq(reports.slug, slug))
    .limit(1);

  const reportRow = reportResult[0];
  if (!reportRow) {
    return c.json({ error: "Report not found" }, 404);
  }

  const report = reportRow.report as Record<string, unknown>;
  const projectDescription = reportRow.projectDescription;
  const countrySlug = reportRow.country;

  const encoder = new TextEncoder();
  let eventId = 0;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send SSE event with ID for client-side tracking and retry support
      const sendEvent = (eventData: Record<string, unknown>) => {
        eventId++;
        const lines = [
          `id: ${eventId}`,
          `data: ${JSON.stringify(eventData)}`,
          "",
          "",
        ].join("\n");
        controller.enqueue(encoder.encode(lines));
      };

      // Send heartbeat to keep connection alive (every 15 seconds)
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // Stream closed, clear interval
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 15000);

      try {
        // Save user message
        const userMessageResult = await db
          .insert(discussionMessages)
          .values({
            discussionId: discussion.id,
            participantType: "user",
            participantName: displayName,
            content,
            replyToId: replyToId,
            metadata: targetExpert
              ? { targetedExperts: [targetExpert], guestId }
              : guestId ? { guestId } : undefined,
          })
          .returning();

        const userMessage = userMessageResult[0];
        if (!userMessage) {
          sendEvent({ type: "error", error: "Failed to save message" });
          controller.close();
          return;
        }

        const userMessageData = {
          id: userMessage.id,
          participantType: "user",
          participantName: displayName,
          content,
          replyToId: replyToId,
          createdAt: userMessage.createdAt,
          guestId,
        };

        sendEvent({
          type: "user_message",
          message: userMessageData,
        });

        // Broadcast user message to WebSocket clients so other users see it
        broadcastToRoom(env, slug, {
          type: "new_message",
          message: userMessageData,
        });

        // Get conversation history
        const historyResult = await db
          .select()
          .from(discussionMessages)
          .where(eq(discussionMessages.discussionId, discussion.id))
          .orderBy(desc(discussionMessages.createdAt))
          .limit(10);

        const conversationHistory = historyResult.reverse().map((m) => ({
          participantName: m.participantName,
          content: m.content,
        }));

        // If replying to a message, fetch it directly to find who wrote it
        let replyToExpert: string | undefined;
        let replyToParticipantName: string | undefined;
        if (replyToId) {
          const replyToResult = await db
            .select()
            .from(discussionMessages)
            .where(eq(discussionMessages.id, replyToId))
            .limit(1);
          const replyToMessage = replyToResult[0];
          if (replyToMessage && replyToMessage.participantType !== "user") {
            replyToExpert = replyToMessage.participantType;
            replyToParticipantName = replyToMessage.participantName;
          } else if (replyToMessage) {
            replyToParticipantName = replyToMessage.participantName;
          }
        }

        // Determine which experts should respond
        const respondingExperts = selectRespondingExperts(content, targetExpert, replyToExpert);

        // Generate AI responses with streaming
        const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: c.env.GEMINI_MODEL || "gemini-1.5-flash",
        });

        for (let i = 0; i < respondingExperts.length; i++) {
          const expertId = respondingExperts[i]!;
          const expert = getExpertPersona(expertId, countrySlug);

          // Add realistic "reading and thinking" delay before typing
          if (i === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
          } else {
            await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000));
          }

          // Send typing indicator
          const typingEvent = {
            type: "typing",
            participant: expertId,
            participantName: expert.name,
          };
          sendEvent(typingEvent);
          // Broadcast to other users via WebSocket
          broadcastToRoom(env, slug, typingEvent);

          // Simulate "typing" time
          const thinkingTime = expertId === "ai_legal" || expertId === "ai_environmental"
            ? 1500 + Math.random() * 1000
            : 800 + Math.random() * 700;
          await new Promise((resolve) => setTimeout(resolve, thinkingTime));

          // Check if should pass to another expert
          const shouldPassTo = (i === 0 && respondingExperts.length > 1 && replyToExpert === expertId)
            ? respondingExperts[1]
            : undefined;

          const isDirectlyAddressed = targetExpert === expertId;

          const prompt = buildExpertPrompt(
            expertId,
            report,
            conversationHistory,
            projectDescription,
            replyToParticipantName ? { participantName: replyToParticipantName } : undefined,
            shouldPassTo,
            isDirectlyAddressed,
            countrySlug
          );

          try {
            const result = await model.generateContentStream(prompt);
            let fullResponse = "";

            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              fullResponse += chunkText;

              const chunkEvent = {
                type: "ai_chunk",
                participant: expertId,
                participantName: expert.name,
                chunk: chunkText,
                fullContent: fullResponse,
              };
              sendEvent(chunkEvent);
              // Broadcast streaming chunks to other users via WebSocket
              broadcastToRoom(env, slug, chunkEvent);
            }

            // Save complete AI response
            const aiMessageResult = await db
              .insert(discussionMessages)
              .values({
                discussionId: discussion.id,
                participantType: expertId,
                participantName: expert.name,
                content: fullResponse,
                replyToId: userMessage.id,
              })
              .returning();

            const aiMessage = aiMessageResult[0];
            if (aiMessage) {
              const aiMessageData = {
                id: aiMessage.id,
                participantType: expertId,
                participantName: expert.name,
                content: fullResponse,
                createdAt: aiMessage.createdAt,
              };

              sendEvent({
                type: "ai_complete",
                message: aiMessageData,
              });

              // Broadcast AI message to WebSocket clients
              broadcastToRoom(env, slug, {
                type: "new_message",
                message: aiMessageData,
              });
            }

            // Add to conversation history for next expert
            conversationHistory.push({
              participantName: expert.name,
              content: fullResponse,
            });

            // Natural pause between experts
            const currentIndex = respondingExperts.indexOf(expertId);
            if (currentIndex < respondingExperts.length - 1) {
              const isQuickResponse = Math.random() < 0.5;
              const pauseTime = isQuickResponse
                ? 1500 + Math.random() * 1000
                : 3000 + Math.random() * 2000;
              await new Promise((resolve) => setTimeout(resolve, pauseTime));
            }
          } catch (error) {
            console.error(`Error generating response for ${expertId}:`, error);
            sendEvent({
              type: "ai_error",
              participant: expertId,
              error: "Failed to generate response",
            });
          }
        }

        sendEvent({ type: "complete" });
      } catch (error) {
        console.error("Streaming discussion error:", error);
        sendEvent({
          type: "error",
          error: error instanceof Error ? error.message : "Discussion failed",
        });
      } finally {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        controller.close();
      }
    },
    cancel() {
      // Clean up when client disconnects
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
});

// Auto-discuss - AI experts discuss automatically
const autoDiscussSchema = z.object({
  rounds: z.number().min(1).max(5).default(3),
});

discussionRoutes.post("/discussion/:slug/auto-discuss", zValidator("json", autoDiscussSchema), async (c) => {
  const slug = c.req.param("slug");
  const { rounds } = c.req.valid("json");
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

  if (discussion.status !== "active") {
    return c.json({ error: "Discussion is not active" }, 400);
  }

  // Get report for context
  const reportResult = await db
    .select()
    .from(reports)
    .where(eq(reports.slug, slug))
    .limit(1);

  if (reportResult.length === 0) {
    return c.json({ error: "Report not found" }, 404);
  }

  const report = reportResult[0]!.report as Record<string, unknown>;
  const countrySlug = reportResult[0]!.country;

  // Set up SSE streaming
  const encoder = new TextEncoder();
  let eventId = 0;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send SSE event with ID for client-side tracking
      const sendEvent = (data: Record<string, unknown>) => {
        eventId++;
        const lines = [
          `id: ${eventId}`,
          `data: ${JSON.stringify(data)}`,
          "",
          "",
        ].join("\n");
        controller.enqueue(encoder.encode(lines));
      };

      // Send heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 15000);

      try {
        // Get existing conversation history
        const historyResult = await db
          .select()
          .from(discussionMessages)
          .where(eq(discussionMessages.discussionId, discussion.id))
          .orderBy(desc(discussionMessages.createdAt))
          .limit(20);

        const conversationHistory = historyResult.reverse().map((m) => ({
          participantName: m.participantName,
          content: m.content,
        }));

        const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: c.env.GEMINI_MODEL || "gemini-1.5-flash",
        });

        // Define expert order for discussion rounds
        const allExperts: ExpertType[] = [
          "ai_economist",
          "ai_engineer",
          "ai_environmental",
          "ai_social",
          "ai_legal",
          "ai_operations",
        ];

        // Run multiple rounds of discussion
        for (let round = 0; round < rounds; round++) {
          // Shuffle experts for variety in each round
          const roundExperts = [...allExperts].sort(() => Math.random() - 0.5);

          // Select 2-3 experts per round for natural flow
          const expertsThisRound = roundExperts.slice(0, round === 0 ? 3 : 2);

          for (const expertId of expertsThisRound) {
            const expert = getExpertPersona(expertId, countrySlug);

            // Human-like delay before expert starts "thinking"
            const thinkingDelay = 2000 + Math.random() * 3000;
            await new Promise((resolve) => setTimeout(resolve, thinkingDelay));

            // Send typing indicator
            sendEvent({
              type: "typing",
              participant: expertId,
              participantName: expert.name,
            });

            // Build a prompt that encourages discussion
            const autoPrompt = buildAutoDiscussPrompt(
              expertId,
              report,
              conversationHistory,
              round,
              countrySlug
            );

            try {
              const result = await model.generateContentStream(autoPrompt);
              let fullResponse = "";

              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullResponse += chunkText;

                sendEvent({
                  type: "ai_chunk",
                  participant: expertId,
                  participantName: expert.name,
                  chunk: chunkText,
                  fullContent: fullResponse,
                });
              }

              // Save AI response
              const aiMessage = await db
                .insert(discussionMessages)
                .values({
                  discussionId: discussion.id,
                  participantType: expertId,
                  participantName: expert.name,
                  content: fullResponse,
                })
                .returning();

              sendEvent({
                type: "ai_complete",
                message: {
                  id: aiMessage[0]!.id,
                  participantType: expertId,
                  participantName: expert.name,
                  content: fullResponse,
                  createdAt: aiMessage[0]!.createdAt,
                },
              });

              // Add to conversation history for next expert
              conversationHistory.push({
                participantName: expert.name,
                content: fullResponse,
              });

              // Human-like pause after message
              const readingDelay = 1000 + Math.random() * 2000;
              await new Promise((resolve) => setTimeout(resolve, readingDelay));
            } catch (error) {
              console.error(`Error generating response for ${expertId}:`, error);
              sendEvent({
                type: "ai_error",
                participant: expertId,
                error: "Failed to generate response",
              });
            }
          }

          sendEvent({ type: "round_complete", round: round + 1 });

          // Longer pause between rounds
          if (round < rounds - 1) {
            const roundDelay = 3000 + Math.random() * 3000;
            await new Promise((resolve) => setTimeout(resolve, roundDelay));
          }
        }

        sendEvent({ type: "complete" });
      } catch (error) {
        console.error("Auto discussion error:", error);
        sendEvent({
          type: "error",
          error: error instanceof Error ? error.message : "Auto discussion failed",
        });
      } finally {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        controller.close();
      }
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
});

// Conclude discussion
discussionRoutes.post("/discussion/:slug/conclude", async (c) => {
  const slug = c.req.param("slug");
  const db = drizzle(c.env.DB);

  // Get discussion
  const discussionResult = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, slug))
    .limit(1);

  const discussion = discussionResult[0];
  if (!discussion) {
    return c.json({ error: "Discussion not found" }, 404);
  }

  // Get all messages for summary
  const messages = await db
    .select()
    .from(discussionMessages)
    .where(eq(discussionMessages.discussionId, discussion.id))
    .orderBy(discussionMessages.createdAt);

  // Generate summary using AI
  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: c.env.GEMINI_MODEL || "gemini-1.5-flash",
  });

  const summaryPrompt = `Summarize this panel discussion about a feasibility analysis. Highlight:
1. Key points of agreement among experts
2. Main concerns raised
3. Areas of disagreement
4. Final recommendations

Keep the summary concise (3-5 bullet points).

DISCUSSION:
${messages.map((m) => `${m.participantName}: ${m.content}`).join("\n\n")}`;

  let summary = "";
  try {
    const result = await model.generateContent(summaryPrompt);
    summary = result.response.text();
  } catch (error) {
    console.error("Error generating summary:", error);
    summary = "Summary could not be generated.";
  }

  // Update discussion
  const concludedAt = new Date().toISOString();
  await db
    .update(panelDiscussions)
    .set({
      status: "concluded",
      concludedAt,
      summary,
    })
    .where(eq(panelDiscussions.id, discussion.id));

  return c.json({
    status: "concluded",
    summary,
    concludedAt,
  });
});

// Check if discussion exists for a report
discussionRoutes.get("/discussion/:slug/exists", async (c) => {
  const slug = c.req.param("slug");
  const db = drizzle(c.env.DB);

  const discussionResult = await db
    .select()
    .from(panelDiscussions)
    .where(eq(panelDiscussions.reportSlug, slug))
    .limit(1);

  const discussion = discussionResult[0];
  return c.json({
    exists: !!discussion,
    discussion: discussion
      ? {
          id: discussion.id,
          status: discussion.status,
          startedAt: discussion.startedAt,
        }
      : null,
  });
});

export { discussionRoutes };
