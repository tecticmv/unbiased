/**
 * Country Request API Routes
 * Handles automated country addition workflow
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import type { HonoEnv } from "../lib/types";
import { countryRequests, COUNTRY_REQUEST_STATUS } from "../../../db/schema";
import { supportedCountries } from "../lib/constants";

const countryRequestRoutes = new Hono<HonoEnv>();

// Validation schema for country request
const countryRequestSchema = z.object({
  countryName: z.string().min(2).max(100),
  requesterName: z.string().optional(),
  requesterEmail: z.string().email().optional(),
});

/**
 * POST /api/country-request
 * Submit a new country request
 */
countryRequestRoutes.post(
  "/country-request",
  zValidator("json", countryRequestSchema),
  async (c) => {
    const { countryName, requesterName, requesterEmail } = c.req.valid("json");
    const db = drizzle(c.env.DB);

    // Check if country already exists in code
    const existingCountry = supportedCountries.find(
      (country) => country.name.toLowerCase() === countryName.toLowerCase()
    );
    if (existingCountry) {
      return c.json(
        { error: "Country already supported", country: existingCountry },
        400
      );
    }

    // Check if there's already a pending request for this country
    const existingRequest = await db
      .select()
      .from(countryRequests)
      .where(eq(countryRequests.countryName, countryName))
      .get();

    if (existingRequest && existingRequest.status !== COUNTRY_REQUEST_STATUS.REJECTED && existingRequest.status !== COUNTRY_REQUEST_STATUS.FAILED) {
      return c.json(
        {
          error: "Request already exists for this country",
          status: existingRequest.status,
          requestId: existingRequest.id,
        },
        400
      );
    }

    // Validate country with Gemini BEFORE creating request
    const validationResult = await validateCountryWithGemini(
      c.env.GEMINI_API_KEY,
      countryName
    );

    if (!validationResult.valid) {
      return c.json(
        {
          error: "Invalid country",
          reason: validationResult.error || "This is not a recognized sovereign country",
        },
        400
      );
    }

    // Create new request with validated data
    const result = await db
      .insert(countryRequests)
      .values({
        countryName: validationResult.name || countryName, // Use official name from Gemini
        requesterName,
        requesterEmail,
        status: COUNTRY_REQUEST_STATUS.PENDING, // Manual review
        validatedData: JSON.stringify(validationResult),
      })
      .returning({ id: countryRequests.id });

    const insertedRow = result[0];
    if (!insertedRow) {
      return c.json({ error: "Failed to create request" }, 500);
    }
    const requestId = insertedRow.id;

    // Send confirmation email to requester
    if (requesterEmail && c.env.RESEND_API_KEY && c.env.FROM_EMAIL) {
      await sendRequestConfirmationEmail(
        c.env.RESEND_API_KEY,
        c.env.FROM_EMAIL,
        requesterEmail,
        validationResult.name || countryName,
        requestId
      );
    }

    // Send Telegram notification to owner for manual processing
    if (c.env.TELEGRAM_BOT_TOKEN && c.env.TELEGRAM_OWNER_CHAT_ID) {
      await sendTelegramManualRequestNotification(
        c.env.TELEGRAM_BOT_TOKEN,
        c.env.TELEGRAM_OWNER_CHAT_ID,
        validationResult.name || countryName,
        requestId,
        validationResult,
        requesterEmail
      );
    }

    return c.json({
      success: true,
      requestId,
      message: "Country request submitted successfully",
      countryName: validationResult.name,
      status: COUNTRY_REQUEST_STATUS.PENDING,
    });
  }
);

/**
 * GET /api/country-request/:id
 * Get status of a country request
 */
countryRequestRoutes.get("/country-request/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Invalid request ID" }, 400);
  }

  const db = drizzle(c.env.DB);
  const request = await db
    .select()
    .from(countryRequests)
    .where(eq(countryRequests.id, id))
    .get();

  if (!request) {
    return c.json({ error: "Request not found" }, 404);
  }

  return c.json({ request });
});

/**
 * GET /api/country-requests
 * List all country requests (for admin)
 */
countryRequestRoutes.get("/country-requests", async (c) => {
  const db = drizzle(c.env.DB);
  const requests = await db.select().from(countryRequests).all();

  return c.json({ requests });
});

/**
 * POST /api/country-request/webhook/github
 * Webhook for GitHub Actions to update request status
 */
