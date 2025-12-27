import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OnboardingForm from '@/components/onboarding-form'

export default async function OnboardingPage() {
    // Get the current session
    const session = await auth()

    // If not authenticated, redirect to home
    if (!session?.user?.id) {
        redirect('/')
    }

    // Check if user has already completed onboarding
    const profile = await prisma.businessProfile.findUnique({
        where: { userId: session.user.id }
    })

    // If profile exists, redirect to dashboard (skip onboarding)
    if (profile) {
        redirect('/dashboard')
    }

    // Show onboarding form for users who haven't completed it
    return <OnboardingForm userName={session.user.name || 'there'} />
}
