'use client'

import { Refine } from '@refinedev/core'
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'
import routerProvider from '@refinedev/nextjs-router'
import { createJSONBDataProvider, createCRMLiveProvider } from '@/lib/data-provider'
import { loadCRMConfig } from '@/lib/config-loader'
import { buildResourcesFromConfig } from '@/lib/resource-builder'
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import type { CRMConfig, Entity, View } from '@/types/config'
import type { ResourceProps, DataProvider } from '@refinedev/core'
import type { DashboardConfig } from '@/lib/ai/dashboard-config-generator'
import type { SampleDataPayload } from '@/lib/ai/sample-data-generator'

/**
 * CRM Context - Provides access to CRM config and navigation throughout the app
 */
interface CRMContextValue {
    /** CRM configuration */
    config: CRMConfig | null
    /** Dashboard widget configuration */
    dashboardConfig: DashboardConfig | null
    /** Sample data (if available) */
    sampleData: SampleDataPayload | null
    /** Current project ID */
    projectId: string | null
    /** Whether config is still loading */
    isLoading: boolean
    /** Current navigation state */
    navigation: {
        currentEntityId: string | null
        currentViewId: string | null
        currentRecordId: string | null
        mode: 'list' | 'create' | 'edit' | 'show' | 'dashboard'
    }
    /** Navigation functions */
    navigateToEntity: (entityId: string, viewId?: string) => void
    navigateToRecord: (entityId: string, recordId: string) => void
    navigateToCreate: (entityId: string) => void
    navigateToEdit: (entityId: string, recordId: string) => void
    navigateToDashboard: () => void
    goBack: () => void
    /** Get current entity */
    getCurrentEntity: () => Entity | null
    /** Get current view */
    getCurrentView: () => View | null
}

const CRMContext = createContext<CRMContextValue | null>(null)

/**
 * Hook to access CRM context
 */
export function useCRM(): CRMContextValue {
    const context = useContext(CRMContext)
    if (!context) {
        throw new Error('useCRM must be used within a CRMProvider')
    }
    return context
}

/**
 * CRMProvider - Wraps the app with Refine and provides dynamic resources
 * 
 * This provider:
 * 1. Loads the CRM configuration
 * 2. Creates a JSONB data provider scoped to the project
 * 3. Builds Refine resources from the config
 * 4. Initializes Refine with those resources
 * 5. Provides CRM context for navigation and config access
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
    /** Optional: Pre-loaded dashboard config */
    initialDashboardConfig?: DashboardConfig
    /** Optional: Pre-loaded sample data */
    initialSampleData?: SampleDataPayload
    /** Optional: User ID for audit trail (created_by, updated_by) */
    userId?: string
    /** Optional: Initial entity to display */
    initialEntityId?: string
    /** Optional: Initial view to display */
    initialViewId?: string
}

