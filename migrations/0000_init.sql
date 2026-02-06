CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  project_description TEXT NOT NULL,
  estimated_cost INTEGER,
  location TEXT,
  project_type TEXT,
  report TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_slug ON reports(slug);
CREATE INDEX IF NOT EXISTS idx_reports_country ON reports(country);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
