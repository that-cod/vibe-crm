import { NextRequest, NextResponse } from 'next/server'
import { generateFullCRM, validateCRM, type GenerationResult } from '@/lib/ai/orchestrator'
import { getErrorMessage } from '@/types/errors'
import {
    addProjectFromGenerationResult,
    seedSampleData,
    getAllTestProjects
} from '@/lib/test-storage'

/**
 * POST /api/generate-crm
 * 
 * Generate a new CRM configuration with sample data from a natural language prompt.
 * 
 * Returns:
 * - config: Complete CRM configuration (entities, views, navigation)
 * - sampleData: Pre-generated sample records for each entity
 * - dashboardConfig: Widget configuration for the dashboard
 * - resources: Refine.dev resource definitions
 * 
 * TESTING MODE:
 * - Database operations use in-memory storage
 * - Sample data is seeded automatically
 */
export async function POST(request: NextRequest) {
    try {
        const { prompt } = await request.json()

        if (!prompt || prompt.length < 20) {
            return NextResponse.json(
                { error: 'Prompt must be at least 20 characters' },
                { status: 400 }
            )
        }

        // Generate unique project ID
        const projectId = `project-${Date.now()}`

        console.log('🚀 Starting CRM generation...')
        console.log('Project ID:', projectId)
        console.log('Prompt:', prompt.substring(0, 100) + '...')

        // Generate complete CRM with sample data and dashboard
        const result: GenerationResult = await generateFullCRM(prompt, projectId, {
            industry: undefined,
            primaryUseCase: undefined,
        })

        // Validate the generated config (extra safety check)
        const validation = validateCRM(result.config)
        if (!validation.valid) {
            console.error('Validation errors:', validation.errors)
            return NextResponse.json(
                { error: 'Invalid CRM configuration', details: validation.errors },
                { status: 400 }
            )
        }

        // Store project with all generation artifacts
        addProjectFromGenerationResult(projectId, prompt, result)

        // Seed sample data into in-memory storage
        const recordCount = seedSampleData(projectId, result.sampleData)
        console.log(`✅ Seeded ${recordCount} sample data records`)

        console.log('✅ CRM generation complete!')
        console.log('  - Entities:', result.config.entities.length)
        console.log('  - Views:', result.config.views.length)
        console.log('  - Dashboard widgets:', result.dashboardConfig.widgets.length)
        console.log('  - Sample records:', recordCount)

        // Return complete generation result
        return NextResponse.json({
            success: true,
            projectId,
            config: result.config,
            sampleData: result.sampleData,
            dashboardConfig: result.dashboardConfig,
            resources: result.resources,
            previewUrl: `/dashboard/preview/${projectId}`,
            meta: result.meta,
        })
    } catch (error) {
        console.error('CRM generation error:', error)
        const errorMessage = getErrorMessage(error)

        return NextResponse.json(
            { error: 'CRM generation failed', details: errorMessage },
            { status: 500 }
        )
    }
}

/**
 * GET /api/generate-crm
 * 
 * Retrieve user's projects with their configs
 */
export async function GET(_request: NextRequest) {
    try {
        console.log('📋 Fetching projects...')

        // Return in-memory projects for testing
        const allProjects = getAllTestProjects()
        const projects = allProjects
            .slice(0, 20)
            .map(p => ({
                id: p.id,
                projectName: p.projectName,
                status: p.status,
                createdAt: p.createdAt.toISOString(),
                entityCount: p.config?.entities?.length || 0,
                hasData: p.sampleData?.entities?.some(e => e.records.length > 0) || false,
            }))

        return NextResponse.json({
            projects,
            total: allProjects.length
        })
    } catch (error) {
        console.error('Error fetching projects:', error)
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        )
    }
}
