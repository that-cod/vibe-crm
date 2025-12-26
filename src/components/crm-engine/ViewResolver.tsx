'use client'

import { DynamicTable } from './DynamicTable'
import { DynamicKanban } from './DynamicKanban'
import { DynamicCalendar } from './DynamicCalendar'
import type { Entity, View, CRMConfig } from '@/types/config'
import {
    isTableView,
    isKanbanView,
    isCalendarView,
} from '@/types/config'

/**
 * ViewResolver - Determines which component to render based on view type
 * 
 * This component acts as a router between view types and their corresponding
 * rendering components (Table, Kanban, Calendar).
 */

interface ViewResolverProps {
    /** The entity being displayed */
    entity: Entity
    /** The view configuration */
    view: View
    /** Complete CRM configuration */
    config: CRMConfig
}

export function ViewResolver({ entity, view, config }: ViewResolverProps) {
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
        <div style={{ padding: 24 }}>
            <h2>Unsupported View Type</h2>
            <p>
                View type <code>{view.type}</code> is not yet implemented.
            </p>
            <p>
                Supported types: <code>table</code>, <code>kanban</code>, <code>calendar</code>
            </p>
        </div>
    )
}
