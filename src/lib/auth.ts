import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
    ],
    callbacks: {
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id

                // Check if user has completed onboarding
                const profile = await prisma.businessProfile.findUnique({
                    where: { userId: user.id },
                })

                session.user.hasCompletedOnboarding = !!profile
            }
            return session
        },
        async signIn({ user, account, profile }) {
            // Allow sign-in to proceed
            return true
        },
        async redirect({ url, baseUrl }) {
            // If callback URL is specified, use it
            if (url.startsWith("/")) return `${baseUrl}${url}`
            else if (new URL(url).origin === baseUrl) return url

            // Default redirect to onboarding - the onboarding page will redirect to dashboard if profile exists
            return `${baseUrl}/onboarding`
        },
    },
    pages: {
        signIn: '/',
        error: '/',
    },
    session: {
        strategy: "database",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    debug: process.env.NODE_ENV === "development",
})
