'use client'

import React, { useState, useCallback } from 'react'
import { useTable } from '@refinedev/antd'
import { useDeleteData, useOneData, useListData } from '@/lib/refine-hooks'
import { Table, Button, Space, Tag, Input, Modal, Popconfirm, message } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DynamicTableProps } from './types'
import { getFieldByName, getDisplayValue, getSelectColor } from './utils'
import { DynamicForm } from './DynamicForm'
import type { Field } from '@/types/field-types'
import type { Entity } from '@/types/config'

/**
 * DynamicTable - Generic table component with full CRUD operations
 * 
 * Features:
 * - Dynamic column generation from config
 * - Create/Edit/Delete actions
 * - Modal form for create/edit
 * - Relationship field lookups
 * - Search/filter support
 */
export function DynamicTable({ entity, view, config }: DynamicTableProps) {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRecordId, setEditingRecordId] = useState<string | undefined>()
    const [searchText, setSearchText] = useState('')

    const { tableProps } = useTable({
        resource: entity.tableName,
        pagination: {
            pageSize: view.pageSize || 25,
        },
        sorters: {
            initial: view.sort ? [{
                field: view.sort.field,
                order: view.sort.order === 'asc' ? 'asc' : 'desc',
            }] : [],
        },
    })

    const { mutate: deleteRecord, isLoading: isDeleting } = useDeleteData()

    // Build columns from view configuration
    const columns: ColumnsType<Record<string, unknown>> = view.columns.map(columnConfig => {
        const field = getFieldByName(entity, columnConfig.field)

        if (!field) {
            console.warn(`Field ${columnConfig.field} not found in entity ${entity.name}`)
            return null
        }

        return {
            title: field.label,
            dataIndex: field.name,
            key: field.name,
            width: columnConfig.width,
            sorter: columnConfig.sortable !== false && field.sortable !== false,
            render: (value: unknown, record: Record<string, unknown>) => {
                return renderFieldValue(value, field, record, config, entity)
            },
        }
    }).filter(Boolean) as ColumnsType<Record<string, unknown>>

    // Add actions column
    columns.push({
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 150,
        render: (_: unknown, record: Record<string, unknown>) => (
            <Space>
                <Button
                    type="link"
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => handleView(record)}
                />
                <Button
                    type="link"
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => handleEdit(record)}
                />
                <Popconfirm
                    title={`Delete ${entity.label}?`}
                    description="This action cannot be undone."
                    onConfirm={() => handleDelete(record)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true, loading: isDeleting }}
                >
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                    />
                </Popconfirm>
            </Space>
        ),
    })

    const handleView = useCallback((record: Record<string, unknown>) => {
        // Navigate to detail view
        // In a real app, this would use router navigation
        console.log('View record:', record.id)
    }, [])

    const handleEdit = useCallback((record: Record<string, unknown>) => {
        setEditingRecordId(record.id as string)
        setIsFormOpen(true)
    }, [])

    const handleDelete = useCallback((record: Record<string, unknown>) => {
        deleteRecord(
            { resource: entity.tableName, id: record.id as string },
            {
                onSuccess: () => {
                    message.success(`${entity.label} deleted successfully`)
                },
                onError: () => {
                    message.error(`Failed to delete ${entity.label}`)
                }
            }
        )
    }, [deleteRecord, entity])

    const handleCreate = useCallback(() => {
        setEditingRecordId(undefined)
        setIsFormOpen(true)
    }, [])

    const handleFormSuccess = useCallback(() => {
        setIsFormOpen(false)
        setEditingRecordId(undefined)
        // Data will be refetched automatically by Refine's cache invalidation
        message.success(
            editingRecordId
                ? `${entity.label} updated successfully`
                : `${entity.label} created successfully`
        )
    }, [editingRecordId, entity.label])

    const handleFormCancel = useCallback(() => {
        setIsFormOpen(false)
        setEditingRecordId(undefined)
    }, [])

    return (
        <div className="dynamic-table">
            {/* Header with title and actions */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                padding: '0 16px'
            }}>
                <div>
                    <h2 style={{ margin: 0, color: 'white' }}>{view.label}</h2>
                    {view.description && (
                        <p style={{ margin: '4px 0 0', color: '#999' }}>{view.description}</p>
                    )}
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                    style={{ background: '#7C3AED' }}
                >
                    New {entity.label}
                </Button>
            </div>

            {/* Search bar */}
            {view.searchable && (
                <div style={{ marginBottom: 16, padding: '0 16px' }}>
                    <Input
                        placeholder={`Search ${entity.labelPlural.toLowerCase()}...`}
                        prefix={<SearchOutlined style={{ color: '#666' }} />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{
                            maxWidth: 400,
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white'
                        }}
                        allowClear
                    />
                </div>
            )}

            {/* Table */}
            <Table
                {...tableProps}
                columns={columns}
                rowKey="id"
                scroll={{ x: true }}
                style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 8
                }}
                className="dark-table"
            />

            {/* Create/Edit Modal */}
            <Modal
                title={editingRecordId ? `Edit ${entity.label}` : `New ${entity.label}`}
                open={isFormOpen}
                onCancel={handleFormCancel}
                footer={null}
                width={640}
                destroyOnClose
                styles={{
                    content: { background: '#1a1a2e' },
                    header: { background: '#1a1a2e', color: 'white' }
                }}
            >
                <DynamicForm
                    entity={entity}
                    config={config}
                    recordId={editingRecordId}
                    onSuccess={handleFormSuccess}
                    onCancel={handleFormCancel}
                />
            </Modal>
        </div>
    )
}

