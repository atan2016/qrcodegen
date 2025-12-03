-- Create session table for connect-pg-simple
-- This table is usually created automatically by connect-pg-simple,
-- but you can run this manually if needed

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL ON TABLE "session" TO postgres;

