/**
 * Translation endpoints
 */

import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { reports, jobs, panelDiscussions, discussionMessages, discussionTranslations } from "../../../db/schema";
import type { HonoEnv } from "../lib/types";
import { languageNames } from "../lib/constants";
import { withGeminiRetry, GeminiAPIError, getUserFriendlyError } from "../lib/gemini";
import { isJobStale, generateJobKey, createJobSafely } from "../lib/job-utils";
import { parseTranslationResponse, parseDiscussionTranslationResponse } from "../lib/translation-utils";
import { JOB_TYPES } from "./jobs";

const translationRoutes = new Hono<HonoEnv>();

// Get or create translated report
translationRoutes.get("/report/:slug/translate/:lang", async (c) => {
  const slug = c.req.param("slug");
  const lang = c.req.param("lang");
  const db = drizzle(c.env.DB);

  // Only allow supported languages (not English)
  if (!languageNames[lang]) {
    return c.json({ error: "Unsupported language" }, 400);
  }

  // Get the report
  const result = await db
    .select()
    .from(reports)
    .where(eq(reports.slug, slug))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "Report not found" }, 404);
  }

  const report = result[0];
  const existingTranslations = (report?.translations as Record<string, unknown>) || {};

  // Check if translation already exists in cache
  if (existingTranslations[lang]) {
    return c.json({
      translated: true,
      cached: true,
      status: "completed",
      language: lang,
      report: existingTranslations[lang],
    });
  }

  // Check for existing translation job with race condition handling
  const jobKey = generateJobKey(JOB_TYPES.REPORT_TRANSLATION, slug, lang);
  const existingJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.jobKey, jobKey))
    .limit(1);

  let existingJob = existingJobs[0];

  // If there's an in-progress job that's not stale, tell client to poll
  if (existingJob && existingJob.status === "in_progress" && !isJobStale(existingJob)) {
    return c.json({
      translated: false,
      status: "in_progress",
      jobId: existingJob.id,
      language: lang,
      message: "Translation is in progress. Please poll for status.",
    });
  }

  // If job is stale or failed, we'll create a new one (clean up old one first)
  if (existingJob && (isJobStale(existingJob) || existingJob.status === "failed")) {
    await db
      .delete(jobs)
      .where(eq(jobs.id, existingJob.id));
    existingJob = undefined;
  }

  // Create a new translation job with race condition handling
  let jobId: number;
  try {
    const { job, isNew } = await createJobSafely(db, jobKey, JOB_TYPES.REPORT_TRANSLATION, {
      slug,
      language: lang,
    });

    // If we got an existing in-progress job (race condition), tell client to poll
    if (!isNew && job.status === "in_progress" && !isJobStale(job)) {
      return c.json({
        translated: false,
        status: "in_progress",
        jobId: job.id,
        language: lang,
        message: "Translation is in progress. Please poll for status.",
      });
    }

    jobId = job.id;
  } catch (error) {
    console.error("Failed to create translation job:", error);
    return c.json({ error: "Failed to create translation job" }, 500);
  }

  // Proceed with translation
  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: c.env.GEMINI_MODEL });

  const originalReport = report?.report as Record<string, unknown>;
  const projectDescription = report?.projectDescription || "";
  const targetLanguage = languageNames[lang];

  const translationPrompt = `You are a professional translator. Translate the following feasibility report from English to ${targetLanguage}.

IMPORTANT TRANSLATION RULES:
1. Translate ALL text content including: overallSummary, all category summaries, pros, cons, recommendations, keyRisks, nextSteps, disclaimer, dataQualityNote, demandSummary, budgetImpact
2. Keep the JSON structure EXACTLY the same - only translate string values
3. ADD a new field "translatedProjectType" with the translated version of "detectedProjectType"
4. ADD a new field "translatedProjectDescription" with the translated version of the user's original request: "${projectDescription}"
5. DO NOT translate:
   - Numbers (scores, costs, percentages, populations)
   - Currency codes (MVR, INR, BDT, LKR, USD)
   - Property names/keys in the JSON
   - detectedProjectType (keep original English value, but ADD translatedProjectType with translation)
   - Location names
   - Source names in dataFoundViaSearch
6. Maintain the same professional but accessible tone
7. For ${lang === "dv" ? "Dhivehi, use Thaana script (ދިވެހި)" : targetLanguage + ", use native script"}
8. Ensure the translation sounds natural in ${targetLanguage}, not like a literal translation

Original English report:
${JSON.stringify(originalReport, null, 2)}

Respond with ONLY the translated JSON object. No markdown code blocks, no explanations. The JSON must be valid and parseable.`;

  try {
    // Call Gemini with retry logic
    const aiResult = await withGeminiRetry(
      () => model.generateContent(translationPrompt),
      { maxRetries: 3 },
      (attempt, _error, delay) => {
        console.log(`Report translation retry ${attempt}, waiting ${delay}ms`);
      }
    );
    const response = aiResult.response;
    const text = response.text();

    let translatedReport: Record<string, unknown>;

    try {
      translatedReport = parseTranslationResponse(text);
    } catch {
      console.error("JSON parse failed, retrying with stricter prompt...");

      const retryPrompt = `The previous translation had JSON formatting issues. Please translate this report to ${targetLanguage} and return ONLY valid JSON.

CRITICAL: Return ONLY the JSON object, no explanations, no markdown. Ensure all strings are properly escaped.

Original:
${JSON.stringify(originalReport)}

Return the translated JSON:`;

      // Retry the parse correction with retry logic too
      const retryResult = await withGeminiRetry(
        () => model.generateContent(retryPrompt),
        { maxRetries: 2 }
      );
      const retryText = retryResult.response.text();
      translatedReport = parseTranslationResponse(retryText);
    }

    // Save translation to database
    const updatedTranslations = {
      ...existingTranslations,
      [lang]: translatedReport,
    };

    await db
      .update(reports)
      .set({ translations: updatedTranslations })
      .where(eq(reports.slug, slug));

    // Mark job as completed
    await db
      .update(jobs)
      .set({ status: "completed", completedAt: new Date().toISOString(), progress: 100 })
      .where(eq(jobs.id, jobId));

    return c.json({
      translated: true,
      cached: false,
      status: "completed",
      language: lang,
      report: translatedReport,
    });
  } catch (error) {
    console.error("Translation error:", error);

    // Get user-friendly error message
    const userMessage = getUserFriendlyError(error);
    const technicalMessage = error instanceof Error ? error.message : "Translation failed";

    // Mark job as failed
    await db
      .update(jobs)
      .set({
        status: "failed",
        error: technicalMessage,
        completedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId));

    return c.json(
      {
        translated: false,
        status: "failed",
        error: userMessage,
        technicalError: technicalMessage,
        retryable: !(error instanceof GeminiAPIError) || error.wasRetried,
      },
      500
    );
  }
});

