'use client'

/**
 * Relationship Components
 * 
 * Components for displaying and navigating between related records:
 * - RelatedRecordBadge: Inline badge showing a linked record
 * - RelatedRecordsList: List of related records with navigation
 * - RelationshipLookup: Dropdown for selecting related records
 */

import { useState } from 'react'
import { useListData, useOneData } from '@/lib/refine-hooks'
import type { Entity, CRMConfig } from '@/types/config'
import { Link as LinkIcon, ExternalLink, User, ChevronRight, Loader2 } from 'lucide-react'

/**
 * Props for relationship components
 */
interface RelatedRecordBadgeProps {
    /** Record ID to display */
    recordId: string
    /** Target entity configuration */
    targetEntity: Entity
    /** Click handler to navigate to the record */
    onClick?: () => void
    /** Display size */
    size?: 'sm' | 'md' | 'lg'
}

/**
 * RelatedRecordBadge - Display a linked record as an inline badge
 */
export function RelatedRecordBadge({
    recordId,
    targetEntity,
    onClick,
    size = 'md',
}: RelatedRecordBadgeProps) {
    const { data: record, isLoading } = useOneData({
        resource: targetEntity.tableName,
        id: recordId,
        queryOptions: { enabled: !!recordId }
    })

    if (isLoading) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-gray-400 text-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
            </span>
        )
    }

    if (!record) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-gray-500 text-sm">
                <LinkIcon className="w-3 h-3" />
                Unknown
            </span>
        )
    }

    const displayValue = (record as Record<string, unknown>)[targetEntity.titleField || 'name'] || recordId
    const sizeClasses = {
        sm: 'px-1.5 py-0.5 text-xs gap-1',
        md: 'px-2 py-1 text-sm gap-1.5',
        lg: 'px-3 py-1.5 text-base gap-2',
    }

    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center ${sizeClasses[size]} bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-md transition-colors`}
        >
            <LinkIcon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
            <span className="truncate max-w-[150px]">{String(displayValue)}</span>
        </button>
    )
}

/**
 * Props for RelatedRecordsList
 */
interface RelatedRecordsListProps {
    /** Source entity (the one containing the relationship field) */
    sourceEntity: Entity
    /** Field name that references the parent record */
    relationshipField: string
    /** Parent record ID */
    parentId: string
    /** Complete CRM config */
    config: CRMConfig
    /** Click handler to navigate to a record */
    onRecordClick?: (entityId: string, recordId: string) => void
    /** Maximum records to display */
    limit?: number
    /** Display mode */
    displayMode?: 'list' | 'grid' | 'compact'
}

/**
 * RelatedRecordsList - Display related records (hasMany relationship)
 */
export function RelatedRecordsList({
    sourceEntity,
    relationshipField,
    parentId,
    config,
    onRecordClick,
    limit = 10,
    displayMode = 'list',
}: RelatedRecordsListProps) {
    const { data, isLoading, total } = useListData({
        resource: sourceEntity.tableName,
        filters: [{ field: relationshipField, operator: 'eq', value: parentId }],
        pagination: { pageSize: limit }
    })

    const records = data || []

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            </div>
        )
    }

    if (records.length === 0) {
        return (
            <div className="text-center py-4 text-gray-500 text-sm">
                No related {sourceEntity.labelPlural.toLowerCase()}
            </div>
        )
    }

    if (displayMode === 'compact') {
        return (
            <div className="flex flex-wrap gap-1">
                {records.map((record: Record<string, unknown>) => (
                    <button
                        key={record.id as string}
                        onClick={() => onRecordClick?.(sourceEntity.id, record.id as string)}
                        className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300 transition-colors"
                    >
                        {String(record[sourceEntity.titleField || 'name'] || record.id)}
                    </button>
                ))}
                {total > limit && (
                    <span className="px-2 py-0.5 text-xs text-gray-500">
                        +{total - limit} more
                    </span>
                )}
            </div>
        )
    }

    if (displayMode === 'grid') {
        return (
            <div className="grid grid-cols-2 gap-2">
                {records.map((record: Record<string, unknown>) => (
                    <button
                        key={record.id as string}
                        onClick={() => onRecordClick?.(sourceEntity.id, record.id as string)}
                        className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-sm text-white truncate">
                            {String(record[sourceEntity.titleField || 'name'] || record.id)}
                        </span>
                    </button>
                ))}
            </div>
        )
    }

    // Default: list mode
    return (
        <div className="space-y-1">
            {records.map((record: Record<string, unknown>) => (
                <button
                    key={record.id as string}
                    onClick={() => onRecordClick?.(sourceEntity.id, record.id as string)}
                    className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-md transition-colors group"
                >
                    <span className="text-sm text-gray-300 group-hover:text-white">
                        {String(record[sourceEntity.titleField || 'name'] || record.id)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                </button>
            ))}
            {total > limit && (
                <div className="text-center pt-2">
                    <span className="text-xs text-gray-500">
                        Showing {limit} of {total}
                    </span>
                </div>
            )}
        </div>
    )
}

/**
 * Props for RelationshipLookup
 */
interface RelationshipLookupProps {
    /** Target entity to select from */
    targetEntity: Entity
    /** Current selected value */
    value?: string
    /** Change handler */
    onChange: (value: string | undefined) => void
    /** Field placeholder */
    placeholder?: string
    /** Is disabled */
    disabled?: boolean
}

/**
 * RelationshipLookup - Dropdown for selecting related records
 */
export function RelationshipLookup({
    targetEntity,
    value,
    onChange,
    placeholder,
    disabled,
}: RelationshipLookupProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')

    const { data, isLoading } = useListData({
        resource: targetEntity.tableName,
        pagination: { pageSize: 50 }
    })

    const records = data || []

    // Filter records by search
    const filteredRecords = records.filter((record: Record<string, unknown>) => {
        if (!search) return true
        const title = String(record[targetEntity.titleField || 'name'] || '')
        return title.toLowerCase().includes(search.toLowerCase())
    })

    // Get selected record display
    const selectedRecord = records.find((r: Record<string, unknown>) => r.id === value)
    const displayValue = selectedRecord
        ? String((selectedRecord as Record<string, unknown>)[targetEntity.titleField || 'name'])
        : ''

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="w-full flex items-center justify-between px-3 py-2 bg-white/10 border border-white/20 rounded-md text-left text-white hover:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
                <span className={displayValue ? 'text-white' : 'text-gray-500'}>
                    {isLoading ? 'Loading...' : displayValue || placeholder || `Select ${targetEntity.label}`}
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#1a1a2e] border border-white/20 rounded-md shadow-xl max-h-60 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-white/10">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    {/* Options */}
                    <div className="max-h-48 overflow-y-auto">
                        {/* Clear option */}
                        <button
                            type="button"
                            onClick={() => {
                                onChange(undefined)
                                setIsOpen(false)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-white/5"
                        >
                            -- None --
                        </button>

                        {filteredRecords.map((record: Record<string, unknown>) => (
                            <button
                                key={record.id as string}
                                type="button"
                                onClick={() => {
                                    onChange(record.id as string)
                                    setIsOpen(false)
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-white/5 ${record.id === value ? 'bg-purple-500/20 text-purple-300' : 'text-white'
                                    }`}
                            >
                                {String(record[targetEntity.titleField || 'name'] || record.id)}
                            </button>
                        ))}

                        {filteredRecords.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                No results
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * Quick view for a related record - shows key info in a popover
 */
interface RelatedRecordQuickViewProps {
    recordId: string
    targetEntity: Entity
    config: CRMConfig
    onNavigate?: () => void
}

export function RelatedRecordQuickView({
    recordId,
    targetEntity,
    config,
    onNavigate,
}: RelatedRecordQuickViewProps) {
    const { data: record, isLoading } = useOneData({
        resource: targetEntity.tableName,
        id: recordId,
        queryOptions: { enabled: !!recordId }
    })

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            </div>
        )
    }

    if (!record) {
        return (
            <div className="p-4 text-gray-500 text-sm">
                Record not found
            </div>
        )
    }

    const displayFields = targetEntity.fields.slice(0, 4).filter(f =>
        !['id', 'createdAt', 'updatedAt'].includes(f.name) &&
        !['autoId'].includes(f.type)
    )

    return (
        <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">
                    {String((record as Record<string, unknown>)[targetEntity.titleField || 'name'] || recordId)}
                </h4>
                {onNavigate && (
                    <button
                        onClick={onNavigate}
                        className="p-1 text-gray-400 hover:text-purple-400 transition-colors"
                        title="Open record"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Key fields */}
            <div className="space-y-2">
                {displayFields.map(field => {
                    const value = (record as Record<string, unknown>)[field.name]
                    if (value === undefined || value === null) return null

                    return (
                        <div key={field.id} className="flex justify-between text-sm">
                            <span className="text-gray-500">{field.label}</span>
                            <span className="text-gray-300">{String(value)}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default {
    RelatedRecordBadge,
    RelatedRecordsList,
    RelationshipLookup,
    RelatedRecordQuickView,
}
