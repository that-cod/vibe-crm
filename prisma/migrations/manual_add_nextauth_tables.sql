-- Manual Migration: Add NextAuth Required Tables
-- Created: 2025-12-25  
-- Description: Adds Account, Session, and VerificationToken tables required by NextAuth.js Prisma adapter
-- CRITICAL: This migration must be run to fix authentication errors

-- ============================================
-- NextAuth: Account table for OAuth providers
-- ============================================
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint for provider + providerAccountId
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" 
ON "accounts"("provider", "providerAccountId");

-- Create index on userId for faster lookups
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");

-- ============================================
-- NextAuth: Session table for database sessions
-- ============================================
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique index on sessionToken
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- Create index on userId for faster lookups
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");

-- ============================================
-- NextAuth: VerificationToken table for email verification
-- ============================================
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expires" TIMESTAMP(3) NOT NULL
);

-- Create unique constraint for identifier + token
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" 
ON "verification_tokens"("identifier", "token");

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");

-- ============================================
-- Update User table relations (if needed)
-- ============================================
-- The User table already exists, relationships are handled by foreign keys above

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify all tables were created successfully
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'accounts', 'sessions', 'verification_tokens', 'business_profiles', 'crm_projects')
ORDER BY table_name;

-- ============================================
-- Expected Result:
-- ============================================
-- accounts                  | 12
-- business_profiles         | 7
-- crm_projects             | 12
-- sessions                 | 4
-- users                    | 11
-- verification_tokens      | 3
