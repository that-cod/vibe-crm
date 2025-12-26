'use client'

import React, { useState, useMemo } from 'react'
import { useList, useUpdate } from '@refinedev/core'
import { Card, Button, Space, Tag, Empty, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DynamicKanbanProps, KanbanCard, KanbanColumn } from './types'
import { getFieldByName, getDisplayValue, getFieldValue, getRecordTitle } from './utils'

/**
 * DynamicKanban - Generic Kanban board component that renders based on configuration
 * 
 * This component is completely generic and works with any entity/view configuration.
 * It supports drag-and-drop to move cards between columns (updating the grouping field).
 */
export function DynamicKanban({ entity, view, config }: DynamicKanbanProps) {
    const [activeId, setActiveId] = useState<string | null>(null)

    // Fetch all records for this entity (Refine v6 API)
    const listResult = useList({
        resource: entity.tableName,
        pagination: {
            mode: 'off', // Load all records for kanban
        },
    })

    const data = listResult.query.data
    const isLoading = listResult.query.isLoading

    const { mutate: updateRecord } = useUpdate()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before dragging
            },
        })
    )

    // Build columns from view configuration
    const columns: KanbanColumn[] = useMemo(() => {
        if (!data?.data) return []

        return view.columns.map(columnConfig => {
            // Filter records for this column
            const records = (data?.data || []).filter((record: any) => {
                const fieldValue = getFieldValue(record, view.groupByField)
                return fieldValue === columnConfig.filterValue
            })

            // Map records to cards
            const cards: KanbanCard[] = records.map((record: any) => {
                const title = getRecordTitle(record, entity)

                // Build card fields from view configuration
                const fields = view.cardFields.map(cardFieldConfig => {
                    const field = getFieldByName(entity, cardFieldConfig.field)
                    if (!field) return null

                    return {
                        label: cardFieldConfig.label || field.label,
                        value: getFieldValue(record, field.name),
                        field,
                    }
                }).filter(Boolean) as KanbanCard['fields']

                return {
                    id: String(record.id),
                    title,
                    fields,
                    record,
                }
            })

            return {
                id: columnConfig.id,
                label: columnConfig.label,
                color: columnConfig.color,
                cards,
            }
        })
    }, [data, view, entity])

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id))
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over || !view.draggable) return

        const activeCardId = String(active.id)
        const overColumnId = String(over.id)

        // Find the card and its current column
        let activeCard: KanbanCard | undefined
        let sourceColumnId: string | undefined

        for (const column of columns) {
            const card = column.cards.find(c => c.id === activeCardId)
            if (card) {
                activeCard = card
                sourceColumnId = column.id
                break
            }
        }

        if (!activeCard || !sourceColumnId || sourceColumnId === overColumnId) {
            return
        }

        // Find the target column's filterValue
        const targetColumn = view.columns.find(c => c.id === overColumnId)
        if (!targetColumn) return

        // Update the record's grouping field
        updateRecord({
            resource: entity.tableName,
            id: activeCardId,
            values: {
                [view.groupByField]: targetColumn.filterValue,
            },
        })
    }

    const activeCard = useMemo(() => {
        if (!activeId) return null
        for (const column of columns) {
            const card = column.cards.find(c => c.id === activeId)
            if (card) return card
        }
        return null
    }, [activeId, columns])

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin size="large" />
            </div>
        )
    }

    return (
        <div className="dynamic-kanban">
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24
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
                        onClick={() => console.log('Create new', entity.name)}
                    >
                        Create {entity.label}
                    </Button>
                )}
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div style={{
                    display: 'flex',
                    gap: 16,
                    overflowX: 'auto',
                    paddingBottom: 16
                }}>
                    {columns.map(column => (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            entity={entity}
                            view={view}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeCard && (
                        <KanbanCardComponent
                            card={activeCard}
                            entity={entity}
                            isDragging
                        />
                    )}
                </DragOverlay>
            </DndContext>
        </div>
    )
}

/**
 * Kanban column component
 */
function KanbanColumn({
    column,
    entity,
    view,
}: {
    column: KanbanColumn
    entity: any
    view: any
}) {
    return (
        <div
            style={{
                flex: '0 0 320px',
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
                padding: 16,
            }}
        >
            {/* Column header */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {column.color && (
                        <div
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: column.color,
                            }}
                        />
                    )}
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                        {column.label}
                    </h3>
                    <span style={{ color: '#999', fontSize: 12 }}>
                        {column.cards.length}
                    </span>
                </div>
            </div>

            {/* Cards */}
            <SortableContext
                items={column.cards.map(c => c.id)}
                strategy={verticalListSortingStrategy}
                id={column.id}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {column.cards.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No items"
                            style={{ padding: 24 }}
                        />
                    ) : (
                        column.cards.map(card => (
                            <SortableKanbanCard
                                key={card.id}
                                card={card}
                                entity={entity}
                            />
                        ))
                    )}
                </div>
            </SortableContext>
        </div>
    )
}

/**
 * Sortable Kanban card wrapper
 */
function SortableKanbanCard({ card, entity }: { card: KanbanCard; entity: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: card.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <KanbanCardComponent card={card} entity={entity} isDragging={isDragging} />
        </div>
    )
}

/**
 * Kanban card component
 */
function KanbanCardComponent({
    card,
    entity,
    isDragging = false,
}: {
    card: KanbanCard
    entity: any
    isDragging?: boolean
}) {
    return (
        <Card
            size="small"
            hoverable={!isDragging}
            style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.15)' : undefined,
            }}
        >
            <div style={{ marginBottom: 8 }}>
                <strong>{card.title}</strong>
            </div>

            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {card.fields.map((field, index) => (
                    <div key={index} style={{ fontSize: 12 }}>
                        <span style={{ color: '#666' }}>{field.label}: </span>
                        <span>{getDisplayValue(field.value, field.field)}</span>
                    </div>
                ))}
            </Space>
        </Card>
    )
}
