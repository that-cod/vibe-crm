import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parsePromptToCRMSpec, validateCRMSpec } from '@/lib/ai/orchestrator'
import { generateSQL, generateSchemaName } from '@/lib/ai/schema-generator'
import { generateRefineApp } from '@/lib/ai/code-generator'
import { createUserSchema, executeInSchema } from '@/lib/supabase'
import { getErrorMessage } from '@/types/errors'

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

        // Check resource quota: Limit CRMs per user to prevent abuse
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
        const businessProfile = await prisma.businessProfile.findUnique({
            where: { userId },
        })

        // STEP 1: Parse prompt to CRM specification
        console.log('Step 1: Parsing prompt to CRM spec...')
        const crmSpec = await parsePromptToCRMSpec(prompt, {
            industry: businessProfile?.industry,
            primaryUseCase: businessProfile?.primaryUseCase,
        })

        // Validate the spec
        const validation = validateCRMSpec(crmSpec)
        if (!validation.valid) {
            return NextResponse.json(
                { error: 'Invalid CRM specification', details: validation.errors },
                { status: 400 }
            )
        }

        // STEP 2: Generate schema name and SQL
        console.log('Step 2: Generating SQL schema...')
        const schemaName = generateSchemaName(userId)
        const sql = generateSQL(crmSpec, schemaName)

        // STEP 3: Create PostgreSQL schema in Supabase
        console.log('Step 3: Creating database schema...')
        const schemaResult = await createUserSchema(schemaName)
        if (!schemaResult.success) {
            return NextResponse.json(
                { error: 'Failed to create database schema', details: schemaResult.error },
                { status: 500 }
            )
        }

        // STEP 4: Execute SQL to create tables
        console.log('Step 4: Creating tables...')
        const sqlResult = await executeInSchema(schemaName, sql)
        if (!sqlResult.success) {
            return NextResponse.json(
                { error: 'Failed to create tables', details: sqlResult.error },
                { status: 500 }
            )
        }

        // STEP 5: Generate Refine.dev code
        console.log('Step 5: Generating application code...')
        const generatedCode = await generateRefineApp(crmSpec, schemaName)

        // STEP 6: Save project to database
        console.log('Step 6: Saving project...')
        const project = await prisma.cRMProject.create({
            data: {
                userId,
                projectName: crmSpec.tables[0]?.displayName + ' CRM' || 'My CRM',
                schemaName,
                originalPrompt: prompt,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                generatedSchema: crmSpec as any,
                generatedSQL: sql,
                generatedCode: JSON.stringify(generatedCode),
                status: 'completed',
            },
        })

        console.log('✅ CRM generation completed successfully!')

        return NextResponse.json({
            success: true,
            projectId: project.id,
            schemaName,
            spec: crmSpec,
            previewUrl: `/dashboard/preview/${project.id}`,
        })
    } catch (error) {
        console.error('CRM generation error:', error)
        const errorMessage = getErrorMessage(error)

        // Try to save failed project
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
