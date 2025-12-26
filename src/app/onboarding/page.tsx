import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OnboardingForm from '@/components/onboarding-form'

export default async function OnboardingPage() {
    // Check if user is authenticated
    const session = await auth()

    if (!session?.user?.id) {
        redirect('/')
    }

    // Check if user has already completed onboarding
    const profile = await prisma.businessProfile.findUnique({
        where: { userId: session.user.id }
    })

    // If profile exists, redirect to dashboard (server-side, no flash)
    if (profile) {
        redirect('/dashboard')
    }

    // User needs to complete onboarding, render the form
    return <OnboardingForm userName={session.user.name} />
}
