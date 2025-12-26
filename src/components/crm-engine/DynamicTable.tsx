'use client'

import React from 'react'
import { useTable } from '@refinedev/antd'
import { Table, Button, Space, Tag, Input } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DynamicTableProps } from './types'
import { getFieldByName, getDisplayValue, getSelectColor } from './utils'
import type { Field } from '@/types/field-types'

/**
 * DynamicTable - Generic table component that renders based on configuration
 * 
 * This component is completely generic and works with any entity/view configuration.
 * It uses Refine's useTable hook for data fetching and Ant Design for rendering.
 */
export function DynamicTable({ entity, view, config }: DynamicTableProps) {
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
                return renderFieldValue(value, field, record, config)
            },
        }
    }).filter(Boolean) as ColumnsType<Record<string, unknown>>

    // Add actions column if needed
    if (view.showDelete || view.inlineEditable) {
        columns.push({
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            width: 120,
            render: (_: unknown, record: Record<string, unknown>) => (
                <Space>
                    {view.inlineEditable && (
                        <Button
                            type="link"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEdit(record)}
                        >
                            Edit
                        </Button>
                    )}
                    {view.showDelete && (
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={() => handleDelete(record)}
                        >
                            Delete
                        </Button>
                    )}
                </Space>
            ),
        })
    }

    const handleEdit = (record: Record<string, unknown>) => {
        // TODO: Navigate to edit form or open modal
        console.log('Edit record:', record)
    }

    const handleDelete = (record: Record<string, unknown>) => {
        // TODO: Implement delete with confirmation
        console.log('Delete record:', record)
    }

    const handleCreate = () => {
        // TODO: Navigate to create form or open modal
        console.log('Create new', entity.name)
    }

    return (
        <div className="dynamic-table">
            {/* Header with title and actions */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
            }}>
                <div>
                    <h2 style={{ margin: 0 }}>{view.label}</h2>
                    {view.description && (
                        <p style={{ margin: '4px 0 0', color: '#666' }}>{view.description}</p>
                    )}
                </div>
                {view.showCreate && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                    >
                        Create {entity.label}
                    </Button>
                )}
            </div>

            {/* Search bar */}
            {view.searchable && (
                <div style={{ marginBottom: 16 }}>
                    <Input
                        placeholder={`Search ${entity.labelPlural.toLowerCase()}...`}
                        prefix={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                    />
                </div>
            )}

            {/* Table */}
            <Table
                {...tableProps}
                columns={columns}
                rowKey="id"
                scroll={{ x: true }}
            />
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
    config: any
): React.ReactNode {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return <span style={{ color: '#999' }}>-</span>
    }

    // Render based on field type
    switch (field.type) {
        case 'select':
            const color = getSelectColor(value, field)
            return (
                <Tag color={color}>
                    {getDisplayValue(value, field)}
                </Tag>
            )

        case 'multiselect':
            const values = value as string[]
            return (
                <Space wrap>
                    {values.map((v, i) => (
                        <Tag key={i} color={getSelectColor(v, field)}>
                            {getDisplayValue(v, field)}
                        </Tag>
                    ))}
                </Space>
            )

        case 'boolean':
            return (
                <Tag color={value ? 'green' : 'default'}>
                    {value ? 'Yes' : 'No'}
                </Tag>
            )

        case 'currency':
            return (
                <span style={{ fontWeight: 500 }}>
                    {getDisplayValue(value, field)}
                </span>
            )

        case 'percentage':
            return <span>{String(value)}%</span>

        case 'email':
            return <a href={`mailto:${value}`}>{String(value)}</a>

        case 'phone':
            return <a href={`tel:${value}`}>{String(value)}</a>

        case 'url':
            return (
                <a href={String(value)} target="_blank" rel="noopener noreferrer">
                    {String(value)}
                </a>
            )

        case 'date':
        case 'datetime':
        case 'time':
            return getDisplayValue(value, field)

        case 'relationship':
            // TODO: Fetch and display related record
            return <span>{String(value)}</span>

        case 'image':
            if (Array.isArray(value) && value.length > 0) {
                return (
                    <img
                        src={value[0]}
                        alt="Preview"
                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                    />
                )
            }
            return <span style={{ color: '#999' }}>No image</span>

        default:
            return getDisplayValue(value, field)
    }
}
