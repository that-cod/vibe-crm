import { Field } from './field-types'

/**
 * CRM Configuration Schema
 * Main configuration file that defines the entire CRM structure
 */

/**
 * Entity represents a business object in the CRM (e.g., Lead, Deal, Contact)
 */
export interface Entity {
    /** Unique identifier for the entity */
    id: string
    /** Entity name (singular, PascalCase) */
    name: string
    /** Plural name for lists */
    namePlural: string
    /** Human-readable label */
    label: string
    /** Plural label */
    labelPlural: string
    /** Entity description */
    description?: string
    /** Icon name (from icon library) */
    icon?: string
    /** Entity color (for UI theming) */
    color?: string
    /** Database table name (snake_case) */
    tableName: string
    /** Entity fields */
    fields: Field[]
    /** Default sort field */
    defaultSortField?: string
    /** Default sort order */
    defaultSortOrder?: 'asc' | 'desc'
    /** Field to use as the record title/name */
    titleField?: string
    /** Whether entity supports soft delete */
    softDelete?: boolean
}

/**
 * Filter operator types
 */
export type FilterOperator =
    | 'eq' // equals
    | 'ne' // not equals
    | 'gt' // greater than
    | 'gte' // greater than or equal
    | 'lt' // less than
    | 'lte' // less than or equal
    | 'contains' // string contains
    | 'startsWith' // string starts with
    | 'endsWith' // string ends with
    | 'in' // value in array
    | 'notIn' // value not in array
    | 'isNull' // is null
    | 'isNotNull' // is not null

/**
 * Filter definition for views
 */
export interface Filter {
    /** Field to filter on */
    field: string
    /** Filter operator */
    operator: FilterOperator
    /** Filter value */
    value: unknown
}

/**
 * Column configuration for table views
 */
export interface TableColumn {
    /** Field ID */
    field: string
    /** Column width (px or %) */
    width?: number | string
    /** Whether column is sortable */
    sortable?: boolean
    /** Whether column is filterable */
    filterable?: boolean
    /** Custom render function name */
    renderer?: string
}

/**
 * Table view configuration
 */
export interface TableView {
    type: 'table'
    /** View unique ID */
    id: string
    /** View name */
    name: string
    /** View label */
    label: string
    /** View description */
    description?: string
    /** Entity this view displays */
    entityId: string
    /** Columns to display */
    columns: TableColumn[]
    /** Default filters */
    filters?: Filter[]
    /** Default sort */
    sort?: {
        field: string
        order: 'asc' | 'desc'
    }
    /** Page size */
    pageSize?: number
    /** Whether to show search bar */
    searchable?: boolean
    /** Whether to allow inline editing */
    inlineEditable?: boolean
    /** Whether to show create button */
    showCreate?: boolean
    /** Whether to show delete action */
    showDelete?: boolean
}

/**
 * Kanban column configuration
 */
export interface KanbanColumn {
    /** Column ID (usually matches the status value) */
    id: string
    /** Column label */
    label: string
    /** Column color */
    color?: string
    /** Filter value for this column */
    filterValue: unknown
}

/**
 * Kanban card field to display
 */
export interface KanbanCardField {
    /** Field ID */
    field: string
    /** Display label */
    label?: string
    /** Display position */
    position?: 'header' | 'body' | 'footer'
}

/**
 * Kanban view configuration
 */
export interface KanbanView {
    type: 'kanban'
    id: string
    name: string
    label: string
    description?: string
    entityId: string
    /** Field to group by (usually a status field) */
    groupByField: string
    /** Columns configuration */
    columns: KanbanColumn[]
    /** Fields to display on cards */
    cardFields: KanbanCardField[]
    /** Field to use as card title */
    cardTitleField: string
    /** Default filters */
    filters?: Filter[]
    /** Whether cards are draggable */
    draggable?: boolean
    /** Whether to show create button */
    showCreate?: boolean
}

/**
 * Calendar view configuration
 */
export interface CalendarView {
    type: 'calendar'
    id: string
    name: string
    label: string
    description?: string
    entityId: string
    /** Field to use as start date */
    startDateField: string
    /** Field to use as end date (optional) */
    endDateField?: string
    /** Field to use as event title */
    titleField: string
    /** Field to use for color coding */
    colorField?: string
    /** Default view mode */
    defaultView?: 'month' | 'week' | 'day' | 'agenda'
    /** Default filters */
    filters?: Filter[]
    /** Whether to show create button */
    showCreate?: boolean
}

/**
 * Form field configuration
 */
export interface FormField {
    /** Field ID */
    field: string
    /** Override label */
    label?: string
    /** Override placeholder */
    placeholder?: string
    /** Override description */
    description?: string
    /** Whether to hide this field */
    hidden?: boolean
    /** Whether to make read-only */
    readOnly?: boolean
    /** Field width (1-12, like Bootstrap grid) */
    width?: number
}

/**
 * Form section for grouping fields
 */
export interface FormSection {
    /** Section ID */
    id: string
    /** Section title */
    title?: string
    /** Section description */
    description?: string
    /** Fields in this section */
    fields: FormField[]
    /** Whether section is collapsible */
    collapsible?: boolean
    /** Whether section is initially collapsed */
    defaultCollapsed?: boolean
}

/**
 * Form view configuration
 */
export interface FormView {
    type: 'form'
    id: string
    name: string
    label: string
    description?: string
    entityId: string
    /** Form sections */
    sections: FormSection[]
    /** Submit button text */
    submitLabel?: string
    /** Cancel button text */
    cancelLabel?: string
}

/**
 * Detail view configuration (for viewing single records)
 */
export interface DetailView {
    type: 'detail'
    id: string
    name: string
    label: string
    description?: string
    entityId: string
    /** Fields to display */
    fields: FormField[]
    /** Whether to show edit button */
    showEdit?: boolean
    /** Whether to show delete button */
    showDelete?: boolean
}

/**
 * Union type of all view types
 */
export type View = TableView | KanbanView | CalendarView | FormView | DetailView

/**
 * Navigation item configuration
 */
export interface NavigationItem {
    /** Navigation ID */
    id: string
    /** Label */
    label: string
    /** Icon */
    icon?: string
    /** View to navigate to */
    viewId?: string
    /** Entity to navigate to (will use default view) */
    entityId?: string
    /** Sub-items for nested navigation */
    children?: NavigationItem[]
}

/**
 * Theme configuration
 */
export interface Theme {
    /** Primary color */
    primaryColor?: string
    /** Secondary color */
    secondaryColor?: string
    /** Success color */
    successColor?: string
    /** Warning color */
    warningColor?: string
    /** Error color */
    errorColor?: string
    /** Font family */
    fontFamily?: string
}

/**
 * Complete CRM Configuration
 */
export interface CRMConfig {
    /** Config version for migrations */
    version: string
    /** CRM name */
    name: string
    /** CRM description */
    description?: string
    /** Logo URL */
    logo?: string
    /** Theme configuration */
    theme?: Theme
    /** All entities in the CRM */
    entities: Entity[]
    /** All views in the CRM */
    views: View[]
    /** Navigation structure */
    navigation: NavigationItem[]
    /** Default landing view */
    defaultView?: string
}

/**
 * Type guards for view types
 */
export function isTableView(view: View): view is TableView {
    return view.type === 'table'
}

export function isKanbanView(view: View): view is KanbanView {
    return view.type === 'kanban'
}

export function isCalendarView(view: View): view is CalendarView {
    return view.type === 'calendar'
}

export function isFormView(view: View): view is FormView {
    return view.type === 'form'
}

export function isDetailView(view: View): view is DetailView {
    return view.type === 'detail'
}
