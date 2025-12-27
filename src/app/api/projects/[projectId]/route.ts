import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/types/errors'
import { getTestProject } from '@/lib/test-storage'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await context.params

        console.log('⚠️ TESTING MODE: Fetching project from in-memory storage:', projectId)

        // Try to get from in-memory storage
        const testProject = getTestProject(projectId)

        if (testProject) {
            // Transform to match expected format
            return NextResponse.json({
                project: {
                    id: testProject.id,
                    projectName: testProject.projectName,
                    schemaName: '',
                    originalPrompt: testProject.originalPrompt,
                    generatedSchema: testProject.config, // This is the CRMConfig
                    generatedSQL: '',
                    generatedCode: JSON.stringify({ config: testProject.config }),
                    status: testProject.status,
                    createdAt: testProject.createdAt.toISOString(),
                }
            })
        }

        // Project not found
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    } catch (error) {
        console.error('Error fetching project:', error)
        return NextResponse.json(
            { error: 'Failed to fetch project', details: getErrorMessage(error) },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await context.params

        console.log('⚠️ TESTING MODE: Delete not supported in testing mode')

        return NextResponse.json({
            success: true,
            message: 'Project deleted (testing mode - no actual deletion)'
        })
    } catch (error) {
        console.error('Error deleting project:', error)
        const errorMessage = getErrorMessage(error)
        return NextResponse.json(
            { error: 'Failed to delete project', details: errorMessage },
            { status: 500 }
        )
    }
}
