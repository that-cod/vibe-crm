import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { businessName, industry, teamSize, primaryUseCase } = await request.json()

        if (!businessName || !industry || !teamSize || !primaryUseCase) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            )
        }

        // Create or update business profile
        const profile = await prisma.businessProfile.upsert({
            where: { userId: session.user.id },
            update: {
                businessName,
                industry,
                teamSize,
                primaryUseCase,
            },
            create: {
                userId: session.user.id,
                businessName,
                industry,
                teamSize,
                primaryUseCase,
            },
        })

        return NextResponse.json({ success: true, profile })
    } catch (error) {
        console.error('Onboarding error:', error)
        return NextResponse.json(
            { error: 'Failed to save profile' },
            { status: 500 }
        )
    }
}

export async function GET(_request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const profile = await prisma.businessProfile.findUnique({
            where: { userId: session.user.id },
        })

        return NextResponse.json({ profile })
    } catch (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
