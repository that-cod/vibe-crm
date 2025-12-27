'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useListData, useUpdateData, useCreateData } from '@/lib/refine-hooks'
import { Card, Button, Space, Tag, Empty, Spin, Modal, Input, message } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DynamicKanbanProps, KanbanCard, KanbanColumn } from './types'
import { getFieldByName, getDisplayValue, getFieldValue, getRecordTitle } from './utils'
import { DynamicForm } from './DynamicForm'

/**
 * DynamicKanban - Kanban board with drag-drop status updates
 * 
 * Features:
 * - Drag-drop cards between columns (updates grouping field)
 * - Quick-add cards per column
 * - Click card to edit
 * - Real-time updates via Refine
 */
export function DynamicKanban({ entity, view, config }: DynamicKanbanProps) {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingRecordId, setEditingRecordId] = useState<string | undefined>()
    const [initialFormData, setInitialFormData] = useState<Record<string, unknown>>({})
    const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null)
    const [quickAddTitle, setQuickAddTitle] = useState('')

    // Fetch all records for this entity
    const { data, isLoading, refetch } = useListData({
        resource: entity.tableName,
        pagination: { mode: 'off' },
    })

    const { mutate: updateRecord } = useUpdateData()
    const { mutate: createRecord, isLoading: isCreating } = useCreateData()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    )

    // Build columns from view configuration
    const columns: KanbanColumn[] = useMemo(() => {
        if (!data) return view.columns.map(c => ({ ...c, cards: [] }))

        return view.columns.map(columnConfig => {
            const records = (data || []).filter((record: Record<string, unknown>) => {
                const fieldValue = getFieldValue(record, view.groupByField)
                return fieldValue === columnConfig.filterValue
            })

            const cards: KanbanCard[] = records.map((record: Record<string, unknown>) => {
                const title = getRecordTitle(record, entity)

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
        const overId = String(over.id)

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

        if (!activeCard || !sourceColumnId) return

        // Determine target column (could be dropping on column or on a card in column)
        let targetColumnId = overId

        // Check if dropped on a card
        for (const column of columns) {
            if (column.cards.find(c => c.id === overId)) {
                targetColumnId = column.id
                break
            }
        }

        if (sourceColumnId === targetColumnId) return

        const targetColumn = view.columns.find(c => c.id === targetColumnId)
        if (!targetColumn) return

        // Update the record's grouping field
        updateRecord(
            {
                resource: entity.tableName,
                id: activeCardId,
                values: { [view.groupByField]: targetColumn.filterValue },
            },
            {
                onSuccess: () => {
                    message.success(`Moved to ${targetColumn.label}`)
                }
            }
        )
    }

    const handleCardClick = useCallback((card: KanbanCard) => {
        setEditingRecordId(card.id)
        setInitialFormData(card.record)
        setIsFormOpen(true)
    }, [])

    const handleCreateNew = useCallback((columnId?: string) => {
        setEditingRecordId(undefined)

        // If creating from a column, pre-fill the status field
        if (columnId) {
            const column = view.columns.find(c => c.id === columnId)
            if (column) {
                setInitialFormData({ [view.groupByField]: column.filterValue })
            }
        } else {
            setInitialFormData({})
        }

        setIsFormOpen(true)
    }, [view])

    const handleQuickAdd = useCallback((columnId: string) => {
        if (!quickAddTitle.trim()) return

        const column = view.columns.find(c => c.id === columnId)
        if (!column) return

        const titleField = entity.titleField || 'name'

        createRecord(
            {
                resource: entity.tableName,
                values: {
                    [titleField]: quickAddTitle.trim(),
                    [view.groupByField]: column.filterValue,
                },
            },
            {
                onSuccess: () => {
                    message.success(`Created in ${column.label}`)
                    setQuickAddTitle('')
                    setQuickAddColumn(null)
                    refetch()
                }
            }
        )
    }, [quickAddTitle, view, entity, createRecord, refetch])

    const handleFormSuccess = useCallback(() => {
        setIsFormOpen(false)
        setEditingRecordId(undefined)
        setInitialFormData({})
        refetch()
    }, [refetch])

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
            <div className="flex items-center justify-center p-12">
                <Spin size="large" />
            </div>
        )
    }

    return (
        <div className="dynamic-kanban">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 px-4">
                <div>
                    <h2 className="text-xl font-semibold text-white m-0">{view.label}</h2>
                    {view.description && (
                        <p className="text-gray-400 mt-1 mb-0">{view.description}</p>
                    )}
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleCreateNew()}
                    style={{ background: '#7C3AED' }}
                >
                    New {entity.label}
                </Button>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4 px-4">
                    {columns.map(column => (
                        <DroppableColumn
                            key={column.id}
                            column={column}
                            entity={entity}
                            view={view}
                            onCardClick={handleCardClick}
                            onQuickAdd={() => setQuickAddColumn(column.id)}
                            quickAddActive={quickAddColumn === column.id}
                            quickAddTitle={quickAddColumn === column.id ? quickAddTitle : ''}
                            onQuickAddChange={setQuickAddTitle}
                            onQuickAddSubmit={() => handleQuickAdd(column.id)}
                            onQuickAddCancel={() => {
                                setQuickAddColumn(null)
                                setQuickAddTitle('')
                            }}
                            isCreating={isCreating}
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

            {/* Create/Edit Modal */}
            <Modal
                title={editingRecordId ? `Edit ${entity.label}` : `New ${entity.label}`}
                open={isFormOpen}
                onCancel={() => {
                    setIsFormOpen(false)
                    setEditingRecordId(undefined)
                    setInitialFormData({})
                }}
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
                    initialData={initialFormData}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                        setIsFormOpen(false)
                        setEditingRecordId(undefined)
                    }}
                />
            </Modal>
        </div>
    )
}

/**
 * Droppable column component
 */
function DroppableColumn({
    column,
    entity,
    view,
    onCardClick,
    onQuickAdd,
    quickAddActive,
    quickAddTitle,
    onQuickAddChange,
    onQuickAddSubmit,
    onQuickAddCancel,
    isCreating,
}: {
    column: KanbanColumn
    entity: any
    view: any
    onCardClick: (card: KanbanCard) => void
    onQuickAdd: () => void
    quickAddActive: boolean
    quickAddTitle: string
    onQuickAddChange: (value: string) => void
    onQuickAddSubmit: () => void
    onQuickAddCancel: () => void
    isCreating: boolean
}) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id })

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 w-80 rounded-lg p-4 transition-colors ${isOver ? 'bg-purple-500/20' : 'bg-white/5'
                }`}
        >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {column.color && (
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: column.color }}
                        />
                    )}
                    <h3 className="text-sm font-semibold text-white m-0">
                        {column.label}
                    </h3>
                    <span className="text-xs text-gray-500 bg-white/10 px-2 py-0.5 rounded-full">
                        {column.cards.length}
                    </span>
                </div>
                <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={onQuickAdd}
                    className="text-gray-400 hover:text-white"
                />
            </div>

            {/* Quick add input */}
            {quickAddActive && (
                <div className="mb-3">
                    <Input
                        placeholder={`New ${entity.label.toLowerCase()}...`}
                        value={quickAddTitle}
                        onChange={(e) => onQuickAddChange(e.target.value)}
                        onPressEnter={onQuickAddSubmit}
                        autoFocus
                        className="bg-white/10 border-white/20 text-white"
                    />
                    <div className="flex gap-2 mt-2">
                        <Button
                            size="small"
                            type="primary"
                            onClick={onQuickAddSubmit}
                            loading={isCreating}
                            style={{ background: '#7C3AED' }}
                        >
                            Add
                        </Button>
                        <Button
                            size="small"
                            onClick={onQuickAddCancel}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Cards */}
            <SortableContext
                items={column.cards.map(c => c.id)}
                strategy={verticalListSortingStrategy}
                id={column.id}
            >
                <div className="flex flex-col gap-2 min-h-[100px]">
                    {column.cards.length === 0 && !quickAddActive ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={<span className="text-gray-500">No items</span>}
                            className="py-8"
                        />
                    ) : (
                        column.cards.map(card => (
                            <SortableKanbanCard
                                key={card.id}
                                card={card}
                                entity={entity}
                                onClick={() => onCardClick(card)}
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
function SortableKanbanCard({
    card,
    entity,
    onClick
}: {
    card: KanbanCard
    entity: any
    onClick: () => void
}) {
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
            <KanbanCardComponent
                card={card}
                entity={entity}
                isDragging={isDragging}
                onClick={onClick}
            />
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
    onClick,
}: {
    card: KanbanCard
    entity: any
    isDragging?: boolean
    onClick?: () => void
}) {
    return (
        <Card
            size="small"
            hoverable={!isDragging}
            onClick={onClick}
            className={`
                cursor-${isDragging ? 'grabbing' : 'pointer'}
                bg-[#1a1a2e] border-white/10 hover:border-purple-500/50
                transition-all
            `}
            style={{
                boxShadow: isDragging ? '0 8px 24px rgba(124, 58, 237, 0.3)' : undefined,
            }}
            bodyStyle={{ padding: 12 }}
        >
            <div className="flex items-start justify-between mb-2">
                <strong className="text-white text-sm">{card.title}</strong>
                <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    className="text-gray-500 hover:text-purple-400"
                    onClick={(e) => {
                        e.stopPropagation()
                        onClick?.()
                    }}
                />
            </div>

            <Space direction="vertical" size={4} className="w-full">
                {card.fields.slice(0, 3).map((field, index) => (
                    <div key={index} className="text-xs flex items-center gap-1">
                        <span className="text-gray-500">{field.label}:</span>
                        <span className="text-gray-300">
                            {getDisplayValue(field.value, field.field)}
                        </span>
                    </div>
                ))}
            </Space>
        </Card>
    )
}

export default DynamicKanban
