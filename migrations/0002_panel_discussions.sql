-- Panel discussions table
CREATE TABLE IF NOT EXISTS panel_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  concluded_at TEXT,
  summary TEXT,
  FOREIGN KEY (report_slug) REFERENCES reports(slug)
);

CREATE INDEX IF NOT EXISTS idx_panel_discussions_report_slug ON panel_discussions(report_slug);
CREATE INDEX IF NOT EXISTS idx_panel_discussions_status ON panel_discussions(status);

-- Discussion messages table
CREATE TABLE IF NOT EXISTS discussion_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discussion_id INTEGER NOT NULL,
  participant_type TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  content TEXT NOT NULL,
  reply_to_id INTEGER,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (discussion_id) REFERENCES panel_discussions(id),
  FOREIGN KEY (reply_to_id) REFERENCES discussion_messages(id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_messages_discussion_id ON discussion_messages(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_messages_created_at ON discussion_messages(created_at);
