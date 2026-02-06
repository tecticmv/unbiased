-- Add translations column to store cached translations as JSON
ALTER TABLE reports ADD COLUMN translations TEXT;
