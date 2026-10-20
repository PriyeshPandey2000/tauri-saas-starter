-- Add created_at to notes; existing rows default to their updated_at value.
ALTER TABLE notes ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
UPDATE notes SET created_at = updated_at WHERE created_at = '';
