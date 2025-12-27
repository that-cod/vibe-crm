'use client'

import { useState, useMemo, useCallback } from 'react'
import { Refine } from '@refinedev/core'
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'
import routerProvider from '@refinedev/nextjs-router'
import { createJSONBDataProvider, createCRMLiveProvider, createTestStorageDataProvider } from '@/lib/data-provider'
import { buildResourcesFromConfig } from '@/lib/resource-builder'
import { ViewResolver } from '@/components/crm-engine'
import type { CRMConfig, Entity, View } from '@/types/config'
import type { DashboardConfig } from '@/lib/ai/dashboard-config-generator'
import {
    LayoutDashboard,
    ChevronRight,
    Plus,
    Table,
    Columns3,
    Calendar,
} from 'lucide-react'

/**
 * LiveCRMPreview - Renders a live, interactive CRM preview with real data
 * 
 * This component provides:
 * - Dashboard with analytics widgets
 * - Entity/view navigation
 * - Real-time data from JSONB storage
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - All view types (Table, Kanban, Calendar)
 */

interface LiveCRMPreviewProps {
    /** Project ID for data scoping */
    projectId: string
    /** CRM configuration */
    config: CRMConfig
    /** Dashboard configuration */
    dashboardConfig?: DashboardConfig
    /** Optional: Initial entity to display */
    initialEntityId?: string
    /** Optional: Initial view to display */
    initialViewId?: string
    /** Start on dashboard */
    showDashboard?: boolean
    /** Use persistent Supabase storage instead of in-memory test-storage */
    usePersistent?: boolean
}

