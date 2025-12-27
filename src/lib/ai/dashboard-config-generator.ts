/**
 * Dashboard Config Generator
 * 
 * Generates dashboard widget configurations based on CRM entities.
 * Creates sensible defaults for entity counts, status breakdowns, and recent activity.
 */

import type { CRMConfig, Entity } from '@/types/config'

/**
 * Dashboard widget types
 */
export type DashboardWidgetType =
    | 'entity-count'      // Simple count of records
    | 'status-breakdown'  // Pie/bar chart by status field
    | 'recent-activity'   // List of recently created/updated records
    | 'pipeline-value'    // Sum of currency field by stage
    | 'calendar-upcoming' // Upcoming events from calendar

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
    id: string
    type: DashboardWidgetType
    title: string
    entityId: string
    field?: string           // For status-breakdown, pipeline-value
    size: 'small' | 'medium' | 'large'
    position: {
        row: number
        col: number
        colSpan: number
        rowSpan: number
    }
    config?: {
        limit?: number         // For recent-activity
        colorField?: string    // For status breakdown colors
        valueField?: string    // For pipeline calculations
        groupByField?: string  // For grouping
    }
}

/**
 * Complete dashboard configuration
 */
export interface DashboardConfig {
    title: string
    subtitle?: string
    widgets: DashboardWidget[]
    refreshInterval?: number // seconds
}

/**
 * Generate dashboard configuration from CRM config
 */
export function generateDashboardConfig(config: CRMConfig): DashboardConfig {
    const widgets: DashboardWidget[] = []
    let currentRow = 0
    let currentCol = 0

    // 1. Entity count cards (top row, up to 4)
    const mainEntities = config.entities.slice(0, 4)
    mainEntities.forEach((entity, index) => {
        widgets.push({
            id: `count-${entity.id}`,
            type: 'entity-count',
            title: entity.labelPlural,
            entityId: entity.id,
            size: 'small',
            position: {
                row: 0,
                col: index,
                colSpan: 1,
                rowSpan: 1
            }
        })
    })
    currentRow = 1

    // 2. Find entities with status/stage fields for breakdowns
    for (const entity of config.entities) {
        const statusField = entity.fields.find(f =>
            f.type === 'select' &&
            (f.name.toLowerCase().includes('status') ||
                f.name.toLowerCase().includes('stage') ||
                f.name.toLowerCase().includes('priority'))
        )

        if (statusField) {
            widgets.push({
                id: `breakdown-${entity.id}`,
                type: 'status-breakdown',
                title: `${entity.labelPlural} by ${statusField.label || statusField.name}`,
                entityId: entity.id,
                field: statusField.name,
                size: 'medium',
                position: {
                    row: currentRow,
                    col: currentCol,
                    colSpan: 2,
                    rowSpan: 1
                },
                config: {
                    colorField: statusField.name
                }
            })
            currentCol += 2
            if (currentCol >= 4) {
                currentCol = 0
                currentRow++
            }
        }
    }

    // 3. Find entities with currency fields for pipeline value
    for (const entity of config.entities) {
        const currencyField = entity.fields.find(f => f.type === 'currency')
        const stageField = entity.fields.find(f =>
            f.type === 'select' &&
            (f.name.toLowerCase().includes('stage') || f.name.toLowerCase().includes('status'))
        )

        if (currencyField && stageField) {
            widgets.push({
                id: `pipeline-${entity.id}`,
                type: 'pipeline-value',
                title: `${entity.label} Pipeline`,
                entityId: entity.id,
                field: currencyField.name,
                size: 'large',
                position: {
                    row: currentRow,
                    col: currentCol,
                    colSpan: 4,
                    rowSpan: 1
                },
                config: {
                    valueField: currencyField.name,
                    groupByField: stageField.name
                }
            })
            currentRow++
            currentCol = 0
            break // Only one pipeline chart
        }
    }

    // 4. Recent activity (always include)
    widgets.push({
        id: 'recent-activity',
        type: 'recent-activity',
        title: 'Recent Activity',
        entityId: config.entities[0]?.id || 'all', // Primary entity or all
        size: 'medium',
        position: {
            row: currentRow,
            col: currentCol,
            colSpan: 2,
            rowSpan: 2
        },
        config: {
            limit: 10
        }
    })
    currentCol += 2

    // 5. Find calendar entities for upcoming events
    const calendarEntity = config.entities.find(entity =>
        entity.fields.some(f => f.type === 'date' || f.type === 'datetime')
    )

    if (calendarEntity) {
        const dateField = calendarEntity.fields.find(f =>
            f.type === 'date' || f.type === 'datetime'
        )

        if (dateField) {
            widgets.push({
                id: `upcoming-${calendarEntity.id}`,
                type: 'calendar-upcoming',
                title: `Upcoming ${calendarEntity.labelPlural}`,
                entityId: calendarEntity.id,
                field: dateField.name,
                size: 'medium',
                position: {
                    row: currentRow,
                    col: currentCol,
                    colSpan: 2,
                    rowSpan: 2
                },
                config: {
                    limit: 5
                }
            })
        }
    }

    return {
        title: `${config.name} Dashboard`,
        subtitle: config.description,
        widgets,
        refreshInterval: 60 // Refresh every minute
    }
}

/**
 * Get icon for widget type
 */
export function getWidgetIcon(type: DashboardWidgetType): string {
    switch (type) {
        case 'entity-count': return 'BarChart2'
        case 'status-breakdown': return 'PieChart'
        case 'recent-activity': return 'Activity'
        case 'pipeline-value': return 'TrendingUp'
        case 'calendar-upcoming': return 'Calendar'
        default: return 'LayoutGrid'
    }
}

export default generateDashboardConfig
