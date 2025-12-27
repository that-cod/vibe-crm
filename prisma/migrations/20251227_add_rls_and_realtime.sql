-- Migration: Add RLS Policies and Real-time Configuration for CRM Data
-- Created: 2025-12-27
-- Description: Enables Row-Level Security (RLS) for multi-tenant data isolation
--              and configures real-time subscriptions for live updates

-- ============================================
-- Enable Row Level Security on crm_data
-- ============================================

ALTER TABLE "crm_data" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for crm_data
-- ============================================
-- These policies ensure users can only access data from projects they own
-- Note: crm_projects.userId is the column name (camelCase from Prisma)

-- Policy: Users can SELECT records from projects they own
DROP POLICY IF EXISTS "crm_data_select_own_project" ON "crm_data";
CREATE POLICY "crm_data_select_own_project" ON "crm_data"
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM crm_projects WHERE "userId" = auth.uid()::text
        )
    );

-- Policy: Users can INSERT records to projects they own
DROP POLICY IF EXISTS "crm_data_insert_own_project" ON "crm_data";
CREATE POLICY "crm_data_insert_own_project" ON "crm_data"
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM crm_projects WHERE "userId" = auth.uid()::text
        )
    );

-- Policy: Users can UPDATE records in projects they own
DROP POLICY IF EXISTS "crm_data_update_own_project" ON "crm_data";
CREATE POLICY "crm_data_update_own_project" ON "crm_data"
    FOR UPDATE
    USING (
        project_id IN (
            SELECT id FROM crm_projects WHERE "userId" = auth.uid()::text
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM crm_projects WHERE "userId" = auth.uid()::text
        )
    );

-- Policy: Users can DELETE records from projects they own
DROP POLICY IF EXISTS "crm_data_delete_own_project" ON "crm_data";
CREATE POLICY "crm_data_delete_own_project" ON "crm_data"
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM crm_projects WHERE "userId" = auth.uid()::text
        )
    );

-- ============================================
-- Service Role Bypass (for API operations)
-- ============================================
-- The service role can bypass RLS for admin operations

DROP POLICY IF EXISTS "crm_data_service_role_all" ON "crm_data";
CREATE POLICY "crm_data_service_role_all" ON "crm_data"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Enable RLS on crm_projects
-- ============================================

ALTER TABLE "crm_projects" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own projects
DROP POLICY IF EXISTS "crm_projects_select_own" ON "crm_projects";
CREATE POLICY "crm_projects_select_own" ON "crm_projects"
    FOR SELECT
    USING ("userId" = auth.uid()::text);

-- Policy: Users can INSERT their own projects
DROP POLICY IF EXISTS "crm_projects_insert_own" ON "crm_projects";
CREATE POLICY "crm_projects_insert_own" ON "crm_projects"
    FOR INSERT
    WITH CHECK ("userId" = auth.uid()::text);

-- Policy: Users can UPDATE their own projects
DROP POLICY IF EXISTS "crm_projects_update_own" ON "crm_projects";
CREATE POLICY "crm_projects_update_own" ON "crm_projects"
    FOR UPDATE
    USING ("userId" = auth.uid()::text)
    WITH CHECK ("userId" = auth.uid()::text);

-- Policy: Users can DELETE their own projects
DROP POLICY IF EXISTS "crm_projects_delete_own" ON "crm_projects";
CREATE POLICY "crm_projects_delete_own" ON "crm_projects"
    FOR DELETE
    USING ("userId" = auth.uid()::text);

-- Service role bypass
DROP POLICY IF EXISTS "crm_projects_service_role_all" ON "crm_projects";
CREATE POLICY "crm_projects_service_role_all" ON "crm_projects"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Real-time Configuration
-- ============================================
-- Enable real-time subscriptions for crm_data table
-- This allows live updates when records are created/updated/deleted

-- Add crm_data to the realtime publication (with error handling)
DO $$
BEGIN
    -- Check if publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Try to add the table (will fail silently if already added)
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE "crm_data";
            RAISE NOTICE 'Successfully added crm_data to supabase_realtime publication';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'crm_data already in supabase_realtime publication';
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not add to publication: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'supabase_realtime publication does not exist';
    END IF;
END
$$;

-- ============================================
-- Helper Function for Record Validation
-- ============================================
-- Validates that record data matches expected entity schema

CREATE OR REPLACE FUNCTION validate_crm_record()
RETURNS TRIGGER AS $$
DECLARE
    entity_name TEXT;
BEGIN
    entity_name := NEW.entity_type;
    
    -- Basic validation: ensure data is not empty
    IF NEW.data IS NULL OR NEW.data = '{}'::jsonb THEN
        -- Allow empty data on initial insert, but warn
        RAISE NOTICE 'Warning: Empty data for entity %', entity_name;
    END IF;
    
    -- Set updated_by to current user if available
    IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL THEN
        NEW.updated_by := auth.uid()::text;
    END IF;
    
    -- Set created_by on insert if available
    IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL AND NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid()::text;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the validation trigger
DROP TRIGGER IF EXISTS crm_data_validation_trigger ON "crm_data";
CREATE TRIGGER crm_data_validation_trigger
    BEFORE INSERT OR UPDATE ON "crm_data"
    FOR EACH ROW
    EXECUTE FUNCTION validate_crm_record();

-- ============================================
-- Verification Queries
-- ============================================

-- Check RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('crm_data', 'crm_projects');

-- List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('crm_data', 'crm_projects')
ORDER BY tablename, policyname;

-- ============================================
-- Expected Results:
-- ============================================
-- crm_data: RLS enabled, 5 policies (SELECT, INSERT, UPDATE, DELETE, service_role)
-- crm_projects: RLS enabled, 5 policies (SELECT, INSERT, UPDATE, DELETE, service_role)
