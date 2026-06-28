ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN file_name TEXT;
ALTER TABLE messages ADD COLUMN mime_type TEXT;
ALTER TABLE messages ADD COLUMN size_bytes INTEGER;
ALTER TABLE messages ADD COLUMN storage_key TEXT;
