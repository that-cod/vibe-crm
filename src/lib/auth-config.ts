// Auth provider configuration
// This file determines which authentication providers are available

export const authConfig = {
    providers: {
        google: {
            enabled: true,
            name: 'Google',
        },
        github: {
            // GitHub OAuth is disabled until credentials are configured
            // To enable: Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env
            enabled: !!process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED,
            name: 'GitHub',
        },
        email: {
            enabled: true,
            name: 'Email',
        },
    },
} as const

export type AuthProvider = keyof typeof authConfig.providers
