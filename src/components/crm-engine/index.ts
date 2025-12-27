// Export all CRM engine components
export { DynamicTable } from './DynamicTable'
export { DynamicKanban } from './DynamicKanban'
export { DynamicCalendar } from './DynamicCalendar'
export { DynamicForm } from './DynamicForm'
export { DynamicDashboard } from './DynamicDashboard'
export { DynamicDetail } from './DynamicDetail'
export { ViewResolver, viewSupportsCRUD, getViewActions } from './ViewResolver'

// Export relationship components
export {
    RelatedRecordBadge,
    RelatedRecordsList,
    RelationshipLookup,
    RelatedRecordQuickView,
} from './RelationshipComponents'

// Export types
export type {
    BaseViewProps,
    DynamicTableProps,
    DynamicKanbanProps,
    DynamicCalendarProps,
    FieldRendererProps,
    CalendarEvent,
    KanbanCard,
    KanbanColumn,
} from './types'

// Export form types
export type { DynamicFormProps } from './DynamicForm'
export type { DynamicDashboardProps } from './DynamicDashboard'
export type { DynamicDetailProps } from './DynamicDetail'
export type { ViewResolverProps } from './ViewResolver'

// Export utilities
export {
    getFieldByName,
    getFieldValue,
    getEntityById,
    getDisplayValue,
    getSelectColor,
    getDateValue,
    getRecordTitle,
    filterRecords,
    sortRecords,
    validateFieldValue,
} from './utils'
