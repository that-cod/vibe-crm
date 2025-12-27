'use client'

/**
 * DynamicDashboard - Metrics and analytics dashboard
 * 
 * Renders dashboard widgets based on configuration:
 * - Entity count cards
 * - Status breakdowns (pie/bar charts)
 * - Pipeline values
 * - Recent activity feeds
 * - Upcoming calendar events
 */

import { useMemo } from 'react'
import { useListData } from '@/lib/refine-hooks'
import type { CRMConfig, Entity } from '@/types/config'
import type { DashboardConfig, DashboardWidget } from '@/lib/ai/dashboard-config-generator'
import {
    BarChart2,
    PieChart,
    Activity,
    TrendingUp,
    Calendar,
    LayoutGrid,
    Users,
    Briefcase,
    CheckSquare,
    DollarSign
} from 'lucide-react'

export interface DynamicDashboardProps {
    config: CRMConfig
    dashboardConfig: DashboardConfig
    projectId: string
    onNavigate?: (entityId: string, viewId?: string) => void
}

export function DynamicDashboard({
    config,
    dashboardConfig,
    projectId,
    onNavigate
}: DynamicDashboardProps) {
    return (
        <div className="space-y-6">
            {/* Dashboard Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">{dashboardConfig.title}</h1>
                {dashboardConfig.subtitle && (
                    <p className="text-gray-400 mt-1">{dashboardConfig.subtitle}</p>
                )}
            </div>

            {/* Widget Grid */}
            <div className="grid grid-cols-4 gap-4">
                {dashboardConfig.widgets.map(widget => (
                    <DashboardWidgetCard
                        key={widget.id}
                        widget={widget}
                        config={config}
                        projectId={projectId}
                        onNavigate={onNavigate}
                    />
                ))}
            </div>
        </div>
    )
}

/**
 * Individual widget card
 */
interface WidgetCardProps {
    widget: DashboardWidget
    config: CRMConfig
    projectId: string
    onNavigate?: (entityId: string, viewId?: string) => void
}

function DashboardWidgetCard({ widget, config, projectId, onNavigate }: WidgetCardProps) {
    const { position } = widget
    const entity = config.entities.find(e => e.id === widget.entityId)

    // Calculate grid styles
    const gridStyle = {
        gridColumn: `span ${position.colSpan}`,
        gridRow: `span ${position.rowSpan}`
    }

    return (
        <div
            style={gridStyle}
            className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
            onClick={() => entity && onNavigate?.(entity.id)}
        >
            {widget.type === 'entity-count' && (
                <EntityCountWidget widget={widget} entity={entity} />
            )}
            {widget.type === 'status-breakdown' && (
                <StatusBreakdownWidget widget={widget} entity={entity} config={config} />
            )}
            {widget.type === 'pipeline-value' && (
                <PipelineValueWidget widget={widget} entity={entity} config={config} />
            )}
            {widget.type === 'recent-activity' && (
                <RecentActivityWidget widget={widget} config={config} />
            )}
            {widget.type === 'calendar-upcoming' && (
                <UpcomingEventsWidget widget={widget} entity={entity} />
            )}
        </div>
    )
}

/**
 * Entity count widget
 */
function EntityCountWidget({ widget, entity }: { widget: DashboardWidget; entity?: Entity }) {
    const { data, isLoading } = useListData({
        resource: entity?.tableName || '',
        pagination: { mode: 'off' },
        queryOptions: { enabled: !!entity }
    })

    const count = data?.length || 0
    const icon = getEntityIcon(entity?.icon)

    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm">{widget.title}</p>
                <p className="text-3xl font-bold text-white mt-1">
                    {isLoading ? '...' : count.toLocaleString()}
                </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
                {icon}
            </div>
        </div>
    )
}

/**
 * Status breakdown widget with simple bar chart
 */
