import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { modifyCRM } from '@/lib/ai/orchestrator'
import type { CRMConfig } from '@/types/config'

/**
 * POST /api/modify-crm
 * 
 * Modify an existing CRM configuration based on a natural language prompt.
 * 
 * Example requests:
 * - "Add a field for property value"
 * - "Change lead statuses to have 5 stages"
 * - "Add a new entity for Tasks"
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id
        const { projectId, prompt } = await request.json()

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            )
        }

        if (!prompt || prompt.length < 10) {
            return NextResponse.json(
                { error: 'Modification prompt must be at least 10 characters' },
                { status: 400 }
            )
        }

        // Get existing project
        const project = await prisma.cRMProject.findUnique({
            where: { id: projectId, userId },  // Ensure user owns the project
        })

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        // Extract existing config from project
        const existingConfig = project.generatedSchema as Partial<CRMConfig>

        if (!existingConfig || !existingConfig.entities) {
            return NextResponse.json(
                { error: 'Invalid project configuration' },
                { status: 400 }
            )
        }

        // STEP 1: Modify configuration
        console.log('Step 1: Modifying CRM configuration...')
        const updatedConfig = await modifyCRM(existingConfig as CRMConfig, prompt)

        // STEP 2: Update project in database
        console.log('Step 2: Updating project...')
        const updatedProject = await prisma.cRMProject.update({
            where: { id: projectId },
            data: {
                projectName: updatedConfig.name || project.projectName,
                generatedSchema: updatedConfig as any,
                generatedCode: JSON.stringify({ config: updatedConfig }),
                updatedAt: new Date(),
            },
        })

        console.log('✅ CRM configuration modified successfully!')

        return NextResponse.json({
            success: true,
            projectId: updatedProject.id,
            config: updatedConfig,
            changelog: {
                // Would need to implement diff logic to show what changed
                message: `Modified based on: "${prompt}"`,
            },
        })
    } catch (error) {
        console.error('CRM modification error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return NextResponse.json(
            { error: 'CRM modification failed', details: errorMessage },
            { status: 500 }
        )
    }
}
