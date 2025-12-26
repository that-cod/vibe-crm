'use client'

import { Refine } from '@refinedev/core'
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'
import routerProvider from '@refinedev/nextjs-router'
import { liveProvider } from '@refinedev/supabase'
import { supabase } from '@/lib/supabase'
import { createJSONBDataProvider } from '@/lib/data-provider'
import { loadCRMConfig } from '@/lib/config-loader'
import { buildResourcesFromConfig } from '@/lib/resource-builder'
import { useEffect, useState, useMemo } from 'react'
import type { CRMConfig } from '@/types/config'
import type { ResourceProps, DataProvider } from '@refinedev/core'

/**
 * CRMProvider - Wraps the app with Refine and provides dynamic resources
 * 
 * This provider:
 * 1. Loads the CRM configuration
 * 2. Creates a JSONB data provider scoped to the project
 * 3. Builds Refine resources from the config
 * 4. Initializes Refine with those resources
 * 
 * The JSONB data provider stores all entity data in a single crm_data table
 * using PostgreSQL JSONB, enabling dynamic schema without migrations.
 */

interface CRMProviderProps {
    children: React.ReactNode
    /** Project ID for data isolation - when set, all data operations are scoped to this project */
    projectId?: string
    /** Optional: Pre-loaded CRM config to avoid fetching */
    initialConfig?: CRMConfig
    /** Optional: User ID for audit trail (created_by, updated_by) */
    userId?: string
}

export function CRMProvider({
    children,
    projectId,
    initialConfig,
    userId
}: CRMProviderProps) {
    const [config, setConfig] = useState<CRMConfig | null>(initialConfig ?? null)
    const [resources, setResources] = useState<ResourceProps[]>([])
    const [isLoading, setIsLoading] = useState(!initialConfig)

    // Create the data provider - memoized to avoid recreating on every render
    const dataProvider: DataProvider = useMemo(() => {
        if (projectId) {
            // Use our custom JSONB data provider for project-scoped data
            return createJSONBDataProvider(projectId)
        }

        // Fallback: Return a minimal data provider that throws helpful errors
        // This handles the case when CRMProvider is used without a projectId
        return {
            getList: async () => {
                throw new Error('No projectId provided to CRMProvider. Data operations require a project context.')
            },
            getOne: async () => {
                throw new Error('No projectId provided to CRMProvider. Data operations require a project context.')
            },
            create: async () => {
                throw new Error('No projectId provided to CRMProvider. Data operations require a project context.')
            },
            update: async () => {
                throw new Error('No projectId provided to CRMProvider. Data operations require a project context.')
            },
            deleteOne: async () => {
                throw new Error('No projectId provided to CRMProvider. Data operations require a project context.')
            },
            getMany: async () => {
                throw new Error('No projectId provided to CRMProvider. Data operations require a project context.')
            },
            getApiUrl: () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        } as DataProvider
    }, [projectId])

    // Load configuration on mount (if not provided)
    useEffect(() => {
        if (initialConfig) {
            setResources(buildResourcesFromConfig(initialConfig))
            return
        }

        async function init() {
            try {
                const loadedConfig = await loadCRMConfig()
                setConfig(loadedConfig)

                const builtResources = buildResourcesFromConfig(loadedConfig)
                setResources(builtResources)
            } catch (error) {
                console.error('Failed to load CRM config:', error)
            } finally {
                setIsLoading(false)
            }
        }

        init()
    }, [initialConfig])

    // Show loading state while config loads
    if (isLoading || !config) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontSize: 18,
                color: '#666'
            }}>
                Loading CRM configuration...
            </div>
        )
    }

    return (
        <RefineKbarProvider>
            <Refine
                routerProvider={routerProvider}
                dataProvider={dataProvider}
                liveProvider={liveProvider(supabase)}
                resources={resources}
                options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    // Pass userId through for audit tracking
                    ...(userId && {
                        mutationMeta: {
                            userId
                        }
                    })
                }}
            >
                <RefineKbar />
                {children}
            </Refine>
        </RefineKbarProvider>
    )
}

/**
 * CRMConfigContext - Provides access to the CRM config throughout the app
 * Can be used by components that need config but don't use Refine hooks
 */
export { CRMProvider as default }
