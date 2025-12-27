import { NextRequest, NextResponse } from 'next/server'
import { getTestProject, getDataRecords, type TestDataRecord } from '@/lib/test-storage'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/projects/[projectId]/migrate
 * 
 * Migrates data from in-memory test-storage to Supabase crm_data table
 * This enables persistent mode for the CRM
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params

        // 1. Get project from test storage
        const project = getTestProject(projectId)
        if (!project) {
            return NextResponse.json(
                { error: 'Project not found in test storage' },
                { status: 404 }
            )
        }

        // 2. Get all data records from test storage
        const testRecords = getDataRecords(projectId)
        if (!testRecords || testRecords.length === 0) {
            return NextResponse.json(
                { error: 'No data to migrate' },
                { status: 400 }
            )
        }

        console.log(`🔄 Migrating ${testRecords.length} records for project ${projectId}`)

        // 3. Transform test records to Supabase format
        const supabaseRecords = testRecords.map((record: TestDataRecord) => ({
            project_id: projectId,
            entity_type: record.entityType,
            data: record.data,
            created_at: record.createdAt,
            updated_at: record.updatedAt,
        }))

        // 4. Insert into Supabase (using upsert to avoid duplicates)
        const { data, error } = await supabase
            .from('crm_data')
            .upsert(supabaseRecords, {
                onConflict: 'id', // If record exists, update it
            })
            .select()

        if (error) {
            console.error('Supabase migration error:', error)
            return NextResponse.json(
                { error: 'Failed to migrate data to Supabase', details: error.message },
                { status: 500 }
            )
        }

        console.log(`✅ Successfully migrated ${data?.length || 0} records to Supabase`)

        return NextResponse.json({
            success: true,
            migratedCount: data?.length || 0,
            message: 'Data successfully migrated to persistent storage',
        })
    } catch (error) {
        console.error('Migration error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return NextResponse.json(
            { error: 'Migration failed', details: errorMessage },
            { status: 500 }
        )
    }
}
