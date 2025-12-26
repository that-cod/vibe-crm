// Export all CRM engine components
export { DynamicTable } from './DynamicTable'
export { DynamicKanban } from './DynamicKanban'
export { DynamicCalendar } from './DynamicCalendar'
export { ViewResolver } from './ViewResolver'

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
