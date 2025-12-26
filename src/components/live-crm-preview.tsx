'use client'

import { useState, useMemo } from 'react'
import { Refine } from '@refinedev/core'
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'
import routerProvider from '@refinedev/nextjs-router'
import { liveProvider } from '@refinedev/supabase'
import { supabase } from '@/lib/supabase'
import { createJSONBDataProvider } from '@/lib/data-provider'
import { buildResourcesFromConfig } from '@/lib/resource-builder'
import { ViewResolver } from '@/components/crm-engine'
import type { CRMConfig, Entity, View } from '@/types/config'

/**
 * LiveCRMPreview - Renders a live, interactive CRM preview with real data
 * 
 * This component provides:
 * - Entity/view navigation
 * - Real-time data from JSONB storage
 * - Full CRUD operations
 * - All view types (Table, Kanban, Calendar)
 */

interface LiveCRMPreviewProps {
    /** Project ID for data scoping */
    projectId: string
    /** CRM configuration */
    config: CRMConfig
    /** Optional: Initial entity to display */
    initialEntityId?: string
    /** Optional: Initial view to display */
    initialViewId?: string
}

export function LiveCRMPreview({
    projectId,
    config,
    initialEntityId,
    initialViewId,
}: LiveCRMPreviewProps) {
    // Create data provider
    const dataProvider = useMemo(() => {
        return createJSONBDataProvider(projectId)
    }, [projectId])

    // Build resources
    const resources = useMemo(() => {
        return buildResourcesFromConfig(config)
    }, [config])

    // Get first entity and view as defaults
    const defaultEntity = config.entities[0]
    const defaultView = config.views.find(v => v.entityId === defaultEntity?.id) ?? config.views[0]

    // State for navigation
    const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId ?? defaultEntity?.id)
    const [selectedViewId, setSelectedViewId] = useState(initialViewId ?? defaultView?.id)

    // Get current entity and view
    const currentEntity = config.entities.find(e => e.id === selectedEntityId) ?? defaultEntity
    const currentView = config.views.find(v => v.id === selectedViewId) ??
        config.views.find(v => v.entityId === currentEntity?.id) ??
        defaultView

    // Get views for current entity
    const entityViews = config.views.filter(v => v.entityId === currentEntity?.id)

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
                liveProvider={liveProvider(supabase)}
                resources={resources}
                options={{
                    syncWithLocation: false,
                    warnWhenUnsavedChanges: false,
                }}
            >
                <div className="flex h-full min-h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {/* Sidebar - Entity Navigation */}
                    <div className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                {config.name}
                            </h3>
                            {config.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {config.description}
                                </p>
                            )}
                        </div>

                        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                            {config.entities.map(entity => (
                                <button
                                    key={entity.id}
                                    onClick={() => {
                                        setSelectedEntityId(entity.id)
                                        // Switch to first view of new entity
                                        const firstView = config.views.find(v => v.entityId === entity.id)
                                        if (firstView) {
                                            setSelectedViewId(firstView.id)
                                        }
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${entity.id === selectedEntityId
                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {entity.icon && (
                                        <span className="text-base">{entity.icon}</span>
                                    )}
                                    <span>{entity.labelPlural}</span>
                                </button>
                            ))}
                        </nav>

                        {/* View Switcher */}
                        {entityViews.length > 1 && (
                            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 mb-2">
                                    Views
                                </div>
                                <div className="space-y-1">
                                    {entityViews.map(view => (
                                        <button
                                            key={view.id}
                                            onClick={() => setSelectedViewId(view.id)}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${view.id === selectedViewId
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {currentEntity.labelPlural}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {currentView.label} • {currentView.type} view
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* View Content */}
                        <div className="flex-1 overflow-auto p-4">
                            <ViewResolver
                                entity={currentEntity}
                                view={currentView}
                                config={config}
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
    switch (type) {
        case 'table':
            return (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )
        case 'kanban':
            return (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
            )
        case 'calendar':
            return (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        default:
            return null
    }
}

export default LiveCRMPreview