// Translation status endpoint (for polling)
translationRoutes.get("/translation/status/:type/:slug/:lang", async (c) => {
  const type = c.req.param("type"); // 'report' or 'discussion'
  const slug = c.req.param("slug");
  const lang = c.req.param("lang");
  const db = drizzle(c.env.DB);

  if (type !== "report" && type !== "discussion") {
    return c.json({ error: "Invalid type. Must be 'report' or 'discussion'" }, 400);
  }

  if (!languageNames[lang]) {
    return c.json({ error: "Unsupported language" }, 400);
  }

  // For reports, check if translation is already cached
  if (type === "report") {
    const result = await db
      .select()
      .from(reports)
      .where(eq(reports.slug, slug))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: "Report not found" }, 404);
    }

    const report = result[0];
    const existingTranslations = (report?.translations as Record<string, unknown>) || {};

    if (existingTranslations[lang]) {
      return c.json({
        status: "completed",
        cached: true,
        language: lang,
        report: existingTranslations[lang],
      });
    }
  }

  // For discussions, check if translation is cached
  if (type === "discussion") {
    const discussionResult = await db
      .select()
      .from(panelDiscussions)
      .where(eq(panelDiscussions.reportSlug, slug))
      .limit(1);

    const discussion = discussionResult[0];
    if (!discussion) {
      return c.json({ error: "Discussion not found" }, 404);
    }

    // Get current message count
    const messages = await db
      .select()
      .from(discussionMessages)
      .where(eq(discussionMessages.discussionId, discussion.id))
      .orderBy(discussionMessages.createdAt);

    const currentMessageCount = messages.length;
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage ? lastMessage.id : null;

    // Check cache
    const cachedTranslations = await db
      .select()
      .from(discussionTranslations)
      .where(
        and(
          eq(discussionTranslations.discussionId, discussion.id),
          eq(discussionTranslations.language, lang)
        )
      )
      .limit(1);

    const cachedTranslation = cachedTranslations[0];

    if (
      cachedTranslation &&
      cachedTranslation.messageCount === currentMessageCount &&
      cachedTranslation.lastMessageId === lastMessageId
    ) {
      const translatedMsgs = cachedTranslation.translatedMessages as Array<{
        id: number;
        content: string;
      }>;
      const translationMap = new Map(translatedMsgs.map((t) => [t.id, t.content]));

      return c.json({
        status: "completed",
        cached: true,
        language: lang,
        discussion: {
          id: discussion.id,
          reportSlug: discussion.reportSlug,
          status: discussion.status,
          startedAt: discussion.startedAt,
          concludedAt: discussion.concludedAt,
          summary: cachedTranslation.translatedSummary || discussion.summary,
        },
        messages: messages.map((m) => ({
          id: m.id,
          discussionId: m.discussionId,
          participantType: m.participantType,
          participantName: m.participantName,
          content: translationMap.get(m.id) || m.content,
          replyToId: m.replyToId,
          metadata: m.metadata,
          createdAt: m.createdAt,
        })),
      });
    }
  }

  // Check for translation job status
  const jobType = type === "report" ? JOB_TYPES.REPORT_TRANSLATION : JOB_TYPES.DISCUSSION_TRANSLATION;
  const jobKey = generateJobKey(jobType, slug, lang);
  const existingJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.jobKey, jobKey))
    .limit(1);

  const job = existingJobs[0];

  if (!job) {
    return c.json({
      status: "not_started",
      language: lang,
      message: "No translation job found. Start one by calling the translate endpoint.",
    });
  }

  // Check if job is stale
  if (isJobStale(job)) {
    return c.json({
      status: "stale",
      language: lang,
      message: "Translation job timed out. Please retry.",
    });
  }

  if (job.status === "completed") {
    // Job completed but cache might not be populated - redirect to main endpoint
    return c.json({
      status: "completed",
      language: lang,
      message: "Translation completed. Fetch from the translate endpoint.",
    });
  }

  if (job.status === "failed") {
    return c.json({
      status: "failed",
      language: lang,
      error: job.error || "Translation failed",
    });
  }

  // Still in progress
  return c.json({
    status: "in_progress",
    jobId: job.id,
    language: lang,
    startedAt: job.startedAt,
    message: "Translation is in progress. Please continue polling.",
  });
});

