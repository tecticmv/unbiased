-- Country requests table for automated country addition workflow
CREATE TABLE IF NOT EXISTS country_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_name TEXT NOT NULL,
  validated_data TEXT, -- JSON: validated country info from Gemini
  status TEXT NOT NULL DEFAULT 'pending', -- pending, validating, generating, preview, approved, rejected, live, failed
  branch_name TEXT,
  preview_url TEXT,
  pr_number INTEGER,
  error TEXT,
  telegram_chat_id TEXT,
  requester_name TEXT,
  requester_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  validated_at TEXT,
  generated_at TEXT,
  approved_at TEXT,
  rejected_at TEXT,
  live_at TEXT
);

-- Index for status lookups
CREATE INDEX IF NOT EXISTS idx_country_requests_status ON country_requests(status);