countryRequestRoutes.post("/country-request/webhook/github", async (c) => {
  const body = await c.req.json();
  const { requestId, status, previewUrl, branchName, prNumber, error, validatedData } = body;

  const db = drizzle(c.env.DB);

  const updateData: Record<string, unknown> = { status };

  if (previewUrl) updateData.previewUrl = previewUrl;
  if (branchName) updateData.branchName = branchName;
  if (prNumber) updateData.prNumber = prNumber;
  if (error) updateData.error = error;
  if (validatedData) updateData.validatedData = validatedData;

  // Set timestamp based on status
  if (status === COUNTRY_REQUEST_STATUS.VALIDATING) {
    updateData.validatedAt = new Date().toISOString();
  } else if (status === COUNTRY_REQUEST_STATUS.GENERATING) {
    updateData.generatedAt = new Date().toISOString();
  } else if (status === COUNTRY_REQUEST_STATUS.APPROVED) {
    updateData.approvedAt = new Date().toISOString();
  } else if (status === COUNTRY_REQUEST_STATUS.LIVE) {
    updateData.liveAt = new Date().toISOString();
  }

  await db
    .update(countryRequests)
    .set(updateData)
    .where(eq(countryRequests.id, requestId));

  // Get request for notifications
  const request = await db
    .select()
    .from(countryRequests)
    .where(eq(countryRequests.id, requestId))
    .get();

  if (request) {
    // Send Telegram notification when preview is ready
    if (status === COUNTRY_REQUEST_STATUS.PREVIEW && previewUrl && c.env.TELEGRAM_BOT_TOKEN && c.env.TELEGRAM_OWNER_CHAT_ID) {
      await sendTelegramPreviewNotification(
        c.env.TELEGRAM_BOT_TOKEN,
        c.env.TELEGRAM_OWNER_CHAT_ID,
        request.countryName,
        previewUrl,
        requestId
      );
    }

    // Send Telegram notification to owner when workflow fails (internal only, no email to requester)
    if (status === COUNTRY_REQUEST_STATUS.FAILED && c.env.TELEGRAM_BOT_TOKEN && c.env.TELEGRAM_OWNER_CHAT_ID) {
      await sendTelegramMessage(
        c.env.TELEGRAM_BOT_TOKEN,
        c.env.TELEGRAM_OWNER_CHAT_ID,
        `❌ *Country Request Failed*\n\n*Country:* ${request.countryName}\n*Error:* ${error || "Unknown error"}\n*Request ID:* ${requestId}`
      );
    }
  }

  return c.json({ success: true });
});

/**
 * POST /api/country-request/webhook/telegram
 * Webhook for Telegram bot callbacks (approve/reject)
 */
