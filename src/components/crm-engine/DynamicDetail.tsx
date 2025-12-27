'use client'

/**
 * DynamicDetail - Single record detail view
 * 
 * Displays a complete record with:
 * - All field values formatted by type
 * - Related entities (hasMany relationships)
 * - Edit/Delete actions
 */

import { useMemo } from 'react'
import { useOneData, useDeleteData, useListData } from '@/lib/refine-hooks'
import type { Entity, CRMConfig } from '@/types/config'
import type { Field } from '@/types/field-types'
import { type RelationshipMeta } from '@/lib/resource-builder'
import { Button } from '@/components/ui/button'
import {
    Loader2,
    Edit,
    Trash2,
    ArrowLeft,
    Link as LinkIcon,
    Calendar,
    Mail,
    Phone,
    Globe,
    DollarSign,
    Hash
} from 'lucide-react'

export interface DynamicDetailProps {
    entity: Entity
    config: CRMConfig
    recordId: string
    onEdit?: () => void
    onDelete?: () => void
    onBack?: () => void
    onNavigateToRecord?: (entityId: string, recordId: string) => void
}

export function DynamicDetail({
    entity,
    config,
    recordId,
    onEdit,
    onDelete,
    onBack,
    onNavigateToRecord
}: DynamicDetailProps) {
    // Fetch the record
    const { data, isLoading, isError } = useOneData({
        resource: entity.tableName,
        id: recordId
    })

    const { mutate: deleteRecord, isLoading: isDeleting } = useDeleteData()

    const record = data as Record<string, unknown> | undefined

    // Get relationships for this entity
    const relationships = useMemo(() => {
        return entity.fields
            .filter(f => f.type === 'relationship')
            .map(f => ({
                field: f,
                targetEntity: config.entities.find(e =>
                    e.id === (f as { targetEntity?: string }).targetEntity
                )
            }))
            .filter(r => r.targetEntity)
    }, [entity, config])

    // Get hasMany relationships (reverse relationships)
    const hasManyRelationships = useMemo(() => {
        return config.entities
            .filter(e => e.id !== entity.id)
            .flatMap(e =>
                e.fields
                    .filter(f => f.type === 'relationship')
                    .filter(f => (f as { targetEntity?: string }).targetEntity === entity.id)
                    .map(f => ({
                        sourceEntity: e,
                        field: f
                    }))
            )
    }, [entity, config])

    // Handle delete
    const handleDelete = () => {
        if (!confirm(`Are you sure you want to delete this ${entity.label}?`)) return

        deleteRecord(
            { resource: entity.tableName, id: recordId },
            { onSuccess: () => onDelete?.() }
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        )
    }

    if (isError || !record) {
        return (
            <div className="text-center p-8">
                <p className="text-red-400">Failed to load record</p>
                <Button onClick={onBack} variant="outline" className="mt-4">
                    Go Back
                </Button>
            </div>
        )
    }

    const title = String(record[entity.titleField || 'name'] || record.id)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="text-gray-400 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-white">{title}</h1>
                        <p className="text-gray-400">{entity.label}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onEdit && (
                        <Button
                            onClick={onEdit}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-3 gap-6">
                {/* Fields Section */}
                <div className="col-span-2 space-y-6">
                    <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {entity.fields
                                .filter(f => !['autoId', 'createdAt', 'updatedAt'].includes(f.type))
                                .filter(f => f.name !== 'id')
                                .map(field => (
                                    <FieldDisplay
                                        key={field.id}
                                        field={field}
                                        value={record[field.name]}
                                        config={config}
                                        onNavigateToRecord={onNavigateToRecord}
                                    />
                                ))}
                        </div>
                    </div>

                    {/* Related Records (hasMany) */}
                    {hasManyRelationships.map(rel => (
                        <RelatedRecordsList
                            key={`${rel.sourceEntity.id}-${rel.field.name}`}
                            sourceEntity={rel.sourceEntity}
                            field={rel.field}
                            parentRecordId={recordId}
                            config={config}
                            onNavigateToRecord={onNavigateToRecord}
                        />
                    ))}
                </div>

                {/* Sidebar - Metadata */}
                <div className="space-y-4">
                    <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Record Info</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">ID</span>
                                <span className="text-gray-300 font-mono text-xs">
                                    {String(record.id).substring(0, 8)}...
                                </span>
                            </div>
                            {Boolean(record._meta && typeof record._meta === 'object') && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Created</span>
                                        <span className="text-gray-300">
                                            {formatDate((record._meta as { created_at?: string }).created_at)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Updated</span>
                                        <span className="text-gray-300">
                                            {formatDate((record._meta as { updated_at?: string }).updated_at)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Display a single field value
 */
interface FieldDisplayProps {
    field: Field
    value: unknown
    config: CRMConfig
    onNavigateToRecord?: (entityId: string, recordId: string) => void
}

function FieldDisplay({ field, value, config, onNavigateToRecord }: FieldDisplayProps) {
    const isEmpty = value === undefined || value === null || value === ''

    return (
        <div className="space-y-1">
            <label className="text-sm text-gray-400">{field.label}</label>
            <div className="text-white">
                {isEmpty ? (
                    <span className="text-gray-600 italic">Not set</span>
                ) : (
                    <FieldValue
                        field={field}
                        value={value}
                        config={config}
                        onNavigateToRecord={onNavigateToRecord}
                    />
                )}
            </div>
        </div>
    )
}

/**
 * Render field value based on type
 */
function FieldValue({ field, value, config, onNavigateToRecord }: FieldDisplayProps) {
    switch (field.type) {
        case 'email':
            return (
                <a
                    href={`mailto:${value}`}
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                >
                    <Mail className="w-4 h-4" />
                    {String(value)}
                </a>
            )

        case 'phone':
            return (
                <a
                    href={`tel:${value}`}
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                >
                    <Phone className="w-4 h-4" />
                    {String(value)}
                </a>
            )

        case 'url':
            return (
                <a
                    href={String(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
                >
                    <Globe className="w-4 h-4" />
                    {String(value)}
                </a>
            )

        case 'currency':
            return (
                <span className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    {Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            )

        case 'number':
            return <span>{Number(value).toLocaleString()}</span>

        case 'percentage':
            return <span>{Number(value).toFixed(1)}%</span>

        case 'date':
            return (
                <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(String(value))}
                </span>
            )

        case 'datetime':
            return (
                <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDateTime(String(value))}
                </span>
            )

        case 'boolean':
            return (
                <span className={value ? 'text-green-400' : 'text-gray-500'}>
                    {value ? 'Yes' : 'No'}
                </span>
            )

        case 'select':
            const selectField = field as { options?: { value: string; label: string; color?: string }[] }
            const option = selectField.options?.find(o => o.value === value)
            return (
                <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-sm"
                    style={{ backgroundColor: `${option?.color || '#6B7280'}20`, color: option?.color || '#9CA3AF' }}
                >
                    {option?.label || String(value)}
                </span>
            )

        case 'multiselect':
            const multiField = field as { options?: { value: string; label: string; color?: string }[] }
            const values = value as string[] || []
            return (
                <div className="flex flex-wrap gap-1">
                    {values.map(v => {
                        const opt = multiField.options?.find(o => o.value === v)
                        return (
                            <span
                                key={v}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                                style={{ backgroundColor: `${opt?.color || '#6B7280'}20`, color: opt?.color || '#9CA3AF' }}
                            >
                                {opt?.label || v}
                            </span>
                        )
                    })}
                </div>
            )

        case 'relationship':
            const relField = field as { targetEntity?: string }
            const targetEntity = config.entities.find(e => e.id === relField.targetEntity)
            return (
                <RelationshipValue
                    value={value as string}
                    targetEntity={targetEntity}
                    onNavigate={() => {
                        if (targetEntity && value) {
                            onNavigateToRecord?.(targetEntity.id, String(value))
                        }
                    }}
                />
            )

        case 'textarea':
        case 'richtext':
            return (
                <div className="whitespace-pre-wrap text-gray-300">
                    {String(value)}
                </div>
            )

        default:
            return <span>{String(value)}</span>
    }
}

/**
 * Relationship value with lookup
 */
function RelationshipValue({
    value,
    targetEntity,
    onNavigate
}: {
    value: string
    targetEntity?: Entity
    onNavigate: () => void
}) {
    const { data, isLoading } = useOneData({
        resource: targetEntity?.tableName || '',
        id: value,
        queryOptions: { enabled: !!targetEntity && !!value }
    })

    if (isLoading) return <span className="text-gray-500">Loading...</span>

    const record = data as Record<string, unknown>
    const displayValue = record?.[targetEntity?.titleField || 'name'] || value

    return (
        <button
            onClick={onNavigate}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
        >
            <LinkIcon className="w-4 h-4" />
            {String(displayValue)}
        </button>
    )
}

/**
 * Related records list (hasMany)
 */
interface RelatedRecordsListProps {
    sourceEntity: Entity
    field: Field
    parentRecordId: string
    config: CRMConfig
    onNavigateToRecord?: (entityId: string, recordId: string) => void
}

function RelatedRecordsList({
    sourceEntity,
    field,
    parentRecordId,
    config,
    onNavigateToRecord
}: RelatedRecordsListProps) {
    const { data, isLoading } = useListData({
        resource: sourceEntity.tableName,
        filters: [{ field: field.name, operator: 'eq', value: parentRecordId }],
        pagination: { pageSize: 10 }
    })

    const records = data || []

    return (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                    {sourceEntity.labelPlural}
                </h2>
                <span className="text-gray-400 text-sm">
                    {isLoading ? '...' : records.length} records
                </span>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            ) : records.length === 0 ? (
                <p className="text-gray-500 italic">No related {sourceEntity.labelPlural.toLowerCase()}</p>
            ) : (
                <div className="space-y-2">
                    {records.map((record: Record<string, unknown>) => (
                        <button
                            key={record.id as string}
                            onClick={() => onNavigateToRecord?.(sourceEntity.id, record.id as string)}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                        >
                            <span className="text-white">
                                {String(record[sourceEntity.titleField || 'name'] || record.id)}
                            </span>
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

/**
 * Format date string
 */
function formatDate(value?: string): string {
    if (!value) return 'N/A'
    try {
        return new Date(value).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    } catch {
        return value
    }
}

/**
 * Format datetime string
 */
function formatDateTime(value?: string): string {
    if (!value) return 'N/A'
    try {
        return new Date(value).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
    } catch {
        return value
    }
}

export default DynamicDetail
