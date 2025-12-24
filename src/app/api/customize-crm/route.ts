import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseCustomizationPrompt, applyCustomizationToSpec, generateCustomizationSQL, generateRollbackSQL } from '@/lib/ai/customization-parser'
import { generateRefineApp } from '@/lib/ai/code-generator'
import { executeInSchema } from '@/lib/supabase'
import { CRMSpec } from '@/lib/ai/orchestrator'
import { getErrorMessage } from '@/types/errors'

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectId, prompt } = await request.json()

        if (!projectId || !prompt) {
            return NextResponse.json(
                { error: 'Project ID and customization prompt are required' },
                { status: 400 }
            )
        }

        if (prompt.length < 10) {
            return NextResponse.json(
                { error: 'Customization prompt must be at least 10 characters' },
                { status: 400 }
            )
        }

        // Fetch the project
        const project = await prisma.cRMProject.findFirst({
            where: {
                id: projectId,
                userId: session.user.id, // Ensure user owns the project
            },
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        const currentSpec = project.generatedSchema as unknown as CRMSpec

        // STEP 1: Parse the customization request
        console.log('Step 1: Parsing customization request...')
        const customization = await parseCustomizationPrompt(
            prompt,
            currentSpec,
            project.schemaName
        )

        // STEP 2: Apply changes to CRM spec
        console.log('Step 2: Applying changes to CRM spec...')
        const updatedSpec = applyCustomizationToSpec(currentSpec, customization)

        // STEP 3: Generate incremental SQL
        console.log('Step 3: Generating SQL changes...')
        const customizationSQL = generateCustomizationSQL(customization, project.schemaName)

        // Generate rollback SQL (attempt to create inverse operations)
        const rollbackSQL = generateRollbackSQL(customization, project.schemaName)

        // STEP 4: Execute SQL changes
        console.log('Step 4: Applying database changes...')
        const sqlResult = await executeInSchema(project.schemaName, customizationSQL)

        if (!sqlResult.success) {
            // Save failed customization with version info
            await prisma.cRMCustomization.create({
                data: {
                    projectId,
                    prompt,
                    schemaVersion: project.currentVersion,
                    previousVersion: project.currentVersion,
                    canRollback: false,
                    rollbackSQL: null,
                    changes: {
                        error: sqlResult.error,
                        customization,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any,
                },
            })

            return NextResponse.json(
                { error: 'Failed to apply SQL changes', details: sqlResult.error },
                { status: 500 }
            )
        }

        // STEP 5: Regenerate code with updated spec
        console.log('Step 5: Regenerating application code...')
        const updatedCode = await generateRefineApp(updatedSpec, project.schemaName)

        // STEP 6: Update project in database with version increment
        console.log('Step 6: Saving updated project...')
        const newVersion = project.currentVersion + 1
        await prisma.cRMProject.update({
            where: { id: projectId },
            data: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                generatedSchema: updatedSpec as any,
                generatedSQL: project.generatedSQL + `\n\n-- Customization v${newVersion} Applied:\n` + customizationSQL,
                generatedCode: JSON.stringify(updatedCode),
                currentVersion: newVersion,
                updatedAt: new Date(),
            },
        })

        // STEP 7: Save customization history with versioning
        await prisma.cRMCustomization.create({
            data: {
                projectId,
                prompt,
                schemaVersion: newVersion,
                previousVersion: project.currentVersion,
                canRollback: rollbackSQL !== null,
                rollbackSQL: rollbackSQL,
                changes: {
                    customization,
                    success: true,
                    sqlApplied: customizationSQL,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
            },
        })

        console.log('✅ Customization applied successfully!')

        return NextResponse.json({
            success: true,
            customization,
            updatedSpec,
            message: 'Customization applied successfully',
        })
    } catch (error) {
        console.error('Customization error:', error)
        const errorMessage = getErrorMessage(error)

        // Try to save failed attempt
        try {
            const { projectId, prompt } = await request.json()
            if (projectId && prompt) {
                await prisma.cRMCustomization.create({
                    data: {
                        projectId,
                        prompt,
                        schemaVersion: 1,
                        previousVersion: 1,
                        canRollback: false,
                        rollbackSQL: null,
                        changes: {
                            error: errorMessage,
                            failed: true,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any,
                    },
                })
            }
        } catch { }

        return NextResponse.json(
            { error: 'Customization failed', details: errorMessage },
            { status: 500 }
        )
    }
}

// GET endpoint to retrieve customization history
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('projectId')

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            )
        }

        // Verify user owns the project
        const project = await prisma.cRMProject.findFirst({
            where: {
                id: projectId,
                userId: session.user.id,
            },
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Fetch customization history
        const customizations = await prisma.cRMCustomization.findMany({
            where: { projectId },
            orderBy: { appliedAt: 'desc' },
            select: {
                id: true,
                prompt: true,
                changes: true,
                appliedAt: true,
            },
        })

        return NextResponse.json({ customizations })
    } catch (error) {
        console.error('Error fetching customizations:', error)
        return NextResponse.json(
            { error: 'Failed to fetch customizations' },
            { status: 500 }
        )
    }
}
