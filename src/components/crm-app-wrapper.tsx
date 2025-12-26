'use client'

import { Refine, CanAccess, Authenticated } from '@refinedev/core'
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'
import routerProvider from '@refinedev/nextjs-router'
import { liveProvider } from '@refinedev/supabase'
import { supabase } from '@/lib/supabase'
import { createJSONBDataProvider } from '@/lib/data-provider'
import { buildResourcesFromConfig } from '@/lib/resource-builder'
import { useMemo, type ReactNode } from 'react'
import type { CRMConfig } from '@/types/config'

/**
 * CRMAppWrapper - A complete Refine app wrapper for rendering CRM data
 * 
 * This component:
 * 1. Creates a JSONB data provider scoped to the project
 * 2. Builds Refine resources from the CRM config
 * 3. Wraps children with Refine provider
 * 
 * Use this when you have a known projectId and CRM config ready.
 */

interface CRMAppWrapperProps {
    /** Unique project ID for data isolation */
    projectId: string
    /** CRM configuration defining entities, views, etc. */
    config: CRMConfig
    /** Child components (usually a layout with views) */
    children: ReactNode
    /** Optional: Current user ID for audit trail */
    userId?: string
}

export function CRMAppWrapper({
    projectId,
    config,
    children,
    userId,
}: CRMAppWrapperProps) {
    // Create JSONB data provider scoped to this project
    const dataProvider = useMemo(() => {
        return createJSONBDataProvider(projectId)
    }, [projectId])

    // Build Refine resources from CRM config
    const resources = useMemo(() => {
        return buildResourcesFromConfig(config)
    }, [config])

    return (
        <RefineKbarProvider>
            <Refine
                routerProvider={routerProvider}
                dataProvider={dataProvider}
                liveProvider={liveProvider(supabase)}
                resources={resources}
                options={{
                    syncWithLocation: false, // Don't sync with URL in preview mode
                    warnWhenUnsavedChanges: true,
                    projectId: projectId, // Store for access in hooks
                }}
            >
                <RefineKbar />
                {children}
            </Refine>
        </RefineKbarProvider>
    )
}

export default CRMAppWrapper
