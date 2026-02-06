-- Discussion participants table (for presence tracking)
CREATE TABLE IF NOT EXISTS discussion_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discussion_id INTEGER NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  last_heartbeat TEXT NOT NULL DEFAULT (datetime('now')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (discussion_id) REFERENCES panel_discussions(id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_participants_discussion_id ON discussion_participants(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_participants_session_id ON discussion_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_discussion_participants_last_heartbeat ON discussion_participants(last_heartbeat);