/**
 * Render a field value based on its type
 */
function renderFieldValue(
    value: unknown,
    field: Field,
    record: Record<string, unknown>,
    config: any,
    entity: Entity
): React.ReactNode {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return <span style={{ color: '#666' }}>-</span>
    }

    // Render based on field type
    switch (field.type) {
        case 'select':
            const color = getSelectColor(value, field)
            return (
                <Tag color={color} style={{ borderRadius: 12 }}>
                    {getDisplayValue(value, field)}
                </Tag>
            )

        case 'multiselect':
            const values = value as string[]
            return (
                <Space wrap size={4}>
                    {values.slice(0, 3).map((v, i) => (
                        <Tag key={i} color={getSelectColor(v, field)} style={{ borderRadius: 12 }}>
                            {getDisplayValue(v, field)}
                        </Tag>
                    ))}
                    {values.length > 3 && (
                        <Tag style={{ borderRadius: 12 }}>+{values.length - 3}</Tag>
                    )}
                </Space>
            )

        case 'boolean':
            return (
                <Tag color={value ? 'success' : 'default'}>
                    {value ? 'Yes' : 'No'}
                </Tag>
            )

        case 'currency':
            return (
                <span style={{ fontWeight: 500, color: '#10B981' }}>
                    ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            )

        case 'percentage':
            return <span>{Number(value).toFixed(1)}%</span>

        case 'email':
            return (
                <a href={`mailto:${value}`} style={{ color: '#A78BFA' }}>
                    {String(value)}
                </a>
            )

        case 'phone':
            return (
                <a href={`tel:${value}`} style={{ color: '#A78BFA' }}>
                    {String(value)}
                </a>
            )

        case 'url':
            const urlStr = String(value)
            const displayUrl = urlStr.replace(/^https?:\/\//, '').slice(0, 30)
            return (
                <a
                    href={urlStr}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#A78BFA' }}
                >
                    {displayUrl}{urlStr.length > 30 ? '...' : ''}
                </a>
            )

        case 'date':
            return formatDate(String(value))

        case 'datetime':
            return formatDateTime(String(value))

        case 'time':
            return String(value)

        case 'relationship':
            return (
                <RelationshipCell
                    value={value as string}
                    field={field}
                    config={config}
                />
            )

        case 'image':
            if (Array.isArray(value) && value.length > 0) {
                return (
                    <img
                        src={value[0]}
                        alt="Preview"
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                    />
                )
            }
            return <span style={{ color: '#666' }}>-</span>

        case 'textarea':
        case 'richtext':
            const text = String(value)
            return (
                <span style={{ color: '#ccc' }}>
                    {text.slice(0, 50)}{text.length > 50 ? '...' : ''}
                </span>
            )

        default:
            return getDisplayValue(value, field)
    }
}

/**
 * Relationship cell with lookup
 */
function RelationshipCell({
    value,
    field,
    config
}: {
    value: string
    field: Field
    config: any
}) {
    const relField = field as { targetEntity?: string }
    const targetEntity = config.entities.find((e: Entity) => e.id === relField.targetEntity)

    const { data, isLoading } = useOneData({
        resource: targetEntity?.tableName || '',
        id: value,
        queryOptions: { enabled: !!targetEntity && !!value }
    })

    if (isLoading) return <span style={{ color: '#666' }}>...</span>
    if (!data) return <span style={{ color: '#666' }}>-</span>

    const record = data as Record<string, unknown>
    const displayValue = record[targetEntity?.titleField || 'name'] || value

    return (
        <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ color: '#A78BFA', textDecoration: 'none' }}
        >
            {String(displayValue)}
        </a>
    )
}

/**
 * Format date for display
 */
function formatDate(value: string): string {
    try {
        return new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    } catch {
        return value
    }
}

/**
 * Format datetime for display
 */
function formatDateTime(value: string): string {
    try {
        return new Date(value).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
    } catch {
        return value
    }
}

export default DynamicTable