function StatusBreakdownWidget({
    widget,
    entity,
    config
}: {
    widget: DashboardWidget
    entity?: Entity
    config: CRMConfig
}) {
    const { data, isLoading } = useListData({
        resource: entity?.tableName || '',
        pagination: { mode: 'off' },
        queryOptions: { enabled: !!entity }
    })

    const field = widget.field
    const statusField = entity?.fields.find(f => f.name === field)
    const options = (statusField as { options?: { value: string; label: string; color?: string }[] })?.options || []

    // Count records by status
    const breakdown = useMemo(() => {
        if (!data) return []

        const counts: Record<string, number> = {}
        for (const record of data) {
            const value = (record as Record<string, unknown>)[field || ''] as string || 'unknown'
            counts[value] = (counts[value] || 0) + 1
        }

        return options.map(opt => ({
            label: opt.label,
            value: opt.value,
            count: counts[opt.value] || 0,
            color: opt.color || '#6B7280'
        }))
    }, [data, field, options])

    const total = breakdown.reduce((sum, item) => sum + item.count, 0)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-white font-medium">{widget.title}</p>
                <PieChart className="w-5 h-5 text-gray-400" />
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading...</div>
            ) : (
                <div className="space-y-2">
                    {breakdown.map(item => (
                        <div key={item.value} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{item.label}</span>
                                <span className="text-gray-400">{item.count}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                                        backgroundColor: item.color
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

/**
 * Pipeline value widget
 */
function PipelineValueWidget({
    widget,
    entity,
    config
}: {
    widget: DashboardWidget
    entity?: Entity
    config: CRMConfig
}) {
    const { data, isLoading } = useListData({
        resource: entity?.tableName || '',
        pagination: { mode: 'off' },
        queryOptions: { enabled: !!entity }
    })

    const valueField = widget.config?.valueField
    const groupField = widget.config?.groupByField
    const stageField = entity?.fields.find(f => f.name === groupField)
    const stages = (stageField as { options?: { value: string; label: string; color?: string }[] })?.options || []

    // Calculate pipeline values
    const pipeline = useMemo(() => {
        if (!data) return []

        const totals: Record<string, number> = {}
        for (const record of data) {
            const stage = (record as Record<string, unknown>)[groupField || ''] as string || 'unknown'
            const value = Number((record as Record<string, unknown>)[valueField || '']) || 0
            totals[stage] = (totals[stage] || 0) + value
        }

        return stages.map(s => ({
            label: s.label,
            value: s.value,
            total: totals[s.value] || 0,
            color: s.color || '#6B7280'
        }))
    }, [data, valueField, groupField, stages])

    const grandTotal = pipeline.reduce((sum, item) => sum + item.total, 0)
    const maxValue = Math.max(...pipeline.map(p => p.total), 1)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white font-medium">{widget.title}</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                        ${grandTotal.toLocaleString()}
                    </p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading...</div>
            ) : (
                <div className="space-y-3">
                    {pipeline.map(stage => (
                        <div key={stage.value} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{stage.label}</span>
                                <span className="text-gray-400">${stage.total.toLocaleString()}</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${(stage.total / maxValue) * 100}%`,
                                        backgroundColor: stage.color
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

/**
 * Recent activity widget
 */
function RecentActivityWidget({ widget, config }: { widget: DashboardWidget; config: CRMConfig }) {
    const limit = widget.config?.limit || 5

    // Fetch from the first entity
    const entity = config.entities[0]
    const { data, isLoading } = useListData({
        resource: entity?.tableName || '',
        pagination: { pageSize: limit },
        sorters: [{ field: 'createdAt', order: 'desc' }],
        queryOptions: { enabled: !!entity }
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-white font-medium">{widget.title}</p>
                <Activity className="w-5 h-5 text-gray-400" />
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading...</div>
            ) : (
                <div className="space-y-3">
                    {(data || []).slice(0, limit).map((record: Record<string, unknown>) => {
                        const title = String(record[entity?.titleField || 'name'] || record.id)
                        const createdAt = record._meta ?
                            (record._meta as { created_at?: string }).created_at :
                            record.createdAt

                        return (
                            <div key={record.id as string} className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-purple-400" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm truncate">{title}</p>
                                    <p className="text-gray-500 text-xs">
                                        {createdAt ? formatTimeAgo(new Date(createdAt as string)) : 'Recently'}
                                    </p>
                                </div>
                            </div>
                        )
                    })}

                    {(!data || data.length === 0) && (
                        <p className="text-gray-500 text-sm italic">No recent activity</p>
                    )}
                </div>
            )}
        </div>
    )
}

/**
 * Upcoming events widget
 */
function UpcomingEventsWidget({ widget, entity }: { widget: DashboardWidget; entity?: Entity }) {
    const dateField = widget.field
    const limit = widget.config?.limit || 5

    const { data, isLoading } = useListData({
        resource: entity?.tableName || '',
        pagination: { pageSize: limit },
        filters: dateField ? [
            { field: dateField, operator: 'gte', value: new Date().toISOString().split('T')[0] }
        ] : [],
        sorters: dateField ? [{ field: dateField, order: 'asc' }] : [],
        queryOptions: { enabled: !!entity && !!dateField }
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-white font-medium">{widget.title}</p>
                <Calendar className="w-5 h-5 text-gray-400" />
            </div>

            {isLoading ? (
                <div className="text-gray-400">Loading...</div>
            ) : (
                <div className="space-y-3">
                    {(data || []).slice(0, limit).map((record: Record<string, unknown>) => {
                        const title = String(record[entity?.titleField || 'name'] || record.id)
                        const date = dateField ? record[dateField] : undefined

                        return (
                            <div key={record.id as string} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm truncate">{title}</p>
                                    {!!date && (
                                        <p className="text-gray-500 text-xs">
                                            {formatDate(new Date(String(date)))}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {(!data || data.length === 0) && (
                        <p className="text-gray-500 text-sm italic">No upcoming events</p>
                    )}
                </div>
            )}
        </div>
    )
}

/**
 * Get icon component based on entity icon name
 */
function getEntityIcon(iconName?: string) {
    const iconClass = "w-6 h-6 text-purple-400"

    switch (iconName?.toLowerCase()) {
        case 'users':
        case 'user':
        case 'contact':
            return <Users className={iconClass} />
        case 'briefcase':
        case 'deal':
        case 'opportunity':
            return <Briefcase className={iconClass} />
        case 'task':
        case 'check':
        case 'todo':
            return <CheckSquare className={iconClass} />
        case 'dollar':
        case 'money':
        case 'currency':
            return <DollarSign className={iconClass} />
        case 'calendar':
        case 'event':
            return <Calendar className={iconClass} />
        case 'chart':
        case 'analytics':
            return <BarChart2 className={iconClass} />
        default:
            return <LayoutGrid className={iconClass} />
    }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
}

/**
 * Format relative time
 */
function formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(date)
}

export default DynamicDashboard