export function CRMProvider({
    children,
    projectId,
    initialConfig,
    initialDashboardConfig,
    initialSampleData,
    userId,
    initialEntityId,
    initialViewId,
}: CRMProviderProps) {
    const [config, setConfig] = useState<CRMConfig | null>(initialConfig ?? null)
    const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(initialDashboardConfig ?? null)
    const [sampleData, setSampleData] = useState<SampleDataPayload | null>(initialSampleData ?? null)
    const [resources, setResources] = useState<ResourceProps[]>([])
    const [isLoading, setIsLoading] = useState(!initialConfig)

    // Navigation state
    const [currentEntityId, setCurrentEntityId] = useState<string | null>(initialEntityId ?? null)
    const [currentViewId, setCurrentViewId] = useState<string | null>(initialViewId ?? null)
    const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)
    const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'show' | 'dashboard'>('list')
    const [navigationHistory, setNavigationHistory] = useState<Array<{
        entityId: string | null
        viewId: string | null
        recordId: string | null
        mode: 'list' | 'create' | 'edit' | 'show' | 'dashboard'
    }>>([])

    // Create the data provider - memoized to avoid recreating on every render
    const dataProvider: DataProvider = useMemo(() => {
        if (projectId) {
            // Use our custom JSONB data provider for project-scoped data
            return createJSONBDataProvider(projectId)
        }

        // Fallback: Return a minimal data provider that throws helpful errors
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

    // Navigation functions
    const navigateToEntity = useCallback((entityId: string, viewId?: string) => {
        // Save current state to history
        setNavigationHistory(prev => [...prev, { entityId: currentEntityId, viewId: currentViewId, recordId: currentRecordId, mode }])

        setCurrentEntityId(entityId)
        setCurrentRecordId(null)
        setMode('list')

        // If viewId provided, use it; otherwise find default view for entity
        if (viewId) {
            setCurrentViewId(viewId)
        } else if (config) {
            const defaultView = config.views.find(v => v.entityId === entityId)
            setCurrentViewId(defaultView?.id ?? null)
        }
    }, [config, currentEntityId, currentViewId, currentRecordId, mode])

    const navigateToRecord = useCallback((entityId: string, recordId: string) => {
        setNavigationHistory(prev => [...prev, { entityId: currentEntityId, viewId: currentViewId, recordId: currentRecordId, mode }])
        setCurrentEntityId(entityId)
        setCurrentRecordId(recordId)
        setMode('show')
    }, [currentEntityId, currentViewId, currentRecordId, mode])

    const navigateToCreate = useCallback((entityId: string) => {
        setNavigationHistory(prev => [...prev, { entityId: currentEntityId, viewId: currentViewId, recordId: currentRecordId, mode }])
        setCurrentEntityId(entityId)
        setCurrentRecordId(null)
        setMode('create')
    }, [currentEntityId, currentViewId, currentRecordId, mode])

    const navigateToEdit = useCallback((entityId: string, recordId: string) => {
        setNavigationHistory(prev => [...prev, { entityId: currentEntityId, viewId: currentViewId, recordId: currentRecordId, mode }])
        setCurrentEntityId(entityId)
        setCurrentRecordId(recordId)
        setMode('edit')
    }, [currentEntityId, currentViewId, currentRecordId, mode])

    const navigateToDashboard = useCallback(() => {
        setNavigationHistory(prev => [...prev, { entityId: currentEntityId, viewId: currentViewId, recordId: currentRecordId, mode }])
        setCurrentEntityId(null)
        setCurrentViewId(null)
        setCurrentRecordId(null)
        setMode('dashboard')
    }, [currentEntityId, currentViewId, currentRecordId, mode])

    const goBack = useCallback(() => {
        if (navigationHistory.length > 0) {
            const prev = navigationHistory[navigationHistory.length - 1]
            setNavigationHistory(h => h.slice(0, -1))
            setCurrentEntityId(prev.entityId)
            setCurrentViewId(prev.viewId)
            setCurrentRecordId(prev.recordId)
            setMode(prev.mode)
        } else {
            // Default: go to list mode or dashboard
            setMode('list')
            setCurrentRecordId(null)
        }
    }, [navigationHistory])

    const getCurrentEntity = useCallback((): Entity | null => {
        if (!config || !currentEntityId) return null
        return config.entities.find(e => e.id === currentEntityId) ?? null
    }, [config, currentEntityId])

    const getCurrentView = useCallback((): View | null => {
        if (!config || !currentViewId) return null
        return config.views.find(v => v.id === currentViewId) ?? null
    }, [config, currentViewId])

    // Load configuration on mount (if not provided)
    useEffect(() => {
        if (initialConfig) {
            setResources(buildResourcesFromConfig(initialConfig))

            // Set default entity if not provided
            if (!currentEntityId && initialConfig.entities.length > 0) {
                const defaultEntity = initialConfig.entities[0]
                setCurrentEntityId(defaultEntity.id)
                const defaultView = initialConfig.views.find(v => v.entityId === defaultEntity.id)
                setCurrentViewId(defaultView?.id ?? null)
            }
            return
        }

        async function init() {
            try {
                const loadedConfig = await loadCRMConfig()
                setConfig(loadedConfig)

                const builtResources = buildResourcesFromConfig(loadedConfig)
                setResources(builtResources)

                // Set default entity
                if (loadedConfig.entities.length > 0) {
                    const defaultEntity = loadedConfig.entities[0]
                    setCurrentEntityId(defaultEntity.id)
                    const defaultView = loadedConfig.views.find(v => v.entityId === defaultEntity.id)
                    setCurrentViewId(defaultView?.id ?? null)
                }
            } catch (error) {
                console.error('Failed to load CRM config:', error)
            } finally {
                setIsLoading(false)
            }
        }

        init()
    }, [initialConfig, currentEntityId])

    // Context value
    const contextValue: CRMContextValue = useMemo(() => ({
        config,
        dashboardConfig,
        sampleData,
        projectId: projectId ?? null,
        isLoading,
        navigation: {
            currentEntityId,
            currentViewId,
            currentRecordId,
            mode,
        },
        navigateToEntity,
        navigateToRecord,
        navigateToCreate,
        navigateToEdit,
        navigateToDashboard,
        goBack,
        getCurrentEntity,
        getCurrentView,
    }), [
        config,
        dashboardConfig,
        sampleData,
        projectId,
        isLoading,
        currentEntityId,
        currentViewId,
        currentRecordId,
        mode,
        navigateToEntity,
        navigateToRecord,
        navigateToCreate,
        navigateToEdit,
        navigateToDashboard,
        goBack,
        getCurrentEntity,
        getCurrentView,
    ])

    // Show loading state while config loads
    if (isLoading || !config) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a1a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400">Loading CRM configuration...</span>
                </div>
            </div>
        )
    }

    return (
        <CRMContext.Provider value={contextValue}>
            <RefineKbarProvider>
                <Refine
                    routerProvider={routerProvider}
                    dataProvider={dataProvider}
                    liveProvider={projectId ? createCRMLiveProvider(projectId) : undefined}
                    resources={resources}
                    options={{
                        syncWithLocation: false, // We manage navigation ourselves
                        warnWhenUnsavedChanges: true,
                        liveMode: 'auto', // Enable real-time updates
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
        </CRMContext.Provider>
    )
}

export { CRMProvider as default }