countryRequestRoutes.post("/country-request/webhook/telegram", async (c) => {
  const body = await c.req.json();

  // Handle Telegram callback query
  if (body.callback_query) {
    const callbackData = body.callback_query.data;
    const [action, requestIdStr] = callbackData.split(":");
    const requestId = parseInt(requestIdStr);
    const chatId = body.callback_query.message.chat.id;

    if (isNaN(requestId)) {
      return c.json({ error: "Invalid request ID" }, 400);
    }

    const db = drizzle(c.env.DB);
    const request = await db
      .select()
      .from(countryRequests)
      .where(eq(countryRequests.id, requestId))
      .get();

    if (!request) {
      return c.json({ error: "Request not found" }, 404);
    }

    if (action === "done") {
      // Owner clicked "Done" - country has been manually added and deployed
      await db
        .update(countryRequests)
        .set({
          status: COUNTRY_REQUEST_STATUS.LIVE,
          liveAt: new Date().toISOString(),
        })
        .where(eq(countryRequests.id, requestId));

      // Send confirmation to owner
      if (c.env.TELEGRAM_BOT_TOKEN) {
        await sendTelegramMessage(
          c.env.TELEGRAM_BOT_TOKEN,
          chatId.toString(),
          `✅ *${request.countryName} marked as Live!*\n\nThe requester has been notified.`
        );
      }

      // Send email to requester that country is live
      if (request.requesterEmail && c.env.RESEND_API_KEY && c.env.FROM_EMAIL) {
        const slug = request.countryName.toLowerCase().replace(/\s+/g, "-");
        const siteUrl = `https://unbiased.talk/${slug}`;
        await sendCountryLiveEmail(
          c.env.RESEND_API_KEY,
          c.env.FROM_EMAIL,
          request.requesterEmail,
          request.countryName,
          siteUrl
        );
      }
    } else if (action === "cancel") {
      // Owner rejected the request
      await db
        .update(countryRequests)
        .set({
          status: COUNTRY_REQUEST_STATUS.REJECTED,
        })
        .where(eq(countryRequests.id, requestId));

      if (c.env.TELEGRAM_BOT_TOKEN) {
        await sendTelegramMessage(
          c.env.TELEGRAM_BOT_TOKEN,
          chatId.toString(),
          `❌ *${request.countryName} request rejected*`
        );
      }
    } else if (action === "approve") {
      // Legacy approval flow (for automated workflow)
      await db
        .update(countryRequests)
        .set({
          status: COUNTRY_REQUEST_STATUS.APPROVED,
          approvedAt: new Date().toISOString(),
        })
        .where(eq(countryRequests.id, requestId));

      // Trigger merge via GitHub API
      if (c.env.GITHUB_TOKEN && c.env.GITHUB_REPO && request.prNumber) {
        await mergePullRequest(
          c.env.GITHUB_TOKEN,
          c.env.GITHUB_REPO,
          request.prNumber
        );

        // Update to live after merge
        await db
          .update(countryRequests)
          .set({
            status: COUNTRY_REQUEST_STATUS.LIVE,
            liveAt: new Date().toISOString(),
          })
          .where(eq(countryRequests.id, requestId));

        // Send confirmation to owner
        if (c.env.TELEGRAM_BOT_TOKEN) {
          await sendTelegramMessage(
            c.env.TELEGRAM_BOT_TOKEN,
            chatId.toString(),
            `${request.countryName} has been approved and merged! It will be live shortly.`
          );
        }

        // Send email to requester that country is live
        if (request.requesterEmail && c.env.RESEND_API_KEY && c.env.FROM_EMAIL) {
          const slug = request.countryName.toLowerCase().replace(/\s+/g, "-");
          const siteUrl = `https://unbiased.talk/${slug}`;
          await sendCountryLiveEmail(
            c.env.RESEND_API_KEY,
            c.env.FROM_EMAIL,
            request.requesterEmail,
            request.countryName,
            siteUrl
          );
        }
      }
    } else if (action === "reject") {
      // Reject = auto-retry with Claude (no notification to end user)
      // Close existing PR and re-trigger workflow with generic feedback
      if (c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
        // Close existing PR if exists
        if (request.prNumber) {
          await closePullRequest(
            c.env.GITHUB_TOKEN,
            c.env.GITHUB_REPO,
            request.prNumber
          );
        }

        // Update status back to generating
        await db
          .update(countryRequests)
          .set({ status: COUNTRY_REQUEST_STATUS.GENERATING })
          .where(eq(countryRequests.id, requestId));

        // Re-trigger workflow with auto feedback
        await triggerGitHubWorkflowWithFeedback(
          c.env.GITHUB_TOKEN,
          c.env.GITHUB_REPO,
          request.countryName,
          requestId,
          "The previous generation was not acceptable. Please regenerate with better quality, ensure all files are correct, and double-check the data."
        );

        if (c.env.TELEGRAM_BOT_TOKEN) {
          await sendTelegramMessage(
            c.env.TELEGRAM_BOT_TOKEN,
            chatId.toString(),
            `🔄 *Retrying ${request.countryName}*\n\nRe-generating with improved quality. I'll send you a new preview when it's ready.`
          );
        }
      }
    } else if (action === "fix") {
      // Prompt owner for feedback on what to fix
      if (c.env.TELEGRAM_BOT_TOKEN) {
        await sendTelegramMessage(
          c.env.TELEGRAM_BOT_TOKEN,
          chatId.toString(),
          `🔧 *Fix Request for ${request.countryName}*\n\nPlease describe what needs to be fixed. Reply with your feedback:\n\n_Example: "The currency symbol is wrong" or "Missing some regions" or "Expert names don't look right"_\n\nSend your feedback as: \`/fix ${requestId} your feedback here\``
        );
      }
    }

    // Answer callback query to remove loading state
    if (c.env.TELEGRAM_BOT_TOKEN) {
      await answerCallbackQuery(
        c.env.TELEGRAM_BOT_TOKEN,
        body.callback_query.id
      );
    }
  }

  // Handle text messages (for fix feedback via /fix command)
  if (body.message?.text && body.message.text.startsWith("/fix ")) {
    const text = body.message.text.substring(5).trim(); // Remove "/fix "
    const spaceIndex = text.indexOf(" ");

    if (spaceIndex > 0) {
      const requestIdStr = text.substring(0, spaceIndex);
      const feedback = text.substring(spaceIndex + 1).trim();
      const requestId = parseInt(requestIdStr);
      const chatId = body.message.chat.id;

      if (!isNaN(requestId) && feedback) {
        const db = drizzle(c.env.DB);
        const request = await db
          .select()
          .from(countryRequests)
          .where(eq(countryRequests.id, requestId))
          .get();

        if (request && c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
          // Update status back to generating
          await db
            .update(countryRequests)
            .set({ status: COUNTRY_REQUEST_STATUS.GENERATING })
            .where(eq(countryRequests.id, requestId));

          // Close existing PR
          if (request.prNumber) {
            await closePullRequest(
              c.env.GITHUB_TOKEN,
              c.env.GITHUB_REPO,
              request.prNumber
            );
          }

          // Re-trigger workflow with feedback
          await triggerGitHubWorkflowWithFeedback(
            c.env.GITHUB_TOKEN,
            c.env.GITHUB_REPO,
            request.countryName,
            requestId,
            feedback
          );

          if (c.env.TELEGRAM_BOT_TOKEN) {
            await sendTelegramMessage(
              c.env.TELEGRAM_BOT_TOKEN,
              chatId.toString(),
              `🔄 *Fixing ${request.countryName}*\n\nRe-generating with your feedback:\n_"${feedback}"_\n\nI'll send you a new preview when it's ready.`
            );
          }
        }
      }
    }
  }

  return c.json({ success: true });
});

