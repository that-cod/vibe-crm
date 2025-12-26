-- Migration: Create CRM Data Storage Table
-- Created: 2025-12-26
-- Description: Creates a generic JSONB-based table for storing all CRM entity data
-- This allows dynamic entity storage without requiring schema migrations for each entity

-- ============================================
-- CRM Data Table (JSONB Storage)
-- ============================================
-- This table stores all CRM entity records using JSONB
-- Each row represents a single record of any entity type
-- Benefits:
--   - No schema migrations needed when adding entities/fields
--   - Flexible field types
--   - PostgreSQL JSONB indexing for fast queries
--   - Full-text search support

CREATE TABLE IF NOT EXISTS "crm_data" (
    -- Primary key (UUID)
    "id" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to the CRM project this data belongs to
    "project_id" TEXT NOT NULL,
    
    -- Entity type (e.g., 'leads', 'contacts', 'deals')
    -- Maps to Entity.tableName in CRMConfig
    "entity_type" TEXT NOT NULL,
    
    -- The actual record data stored as JSONB
    -- This includes all field values for the entity
    "data" JSONB NOT NULL DEFAULT '{}',
    
    -- User who created this record (for multi-user CRMs)
    "created_by" TEXT,
    
    -- User who last updated this record
    "updated_by" TEXT,
    
    -- Soft delete support
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "deleted_at" TIMESTAMP(3),
    
    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to crm_projects (ensures data is tied to a valid project)
    CONSTRAINT "crm_data_project_id_fkey" 
        FOREIGN KEY ("project_id") 
        REFERENCES "crm_projects" ("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Index on project_id for filtering by project
CREATE INDEX IF NOT EXISTS "crm_data_project_id_idx" 
ON "crm_data"("project_id");

-- Index on entity_type for filtering by entity
CREATE INDEX IF NOT EXISTS "crm_data_entity_type_idx" 
ON "crm_data"("entity_type");

-- Composite index for common query pattern (project + entity)
CREATE INDEX IF NOT EXISTS "crm_data_project_entity_idx" 
ON "crm_data"("project_id", "entity_type");

-- GIN index on JSONB data for efficient queries
CREATE INDEX IF NOT EXISTS "crm_data_data_gin_idx" 
ON "crm_data" USING GIN ("data");

-- Index for soft delete filtering
CREATE INDEX IF NOT EXISTS "crm_data_deleted_idx" 
ON "crm_data"("deleted") WHERE "deleted" = FALSE;

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS "crm_data_created_at_idx" 
ON "crm_data"("created_at" DESC);

-- ============================================
-- Trigger for auto-updating updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_crm_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_data_updated_at_trigger ON "crm_data";

CREATE TRIGGER crm_data_updated_at_trigger
    BEFORE UPDATE ON "crm_data"
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_data_updated_at();

-- ============================================
-- Helper Functions for JSONB Queries
-- ============================================

-- Function to search within JSONB data
-- Usage: SELECT * FROM crm_data WHERE search_crm_data(data, 'search term')
CREATE OR REPLACE FUNCTION search_crm_data(data JSONB, search_term TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN data::TEXT ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get nested JSONB value safely
-- Usage: SELECT safe_jsonb_get(data, 'company', 'name')
CREATE OR REPLACE FUNCTION safe_jsonb_get(data JSONB, VARIADIC keys TEXT[])
RETURNS JSONB AS $$
DECLARE
    result JSONB := data;
    key TEXT;
BEGIN
    FOREACH key IN ARRAY keys
    LOOP
        IF result IS NULL OR NOT result ? key THEN
            RETURN NULL;
        END IF;
        result := result -> key;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Verification Query
-- ============================================
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name = 'crm_data'
ORDER BY table_name;

-- Expected Result:
-- crm_data | 10
