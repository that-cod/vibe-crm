import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCRM, validateCRM } from '@/lib/ai/orchestrator'
import { getErrorMessage } from '@/types/errors'

/**
 * POST /api/generate-crm
 * 
 * Generate a new CRM configuration from a natural language prompt.
 * 
 * NEW BEHAVIOR (Phase 4):
 * - Returns CRMConfig JSON (not code)
 * - No SQL/TSX generation
 * - Instant preview possible
 * - Config stored in database
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id
        const { prompt } = await request.json()

        if (!prompt || prompt.length < 20) {
            return NextResponse.json(
                { error: 'Prompt must be at least 20 characters' },
                { status: 400 }
            )
        }

        // Check resource quota
        const MAX_CRMS_PER_USER = 10
        const existingProjectCount = await prisma.cRMProject.count({
            where: { userId }
        })

        if (existingProjectCount >= MAX_CRMS_PER_USER) {
            return NextResponse.json(
                {
                    error: 'CRM limit reached',
                    message: `You have reached the maximum limit of ${MAX_CRMS_PER_USER} CRMs. Please delete an existing CRM to create a new one.`,
                    currentCount: existingProjectCount,
                    limit: MAX_CRMS_PER_USER
                },
                { status: 403 }
            )
        }

        // Get user's business profile
        // Get user's business profile
        const businessProfile = await prisma.businessProfile.findUnique({
            where: { userId }
        })

        // STEP 1: Generate CRM Configuration (Phase 4: JSON Config)
        console.log('Step 1: Generating CRM configuration...')
        const config = await generateCRM(prompt, {
            industry: businessProfile?.industry,
            primaryUseCase: businessProfile?.primaryUseCase,
        })

        // Validation is done inside generateCRM(), but double-check
        const validation = validateCRM(config)
        if (!validation.valid) {
            return NextResponse.json(
                { error: 'Invalid CRM configuration', details: validation.errors },
                { status: 400 }
            )
        }

        // STEP 2: Save project to database (config instead of code)
        console.log('Step 2: Saving project...')
        const project = await prisma.cRMProject.create({
            data: {
                userId,
                projectName: config.name || 'My CRM',
                schemaName: '', // No longer needed with config approach
                originalPrompt: prompt,
                generatedSchema: config as any,  // Store CRMConfig in generatedSchema
                generatedSQL: '',  // No longer generating SQL
                generatedCode: JSON.stringify({ config }),  // Store config in generatedCode for now
                status: 'completed',
            },
        })

        console.log('✅ CRM configuration generated successfully!')

        return NextResponse.json({
            success: true,
            projectId: project.id,
            config,
            previewUrl: `/crm/${config.entities[0]?.id || ''}`,  // Link to first entity
        })
    } catch (error) {
        console.error('CRM generation error:', error)
        const errorMessage = getErrorMessage(error)

        // Try to save failed attempt
        try {
            const session = await auth()
            if (session?.user?.id) {
                const { prompt } = await request.json()
                await prisma.cRMProject.create({
                    data: {
                        userId: session.user.id,
                        projectName: 'Failed Generation',
                        schemaName: '',
                        originalPrompt: prompt || '',
                        generatedSchema: {},
                        generatedSQL: '',
                        generatedCode: '',
                        status: 'failed',
                    },
                })
            }
        } catch { }

        return NextResponse.json(
            { error: 'CRM generation failed', details: errorMessage },
            { status: 500 }
        )
    }
}

// GET endpoint to retrieve user's projects
export async function GET(_request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const projects = await prisma.cRMProject.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                projectName: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return NextResponse.json({ projects })
    } catch (error) {
        console.error('Error fetching projects:', error)
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        )
    }
}
