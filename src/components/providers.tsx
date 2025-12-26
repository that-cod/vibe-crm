"use client"

import { SessionProvider } from "next-auth/react"
import { CRMProvider } from "./crm-provider"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <CRMProvider>
                {children}
            </CRMProvider>
        </SessionProvider>
    )
}
