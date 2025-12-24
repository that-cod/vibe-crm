import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteUserSchema } from '@/lib/supabase'
import { getErrorMessage } from '@/types/errors'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectId } = await context.params

        const project = await prisma.cRMProject.findFirst({
            where: {
                id: projectId,
                userId: session.user.id, // Ensure user can only access their own projects
            },
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        return NextResponse.json({ project })
    } catch (error) {
        console.error('Error fetching project:', error)
        return NextResponse.json(
            { error: 'Failed to fetch project' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { projectId } = await context.params

        // Find project and verify ownership
        const project = await prisma.cRMProject.findFirst({
            where: {
                id: projectId,
                userId: session.user.id, // Ensure user can only delete their own projects
            },
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Step 1: Drop the PostgreSQL schema (CASCADE removes all tables)
        console.log(`Deleting schema: ${project.schemaName}`)
        const schemaResult = await deleteUserSchema(project.schemaName)

        if (!schemaResult.success) {
            console.error('Failed to delete schema:', schemaResult.error)
            // Continue to delete project record even if schema deletion fails
            // (schema might already be deleted manually)
        }

        // Step 2: Delete customization history
        await prisma.cRMCustomization.deleteMany({
            where: { projectId }
        })

        // Step 3: Delete project record
        await prisma.cRMProject.delete({
            where: { id: projectId }
        })

        console.log(`Project ${projectId} deleted successfully`)

        return NextResponse.json({
            success: true,
            message: 'Project and associated schema deleted successfully'
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