export function LiveCRMPreview({
    projectId,
    config,
    dashboardConfig,
    initialEntityId,
    initialViewId,
    showDashboard = false,
    usePersistent = false,
}: LiveCRMPreviewProps) {
    // Create data provider (conditional based on persistent mode)
    const dataProvider = useMemo(() => {
        if (usePersistent) {
            // Persistent mode: use Supabase
            return createJSONBDataProvider(projectId)
        } else {
            // Demo mode: use in-memory test-storage
            return createTestStorageDataProvider(projectId)
        }
    }, [projectId, usePersistent])

    // Build resources
    const resources = useMemo(() => {
        return buildResourcesFromConfig(config)
    }, [config])

    // Get first entity and view as defaults
    const defaultEntity = config.entities[0]
    const defaultView = config.views.find(v => v.entityId === defaultEntity?.id) ?? config.views[0]

    // Navigation state
    const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId ?? defaultEntity?.id)
    const [selectedViewId, setSelectedViewId] = useState(initialViewId ?? defaultView?.id)
    const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)
    const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'show' | 'dashboard'>(
        showDashboard && dashboardConfig ? 'dashboard' : 'list'
    )

    // Get current entity and view
    const currentEntity = config.entities.find(e => e.id === selectedEntityId) ?? defaultEntity
    const currentView = config.views.find(v => v.id === selectedViewId) ??
        config.views.find(v => v.entityId === currentEntity?.id) ??
        defaultView

    // Get views for current entity
    const entityViews = config.views.filter(v => v.entityId === currentEntity?.id)

    // Navigation handlers
    const handleNavigateToEntity = useCallback((entityId: string, viewId?: string) => {
        setSelectedEntityId(entityId)
        setCurrentRecordId(null)
        setMode('list')

        if (viewId) {
            setSelectedViewId(viewId)
        } else {
            const firstView = config.views.find(v => v.entityId === entityId)
            if (firstView) {
                setSelectedViewId(firstView.id)
            }
        }
    }, [config.views])

    const handleNavigateToRecord = useCallback((entityId: string, recordId: string) => {
        setSelectedEntityId(entityId)
        setCurrentRecordId(recordId)
        setMode('show')
    }, [])

    const handleNavigateToDashboard = useCallback(() => {
        setMode('dashboard')
        setCurrentRecordId(null)
    }, [])

    const handleEdit = useCallback((recordId: string) => {
        setCurrentRecordId(recordId)
        setMode('edit')
    }, [])

    const handleBack = useCallback(() => {
        if (mode === 'show' || mode === 'edit' || mode === 'create') {
            setMode('list')
            setCurrentRecordId(null)
        } else {
            // Already at list, nothing to go back to
        }
    }, [mode])

    const handleSuccess = useCallback(() => {
        setMode('list')
        setCurrentRecordId(null)
    }, [])

    if (!currentEntity || !currentView) {
        return (
            <div className="p-8 text-center text-gray-500">
                No entities or views configured in this CRM.
            </div>
        )
    }

    return (
        <RefineKbarProvider>
            <Refine
                routerProvider={routerProvider}
                dataProvider={dataProvider}
                liveProvider={createCRMLiveProvider(projectId)}
                resources={resources}
                options={{
                    syncWithLocation: false,
                    warnWhenUnsavedChanges: false,
                    liveMode: 'auto',
                }}
            >
                <div className="flex h-full min-h-[600px] bg-[#0a0a1a] rounded-lg overflow-hidden border border-white/10">
                    {/* Sidebar - Entity Navigation */}
                    <div className="w-56 bg-[#0f0f23] border-r border-white/10 flex flex-col">
                        {/* CRM Name */}
                        <div className="p-4 border-b border-white/10">
                            <h3 className="font-semibold text-white text-lg">
                                {config.name}
                            </h3>
                            {config.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {config.description}
                                </p>
                            )}
                        </div>

                        {/* Dashboard Link */}
                        {dashboardConfig && (
                            <button
                                onClick={handleNavigateToDashboard}
                                className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b border-white/10 ${mode === 'dashboard'
                                    ? 'bg-purple-600/20 text-purple-300 font-medium'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span>Dashboard</span>
                            </button>
                        )}

                        {/* Entity Navigation */}
                        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                            <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wider">
                                Entities
                            </div>
                            {config.entities.map(entity => (
                                <button
                                    key={entity.id}
                                    onClick={() => handleNavigateToEntity(entity.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${entity.id === selectedEntityId && mode !== 'dashboard'
                                        ? 'bg-purple-600/20 text-purple-300 font-medium'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {entity.icon && (
                                        <span className="text-base">{entity.icon}</span>
                                    )}
                                    <span className="flex-1 text-left">{entity.labelPlural}</span>
                                    <ChevronRight className="w-4 h-4 opacity-50" />
                                </button>
                            ))}
                        </nav>

                        {/* View Switcher */}
                        {entityViews.length > 1 && mode !== 'dashboard' && (
                            <div className="p-2 border-t border-white/10">
                                <div className="text-xs font-medium text-gray-500 px-2 mb-2 uppercase tracking-wider">
                                    Views
                                </div>
                                <div className="space-y-1">
                                    {entityViews.map(view => (
                                        <button
                                            key={view.id}
                                            onClick={() => setSelectedViewId(view.id)}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${view.id === selectedViewId
                                                ? 'bg-blue-600/20 text-blue-300'
                                                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                                }`}
                                        >
                                            <ViewTypeIcon type={view.type} />
                                            {view.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 bg-[#0f0f23] border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-white">
                                        {mode === 'dashboard'
                                            ? dashboardConfig?.title || 'Dashboard'
                                            : mode === 'create'
                                                ? `New ${currentEntity.label}`
                                                : mode === 'edit'
                                                    ? `Edit ${currentEntity.label}`
                                                    : mode === 'show'
                                                        ? currentEntity.label
                                                        : currentEntity.labelPlural
                                        }
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {mode === 'dashboard'
                                            ? dashboardConfig?.subtitle || 'Overview and analytics'
                                            : mode === 'create' || mode === 'edit'
                                                ? `Fill in the ${currentEntity.label.toLowerCase()} details`
                                                : `${currentView.label} • ${currentView.type} view`
                                        }
                                    </p>
                                </div>

                                {/* Actions */}
                                {mode === 'list' && (
                                    <button
                                        onClick={() => setMode('create')}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New {currentEntity.label}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* View Content */}
                        <div className="flex-1 overflow-auto p-4">
                            <ViewResolver
                                entity={currentEntity}
                                view={currentView}
                                config={config}
                                projectId={projectId}
                                dashboardConfig={dashboardConfig}
                                recordId={currentRecordId || undefined}
                                mode={mode}
                                onNavigate={handleNavigateToEntity}
                                onNavigateToRecord={handleNavigateToRecord}
                                onEdit={handleEdit}
                                onBack={handleBack}
                                onSuccess={handleSuccess}
                            />
                        </div>
                    </div>
                </div>

                <RefineKbar />
            </Refine>
        </RefineKbarProvider>
    )
}

/**
 * Helper component for view type icons
 */
function ViewTypeIcon({ type }: { type: string }) {
    const className = "w-3.5 h-3.5"

    switch (type) {
        case 'table':
            return <Table className={className} />
        case 'kanban':
            return <Columns3 className={className} />
        case 'calendar':
            return <Calendar className={className} />
        default:
            return null
    }
}

export default LiveCRMPreview