// Helper functions

// Gemini validation types
interface GeminiValidationResult {
  valid: boolean;
  error?: string;
  slug?: string;
  code?: string;
  name?: string;
  currency?: string;
  currencySymbol?: string;
  flag?: string;
  regions?: string[];
  projectTypes?: string[];
  description?: string;
  expertNames?: Record<string, string>;
  primaryLanguage?: {
    code: string;
    name: string;
    nativeName: string;
    dir: string;
  };
  countryNameTranslations?: Record<string, string>;
}

async function validateCountryWithGemini(
  apiKey: string,
  countryName: string
): Promise<GeminiValidationResult> {
  const prompt = `You are a country data validator. Given the input "${countryName}", validate if this is a real, recognized sovereign country (not a city, region, fictional place, or invalid input). Reject territories, dependencies, and disputed regions. If it is NOT a valid sovereign country, return {"valid": false, "error": "specific reason"}. If valid, return:

{
  "valid": true,
  "slug": "lowercase-slug-no-spaces",
  "code": "ISO 2-letter code",
  "name": "Official English name",
  "currency": "Currency code (e.g., USD, EUR, JPY)",
  "currencySymbol": "Currency symbol (e.g., $, €, ¥)",
  "flag": "Flag emoji",
  "regions": ["List of 10-15 major regions/states/provinces/cities"],
  "projectTypes": ["Infrastructure", "Healthcare", "Education", "Energy", "Transportation", "Housing", "Tourism", "Agriculture", "Water & Sanitation", "Telecommunications", "Manufacturing", "Urban Development"],
  "description": "One sentence about analyzing development projects in this country",
  "expertNames": {
    "ai_economist": "Culturally appropriate local name (Dr. FirstName LastName)",
    "ai_engineer": "Culturally appropriate local name",
    "ai_legal": "Culturally appropriate local name",
    "ai_environmental": "Culturally appropriate local name (Dr. prefix)",
    "ai_social": "Culturally appropriate local name",
    "ai_operations": "Culturally appropriate local name",
    "ai_moderator": "Culturally appropriate local name"
  },
  "primaryLanguage": {
    "code": "ISO 639-1 code (e.g., ja, pt, sw)",
    "name": "Language name in English",
    "nativeName": "Language name in native script",
    "dir": "ltr or rtl"
  },
  "countryNameTranslations": {
    "en": "Country name in English",
    "dv": "Country name in Dhivehi/Thaana script",
    "hi": "Country name in Hindi/Devanagari",
    "bn": "Country name in Bengali",
    "si": "Country name in Sinhala",
    "ta": "Country name in Tamil"
  }
}

Respond with ONLY the JSON, no markdown or explanation.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 10,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return { valid: false, error: "Validation service unavailable" };
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean up the response (remove markdown code blocks if present)
    const cleanedText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const result = JSON.parse(cleanedText) as GeminiValidationResult;
    return result;
  } catch (error) {
    console.error("Gemini validation error:", error);
    return { valid: false, error: "Failed to validate country" };
  }
}

async function triggerGitHubWorkflowWithValidatedData(
  token: string,
  repo: string,
  countryName: string,
  requestId: number,
  validatedData: string
) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/add-country.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Unbiased-App",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          country_name: countryName,
          request_id: requestId.toString(),
          validated_data: validatedData,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
  }
}

async function triggerGitHubWorkflowWithFeedback(
  token: string,
  repo: string,
  countryName: string,
  requestId: number,
  fixFeedback: string
) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/add-country.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Unbiased-App",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          country_name: countryName,
          request_id: requestId.toString(),
          fix_feedback: fixFeedback,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
  }
}

async function sendTelegramManualRequestNotification(
  botToken: string,
  chatId: string,
  countryName: string,
  requestId: number,
  validatedData: GeminiValidationResult,
  requesterEmail?: string
) {
  const message = `🌍 *New Country Request*

*Country:* ${countryName}
*Code:* ${validatedData.code || 'N/A'}
*Currency:* ${validatedData.currency || 'N/A'} (${validatedData.currencySymbol || 'N/A'})
*Flag:* ${validatedData.flag || 'N/A'}

*Requester:* ${requesterEmail || 'Anonymous'}
*Request ID:* #${requestId}

📋 *Validated Data Available*
The system has validated this country and prepared all necessary data. Click "View Data" to see the full validation result, then manually add the country to the codebase.

When you're done adding the country and deploying, click the ✅ *Done* button below.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Done (Deployed)", callback_data: `done:${requestId}` },
      ],
      [
        { text: "❌ Reject Request", callback_data: `cancel:${requestId}` },
      ],
    ],
  };

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }),
  });
}

