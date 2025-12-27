'use client'

import { DynamicTable } from './DynamicTable'
import { DynamicKanban } from './DynamicKanban'
import { DynamicCalendar } from './DynamicCalendar'
import { DynamicForm } from './DynamicForm'
import { DynamicDashboard } from './DynamicDashboard'
import { DynamicDetail } from './DynamicDetail'
import type { Entity, View, CRMConfig } from '@/types/config'
import type { DashboardConfig } from '@/lib/ai/dashboard-config-generator'
import {
    isTableView,
    isKanbanView,
    isCalendarView,
} from '@/types/config'

/**
 * ViewResolver - Determines which component to render based on view type
 * 
 * This component acts as a router between view types and their corresponding
 * rendering components (Table, Kanban, Calendar, Form, Dashboard, Detail).
 * 
 * Enhanced to support:
 * - Table views (list with CRUD)
 * - Kanban views (drag-drop status updates)
 * - Calendar views (date-based events)
 * - Form views (create/edit records)
 * - Dashboard views (widgets and analytics)
 * - Detail views (single record display)
 */

export interface ViewResolverProps {
    /** The entity being displayed */
    entity: Entity
    /** The view configuration */
    view: View
    /** Complete CRM configuration */
    config: CRMConfig
    /** Project ID for data operations */
    projectId?: string
    /** Dashboard configuration (for dashboard views) */
    dashboardConfig?: DashboardConfig
    /** Record ID (for detail/edit views) */
    recordId?: string
    /** View mode */
    mode?: 'list' | 'create' | 'edit' | 'show' | 'dashboard'
    /** Callbacks */
    onNavigate?: (entityId: string, viewId?: string) => void
    onNavigateToRecord?: (entityId: string, recordId: string) => void
    onEdit?: (recordId: string) => void
    onBack?: () => void
    onSuccess?: (record: Record<string, unknown>) => void
}

export function ViewResolver({
    entity,
    view,
    config,
    projectId,
    dashboardConfig,
    recordId,
    mode = 'list',
    onNavigate,
    onNavigateToRecord,
    onEdit,
    onBack,
    onSuccess,
}: ViewResolverProps) {
    // Dashboard mode - render dashboard widgets
    if (mode === 'dashboard' && dashboardConfig) {
        return (
            <DynamicDashboard
                config={config}
                dashboardConfig={dashboardConfig}
                projectId={projectId || ''}
                onNavigate={onNavigate}
            />
        )
    }

    // Create mode - render create form
    if (mode === 'create') {
        return (
            <DynamicForm
                entity={entity}
                config={config}
                onSuccess={onSuccess}
                onCancel={onBack}
                mode="page"
            />
        )
    }

    // Edit mode - render edit form with record ID
    if (mode === 'edit' && recordId) {
        return (
            <DynamicForm
                entity={entity}
                config={config}
                recordId={recordId}
                onSuccess={onSuccess}
                onCancel={onBack}
                mode="page"
            />
        )
    }

    // Show mode - render detail view
    if (mode === 'show' && recordId) {
        return (
            <DynamicDetail
                entity={entity}
                config={config}
                recordId={recordId}
                onEdit={() => onEdit?.(recordId)}
                onDelete={onBack}
                onBack={onBack}
                onNavigateToRecord={onNavigateToRecord}
            />
        )
    }

    // List mode - render based on view type
    // Render table view
    if (isTableView(view)) {
        return <DynamicTable entity={entity} view={view} config={config} />
    }

    // Render kanban view
    if (isKanbanView(view)) {
        return <DynamicKanban entity={entity} view={view} config={config} />
    }

    // Render calendar view
    if (isCalendarView(view)) {
        return <DynamicCalendar entity={entity} view={view} config={config} />
    }

    // Unsupported view type
    return (
        <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Unsupported View Type</h2>
            <p className="text-gray-400">
                View type <code className="bg-white/10 px-2 py-1 rounded">{view.type}</code> is not yet implemented.
            </p>
            <p className="text-gray-500 mt-2">
                Supported types: <code>table</code>, <code>kanban</code>, <code>calendar</code>
            </p>
        </div>
    )
}

/**
 * Helper to determine if a view supports CRUD operations
 */
export function viewSupportsCRUD(viewType: string): boolean {
    return ['table', 'kanban', 'calendar'].includes(viewType)
}

/**
 * Helper to get the appropriate action for a view type
 */
export function getViewActions(viewType: string): {
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    canDragDrop: boolean
} {
    switch (viewType) {
        case 'table':
            return { canCreate: true, canEdit: true, canDelete: true, canDragDrop: false }
        case 'kanban':
            return { canCreate: true, canEdit: true, canDelete: true, canDragDrop: true }
        case 'calendar':
            return { canCreate: true, canEdit: true, canDelete: true, canDragDrop: false }
        default:
            return { canCreate: false, canEdit: false, canDelete: false, canDragDrop: false }
    }
}

export default ViewResolver