// Translate discussion messages (with caching and deduplication)
translationRoutes.get("/discussion/:slug/translate/:lang", async (c) => {
  const slug = c.req.param("slug");
  const lang = c.req.param("lang");
  const db = drizzle(c.env.DB);

  // Only allow supported languages (not English)
  if (!languageNames[lang]) {
    return c.json({ error: "Unsupported language" }, 400);
  }

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

  // Get messages
  const messages = await db
    .select()
    .from(discussionMessages)
    .where(eq(discussionMessages.discussionId, discussion.id))
    .orderBy(discussionMessages.createdAt);

  // If no messages, return empty
  if (messages.length === 0) {
    return c.json({
      translated: true,
      cached: true,
      status: "completed",
      language: lang,
      discussion: {
        id: discussion.id,
        reportSlug: discussion.reportSlug,
        status: discussion.status,
        startedAt: discussion.startedAt,
        concludedAt: discussion.concludedAt,
        summary: discussion.summary,
      },
      messages: [],
    });
  }

  const currentMessageCount = messages.length;
  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id ?? null;

  // Check for cached translation
  const cachedTranslations = await db
    .select()
    .from(discussionTranslations)
    .where(
      and(
        eq(discussionTranslations.discussionId, discussion.id),
        eq(discussionTranslations.language, lang)
      )
    )
    .limit(1);

  const cachedTranslation = cachedTranslations[0];

  // If cache exists and is up-to-date (same message count and last message ID)
  if (
    cachedTranslation &&
    cachedTranslation.messageCount === currentMessageCount &&
    cachedTranslation.lastMessageId === lastMessageId
  ) {
    const translatedMsgs = cachedTranslation.translatedMessages as Array<{
      id: number;
      content: string;
    }>;
    const translationMap = new Map(translatedMsgs.map((t) => [t.id, t.content]));

    return c.json({
      translated: true,
      cached: true,
      status: "completed",
      language: lang,
      discussion: {
        id: discussion.id,
        reportSlug: discussion.reportSlug,
        status: discussion.status,
        startedAt: discussion.startedAt,
        concludedAt: discussion.concludedAt,
        summary: cachedTranslation.translatedSummary || discussion.summary,
      },
      messages: messages.map((m) => ({
        id: m.id,
        discussionId: m.discussionId,
        participantType: m.participantType,
        participantName: m.participantName,
        content: translationMap.get(m.id) || m.content,
        replyToId: m.replyToId,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
    });
  }

  // Check for existing translation job with race condition handling
  const jobKey = generateJobKey(JOB_TYPES.DISCUSSION_TRANSLATION, slug, lang);
  const existingJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.jobKey, jobKey))
    .limit(1);

  let existingJob = existingJobs[0];

  // If there's an in-progress job that's not stale, tell client to poll
  if (existingJob && existingJob.status === "in_progress" && !isJobStale(existingJob)) {
    return c.json({
      translated: false,
      status: "in_progress",
      jobId: existingJob.id,
      language: lang,
      message: "Translation is in progress. Please poll for status.",
    });
  }

  // Clean up stale or failed jobs
  if (existingJob && (isJobStale(existingJob) || existingJob.status === "failed")) {
    await db
      .delete(jobs)
      .where(eq(jobs.id, existingJob.id));
    existingJob = undefined;
  }

  // Create a new translation job with race condition handling
  let jobId: number;
  try {
    const { job, isNew } = await createJobSafely(db, jobKey, JOB_TYPES.DISCUSSION_TRANSLATION, {
      slug,
      language: lang,
    });

    // If we got an existing in-progress job (race condition), tell client to poll
    if (!isNew && job.status === "in_progress" && !isJobStale(job)) {
      return c.json({
        translated: false,
        status: "in_progress",
        jobId: job.id,
        language: lang,
        message: "Translation is in progress. Please poll for status.",
      });
    }

    jobId = job.id;
  } catch (error) {
    console.error("Failed to create translation job:", error);
    return c.json({ error: "Failed to create translation job" }, 500);
  }

  // Determine which messages need translation
  let messagesToTranslate = messages;
  let existingTranslationMap = new Map<number, string>();

  // If we have a partial cache, only translate new messages
  if (cachedTranslation && cachedTranslation.lastMessageId) {
    const cachedMsgs = cachedTranslation.translatedMessages as Array<{
      id: number;
      content: string;
    }>;
    existingTranslationMap = new Map(cachedMsgs.map((t) => [t.id, t.content]));

    // Only translate messages after the last cached message
    messagesToTranslate = messages.filter((m) => m.id > cachedTranslation.lastMessageId!);
  }

  // Translate messages using Gemini
  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: c.env.GEMINI_MODEL });
  const targetLanguage = languageNames[lang];

  // Helper to save partial translations to DB so retries don't redo completed batches
  const savePartialTranslations = async (
    translated: Array<{ id: number; content: string }>,
    summary?: string | null
  ) => {
    if (translated.length === 0) return;

    const allTranslated = [
      ...Array.from(existingTranslationMap.entries()).map(([id, content]) => ({ id, content })),
      ...translated,
    ];

    // Find the last message ID we actually translated
    const lastTranslatedId = Math.max(...allTranslated.map((t) => t.id));
    const partialMessageCount = messages.filter((m) => m.id <= lastTranslatedId).length;

    if (cachedTranslation) {
      await db
        .update(discussionTranslations)
        .set({
          translatedMessages: allTranslated,
          translatedSummary: summary || cachedTranslation.translatedSummary,
          messageCount: partialMessageCount,
          lastMessageId: lastTranslatedId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(discussionTranslations.id, cachedTranslation.id));
    } else {
      await db.insert(discussionTranslations).values({
        discussionId: discussion.id,
        language: lang,
        translatedMessages: allTranslated,
        translatedSummary: summary || null,
        messageCount: partialMessageCount,
        lastMessageId: lastTranslatedId,
      });
    }

    console.log(`Saved partial translation cache: ${allTranslated.length} messages up to ID ${lastTranslatedId}`);
  };

  try {
    let newTranslatedContents: Array<{ id: number; content: string }> = [];

    if (messagesToTranslate.length > 0) {
      // Batch messages to avoid exceeding model output token limits
      // Each batch gets ~15 messages (Thaana/CJK scripts expand token count significantly)
      const BATCH_SIZE = 15;
      const batches: Array<typeof messagesToTranslate> = [];
      for (let i = 0; i < messagesToTranslate.length; i += BATCH_SIZE) {
        batches.push(messagesToTranslate.slice(i, i + BATCH_SIZE));
      }

      console.log(`Translating ${messagesToTranslate.length} messages in ${batches.length} batch(es) to ${lang}`);

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx]!;
        const preparedMessages = batch.map((m) => ({
          id: m.id,
          participantName: m.participantName,
          content: m.content,
        }));

        const translationPrompt = `You are a professional translator. Translate the following discussion messages from English to ${targetLanguage}.

IMPORTANT TRANSLATION RULES:
1. Translate ONLY the "content" field of each message
2. Keep participant names in English
3. Maintain the same tone and style as the original
4. For ${lang === "dv" ? "Dhivehi, use Thaana script (ދިވެހި)" : targetLanguage + ", use native script"}
5. Preserve any technical terms, numbers, and currency codes
6. Ensure the translation sounds natural in ${targetLanguage}

Messages to translate:
${JSON.stringify(preparedMessages, null, 2)}

Respond with ONLY a JSON array of objects with "id" and "content" fields. No markdown, no explanations.
Example: [{"id": 1, "content": "translated text"}, {"id": 2, "content": "translated text"}]`;

        try {
          const aiResult = await withGeminiRetry(
            () => model.generateContent(translationPrompt),
            { maxRetries: 3 },
            (attempt, err, delay) => {
              console.log(`Discussion translation batch ${batchIdx + 1}/${batches.length} retry attempt ${attempt}, waiting ${delay}ms:`, err);
            }
          );
          const text = aiResult.response.text();
          const batchResults = parseDiscussionTranslationResponse(text);
          newTranslatedContents.push(...batchResults);

          console.log(`Batch ${batchIdx + 1}/${batches.length} translated ${batchResults.length}/${batch.length} messages`);
        } catch (batchError) {
          // Save whatever we translated so far before re-throwing
          if (newTranslatedContents.length > 0) {
            console.log(`Batch ${batchIdx + 1} failed, saving ${newTranslatedContents.length} already-translated messages`);
            await savePartialTranslations(newTranslatedContents);
          }
          throw batchError;
        }
      }
    }

    // Merge existing and new translations
    const allTranslatedContents = [
      ...Array.from(existingTranslationMap.entries()).map(([id, content]) => ({
        id,
        content,
      })),
      ...newTranslatedContents,
    ];

    // Create final translation map
    const translationMap = new Map(
      allTranslatedContents.map((t) => [t.id, t.content])
    );

    // Translate discussion summary if concluded
    let translatedSummary = discussion.summary;
    if (discussion.summary && discussion.status === "concluded") {
      // Check if we already have a cached summary
      if (cachedTranslation?.translatedSummary) {
        translatedSummary = cachedTranslation.translatedSummary;
      } else {
        const summaryPrompt = `Translate this discussion summary to ${targetLanguage}. Return ONLY the translated text, no explanations:\n\n${discussion.summary}`;
        const summaryResult = await withGeminiRetry(
          () => model.generateContent(summaryPrompt),
          { maxRetries: 3 },
          (attempt, err, delay) => {
            console.log(`Summary translation retry attempt ${attempt}, waiting ${delay}ms:`, err);
          }
        );
        translatedSummary = summaryResult.response.text().trim();
      }
    }

    // Save/update translation cache
    if (cachedTranslation) {
      await db
        .update(discussionTranslations)
        .set({
          translatedMessages: allTranslatedContents,
          translatedSummary,
          messageCount: currentMessageCount,
          lastMessageId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(discussionTranslations.id, cachedTranslation.id));
    } else {
      await db.insert(discussionTranslations).values({
        discussionId: discussion.id,
        language: lang,
        translatedMessages: allTranslatedContents,
        translatedSummary,
        messageCount: currentMessageCount,
        lastMessageId,
      });
    }

    // Mark job as completed
    await db
      .update(jobs)
      .set({ status: "completed", completedAt: new Date().toISOString(), progress: 100 })
      .where(eq(jobs.id, jobId));

    // Return translated messages
    const translatedMessages = messages.map((m) => ({
      id: m.id,
      discussionId: m.discussionId,
      participantType: m.participantType,
      participantName: m.participantName,
      content: translationMap.get(m.id) || m.content,
      replyToId: m.replyToId,
      metadata: m.metadata,
      createdAt: m.createdAt,
    }));

    return c.json({
      translated: true,
      cached: false,
      status: "completed",
      language: lang,
      discussion: {
        id: discussion.id,
        reportSlug: discussion.reportSlug,
        status: discussion.status,
        startedAt: discussion.startedAt,
        concludedAt: discussion.concludedAt,
        summary: translatedSummary,
      },
      messages: translatedMessages,
    });
  } catch (error) {
    console.error("Discussion translation error:", error);

    // Get user-friendly error message
    const userMessage = error instanceof GeminiAPIError
      ? error.userMessage
      : getUserFriendlyError(error);
    const wasRetried = error instanceof GeminiAPIError && error.wasRetried;

    // Mark job as failed
    await db
      .update(jobs)
      .set({
        status: "failed",
        error: userMessage,
        completedAt: new Date().toISOString(),
      })
      .where(eq(jobs.id, jobId));

    return c.json(
      {
        translated: false,
        status: "failed",
        error: userMessage,
        wasRetried,
      },
      500
    );
  }
});

export { translationRoutes };