async function sendTelegramPreviewNotification(
  botToken: string,
  chatId: string,
  countryName: string,
  previewUrl: string,
  requestId: number
) {
  const message = `🌍 *New Country Request*\n\n*Country:* ${countryName}\n*Preview:* ${previewUrl}\n\nPlease review and approve, reject, or request fixes.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve:${requestId}` },
        { text: "🔄 Retry", callback_data: `reject:${requestId}` },
      ],
      [
        { text: "🔧 Fix with Feedback", callback_data: `fix:${requestId}` },
      ],
      [{ text: "🔗 View Preview", url: previewUrl }],
    ],
  };

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }),
  });
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
    }),
  });
}

async function mergePullRequest(token: string, repo: string, prNumber: number) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Unbiased-App",
      },
      body: JSON.stringify({
        merge_method: "squash",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to merge PR: ${response.status}`);
  }
}

async function closePullRequest(token: string, repo: string, prNumber: number) {
  await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      state: "closed",
    }),
  });
}

// Email notification functions using Resend

interface SendEmailParams {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ apiKey, from, to, subject, html }: SendEmailParams) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

async function sendRequestConfirmationEmail(
  apiKey: string,
  from: string,
  to: string,
  countryName: string,
  requestId: number
) {
  await sendEmail({
    apiKey,
    from,
    to,
    subject: `Country Request Received: ${countryName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Your Country Request Has Been Received</h2>
        <p>Thank you for requesting <strong>${countryName}</strong> to be added to Unbiased.</p>
        <p>Your request has been validated and submitted to our team for implementation. Here's what happens next:</p>
        <ol>
          <li>✅ Country validated successfully</li>
          <li>⏳ Our team prepares the necessary code and translations</li>
          <li>🚀 Once ready, the country goes live</li>
          <li>📧 You'll receive a notification when it's available</li>
        </ol>
        <p style="color: #666;">Request ID: #${requestId}</p>
        <p>We'll notify you when <strong>${countryName}</strong> is live on the platform.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated message from Unbiased.</p>
      </div>
    `,
  });
}

async function sendCountryLiveEmail(
  apiKey: string,
  from: string,
  to: string,
  countryName: string,
  siteUrl: string
) {
  await sendEmail({
    apiKey,
    from,
    to,
    subject: `${countryName} is Now Live on Unbiased!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Great News! 🎉</h2>
        <p><strong>${countryName}</strong> is now live on Unbiased!</p>
        <p>You can now analyze development projects and feasibility studies for ${countryName}.</p>
        <p style="margin: 20px 0;">
          <a href="${siteUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Analyzing
          </a>
        </p>
        <p>Thank you for helping us expand our coverage!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated message from Unbiased.</p>
      </div>
    `,
  });
}

export { countryRequestRoutes };
