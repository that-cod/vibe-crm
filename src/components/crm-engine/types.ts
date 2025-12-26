import type { Entity, View, CRMConfig, TableView, KanbanView, CalendarView, FormView, DetailView } from '@/types/config'

/**
 * Base props for all view components
 */
export interface BaseViewProps<TView extends View> {
    /** The entity being displayed */
    entity: Entity
    /** The view configuration */
    view: TView
    /** Complete CRM configuration (for relationships, etc.) */
    config: CRMConfig
}

/**
 * Props for DynamicTable component
 */
export interface DynamicTableProps extends BaseViewProps<TableView> { }

/**
 * Props for DynamicKanban component
 */
export interface DynamicKanbanProps extends BaseViewProps<KanbanView> { }

/**
 * Props for DynamicCalendar component
 */
export interface DynamicCalendarProps extends BaseViewProps<CalendarView> { }

/**
 * Props for DynamicForm component
 */
export interface DynamicFormProps extends BaseViewProps<FormView> {
    /** Record ID for editing (undefined for create) */
    recordId?: string
    /** Callback when form is submitted */
    onSubmit?: (values: Record<string, unknown>) => void | Promise<void>
    /** Callback when form is cancelled */
    onCancel?: () => void
}

/**
 * Props for field renderers
 */
export interface FieldRendererProps {
    /** The field value */
    value: unknown
    /** The field configuration */
    field: import('@/types/field-types').Field
    /** The complete record (for relationship lookups) */
    record?: Record<string, unknown>
    /** CRM configuration (for relationship target entities) */
    config?: CRMConfig
    /** Whether in edit mode */
    editable?: boolean
    /** Callback when value changes (for editable mode) */
    onChange?: (value: unknown) => void
}

/**
 * Calendar event type
 */
export interface CalendarEvent {
    id: string
    title: string
    start: Date
    end: Date
    allDay?: boolean
    resource?: Record<string, unknown>
    color?: string
}

/**
 * Kanban card type
 */
export interface KanbanCard {
    id: string
    title: string
    fields: Array<{
        label: string
        value: unknown
        field: import('@/types/field-types').Field
    }>
    record: Record<string, unknown>
}

/**
 * Kanban column type
 */
export interface KanbanColumn {
    id: string
    label: string
    color?: string
    cards: KanbanCard[]
}
