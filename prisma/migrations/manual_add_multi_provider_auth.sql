-- Manual Migration: Add Multi-Provider Authentication Support
-- Created: 2025-12-25
-- Description: Adds password and githubId fields to users table for email/password and GitHub OAuth authentication

-- Add password column for email/password authentication (optional, nullable)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- Add githubId column for GitHub OAuth (optional, nullable, unique)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "githubId" TEXT;

-- Add unique constraint for githubId (only if column was just added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_githubId_key'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_githubId_key" UNIQUE ("githubId");
    END IF;
END $$;

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('password', 'githubId', 'googleId');
