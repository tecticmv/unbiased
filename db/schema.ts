import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  country: text("country").notNull(),
  projectDescription: text("project_description").notNull(),
  estimatedCost: integer("estimated_cost"),
  location: text("location"),
  projectType: text("project_type"),
  report: text("report", { mode: "json" }).notNull(),
  // Translations stored as JSON: { "dv": {...}, "hi": {...}, etc. }
  translations: text("translations", { mode: "json" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

// Panel discussions table
export const panelDiscussions = sqliteTable("panel_discussions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportSlug: text("report_slug").notNull().unique(),
  status: text("status").notNull().default("active"), // active, paused, concluded
  startedAt: text("started_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  concludedAt: text("concluded_at"),
  summary: text("summary"), // AI-generated summary when concluded
});

export type PanelDiscussion = typeof panelDiscussions.$inferSelect;
export type NewPanelDiscussion = typeof panelDiscussions.$inferInsert;

// Discussion messages table
export const discussionMessages = sqliteTable("discussion_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  discussionId: integer("discussion_id").notNull(),
  participantType: text("participant_type").notNull(), // 'user' | 'ai_economist' | 'ai_engineer' | etc.
  participantName: text("participant_name").notNull(),
  content: text("content").notNull(),
  replyToId: integer("reply_to_id"), // For threaded responses
  metadata: text("metadata", { mode: "json" }), // JSON: sentiment, references, etc.
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type DiscussionMessage = typeof discussionMessages.$inferSelect;
export type NewDiscussionMessage = typeof discussionMessages.$inferInsert;

// Discussion participants table (for presence tracking)
export const discussionParticipants = sqliteTable("discussion_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  discussionId: integer("discussion_id").notNull(),
  sessionId: text("session_id").notNull().unique(), // Unique browser session
  name: text("name").notNull(),
  lastHeartbeat: text("last_heartbeat")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  joinedAt: text("joined_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type DiscussionParticipant = typeof discussionParticipants.$inferSelect;
export type NewDiscussionParticipant = typeof discussionParticipants.$inferInsert;

// Unified jobs table (for deduplication and tracking all async operations)
// Supports: analysis, report_translation, discussion_translation
export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Job type: 'analysis' | 'report_translation' | 'discussion_translation'
  type: text("type").notNull(),
  // Unique job key for deduplication (e.g., "analysis:maldives:hash123" or "report_translation:slug:dv")
  jobKey: text("job_key").notNull().unique(),
  // Status: 'pending', 'in_progress', 'completed', 'failed'
  status: text("status").notNull().default("pending"),
  // Progress percentage (0-100), useful for analysis jobs
  progress: integer("progress").default(0),
  // Error message if failed
  error: text("error"),
  // Input data (JSON) - stores request parameters for the job
  // For analysis: { country, projectDescription, location }
  // For translation: { slug, language }
  input: text("input", { mode: "json" }),
  // Result reference - slug of the generated report or reference to cached translation
  resultSlug: text("result_slug"),
  // Partial result data (JSON) - stores streaming progress for analysis
  // For analysis: { detectedProjectType, verdict, overallScore, ... }
  partialResult: text("partial_result", { mode: "json" }),
  // Timestamps
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  // For stale job detection (jobs older than 10 minutes with in_progress status are considered stale)
  lastHeartbeat: text("last_heartbeat")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

// Job type constants
export const JOB_TYPES = {
  ANALYSIS: "analysis",
  REPORT_TRANSLATION: "report_translation",
  DISCUSSION_TRANSLATION: "discussion_translation",
  REPORT_REPAIR: "report_repair",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

// Discussion translations cache table
export const discussionTranslations = sqliteTable("discussion_translations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  discussionId: integer("discussion_id").notNull(),
  // Target language code
  language: text("language").notNull(),
  // Translated messages stored as JSON array
  translatedMessages: text("translated_messages", { mode: "json" }).notNull(),
  // Translated discussion summary (if concluded)
  translatedSummary: text("translated_summary"),
  // Track the message count at time of translation for cache invalidation
  messageCount: integer("message_count").notNull(),
  // Last message ID at time of translation (for incremental updates)
  lastMessageId: integer("last_message_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type DiscussionTranslation = typeof discussionTranslations.$inferSelect;
export type NewDiscussionTranslation = typeof discussionTranslations.$inferInsert;

// Country requests table (for tracking automated country addition requests)
export const countryRequests = sqliteTable("country_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Country name as requested by user
  countryName: text("country_name").notNull(),
  // Validated country data from Gemini (JSON)
  validatedData: text("validated_data", { mode: "json" }),
  // Status: 'pending', 'validating', 'generating', 'preview', 'approved', 'rejected', 'live', 'failed'
  status: text("status").notNull().default("pending"),
  // GitHub branch name
  branchName: text("branch_name"),
  // Preview URL from Cloudflare
  previewUrl: text("preview_url"),
  // GitHub PR number
  prNumber: integer("pr_number"),
  // Error message if failed
  error: text("error"),
  // Telegram chat ID for notifications
  telegramChatId: text("telegram_chat_id"),
  // Requester info
  requesterName: text("requester_name"),
  requesterEmail: text("requester_email"),
  // Timestamps
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  validatedAt: text("validated_at"),
  generatedAt: text("generated_at"),
  approvedAt: text("approved_at"),
  rejectedAt: text("rejected_at"),
  liveAt: text("live_at"),
});

export type CountryRequest = typeof countryRequests.$inferSelect;
export type NewCountryRequest = typeof countryRequests.$inferInsert;

// Country request status constants
export const COUNTRY_REQUEST_STATUS = {
  PENDING: "pending",
  VALIDATING: "validating",
  GENERATING: "generating",
  PREVIEW: "preview",
  APPROVED: "approved",
  REJECTED: "rejected",
  LIVE: "live",
  FAILED: "failed",
} as const;

export type CountryRequestStatus = (typeof COUNTRY_REQUEST_STATUS)[keyof typeof COUNTRY_REQUEST_STATUS];
