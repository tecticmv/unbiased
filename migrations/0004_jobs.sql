-- Unified jobs table (for deduplication and tracking all async operations)
-- Supports: analysis, report_translation, discussion_translation
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'analysis', 'report_translation', 'discussion_translation'
  job_key TEXT NOT NULL UNIQUE, -- Unique key for deduplication
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
  error TEXT,
  input TEXT, -- JSON: request parameters
  result_slug TEXT, -- Reference to generated report slug
  partial_result TEXT, -- JSON: streaming progress data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  last_heartbeat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON jobs(type, status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- Discussion translations cache table
CREATE TABLE IF NOT EXISTS discussion_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discussion_id INTEGER NOT NULL,
  language TEXT NOT NULL,
  translated_messages TEXT NOT NULL, -- JSON array
  translated_summary TEXT,
  message_count INTEGER NOT NULL,
  last_message_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (discussion_id) REFERENCES panel_discussions(id)
);

-- Unique constraint: one translation per discussion per language
CREATE UNIQUE INDEX IF NOT EXISTS idx_discussion_translations_unique
  ON discussion_translations(discussion_id, language);

CREATE INDEX IF NOT EXISTS idx_discussion_translations_discussion_id ON discussion_translations(discussion_id);
