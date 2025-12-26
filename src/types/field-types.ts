/**
 * Field Types for CRM Configuration
 * Defines all possible field types that can be used in entities
 */

/**
 * Base field type that all field types extend
 */
export interface BaseField {
    /** Unique identifier for the field */
    id: string
    /** Field name (e.g., "firstName", "dealValue") */
    name: string
    /** Human-readable label */
    label: string
    /** Field description/help text */
    description?: string
    /** Whether field is required */
    required?: boolean
    /** Whether field should be shown in list views by default */
    showInList?: boolean
    /** Whether field is searchable */
    searchable?: boolean
    /** Whether field is sortable */
    sortable?: boolean
}

/**
 * Text field (single line)
 */
export interface TextField extends BaseField {
    type: 'text'
    /** Placeholder text */
    placeholder?: string
    /** Maximum length */
    maxLength?: number
    /** Regex pattern for validation */
    pattern?: string
    /** Default value */
    defaultValue?: string
}

/**
 * Long text field (multi-line)
 */
export interface TextAreaField extends BaseField {
    type: 'textarea'
    placeholder?: string
    maxLength?: number
    /** Number of rows to display */
    rows?: number
    defaultValue?: string
}

/**
 * Rich text editor field
 */
export interface RichTextField extends BaseField {
    type: 'richtext'
    placeholder?: string
    defaultValue?: string
}

/**
 * Number field
 */
export interface NumberField extends BaseField {
    type: 'number'
    placeholder?: string
    /** Minimum value */
    min?: number
    /** Maximum value */
    max?: number
    /** Step increment */
    step?: number
    defaultValue?: number
}

/**
 * Currency field (stored as number)
 */
export interface CurrencyField extends BaseField {
    type: 'currency'
    /** Currency code (USD, EUR, etc.) */
    currency: string
    placeholder?: string
    min?: number
    max?: number
    defaultValue?: number
}

/**
 * Percentage field (stored as number)
 */
export interface PercentageField extends BaseField {
    type: 'percentage'
    placeholder?: string
    min?: number
    max?: number
    defaultValue?: number
}

/**
 * Boolean/checkbox field
 */
export interface BooleanField extends BaseField {
    type: 'boolean'
    defaultValue?: boolean
}

/**
 * Date field
 */
export interface DateField extends BaseField {
    type: 'date'
    /** Minimum date (ISO string or relative like "today") */
    minDate?: string
    /** Maximum date */
    maxDate?: string
    defaultValue?: string
}

/**
 * DateTime field
 */
export interface DateTimeField extends BaseField {
    type: 'datetime'
    minDate?: string
    maxDate?: string
    defaultValue?: string
}

/**
 * Time field
 */
export interface TimeField extends BaseField {
    type: 'time'
    defaultValue?: string
}

/**
 * Select option
 */
export interface SelectOption {
    value: string
    label: string
    /** Optional color for UI */
    color?: string
    /** Optional icon */
    icon?: string
}

/**
 * Single select field (dropdown)
 */
export interface SelectField extends BaseField {
    type: 'select'
    /** Available options */
    options: SelectOption[]
    placeholder?: string
    defaultValue?: string
}

/**
 * Multi-select field
 */
export interface MultiSelectField extends BaseField {
    type: 'multiselect'
    options: SelectOption[]
    placeholder?: string
    defaultValue?: string[]
}

/**
 * Email field
 */
export interface EmailField extends BaseField {
    type: 'email'
    placeholder?: string
    defaultValue?: string
}

/**
 * Phone field
 */
export interface PhoneField extends BaseField {
    type: 'phone'
    placeholder?: string
    /** Country code format */
    format?: string
    defaultValue?: string
}

/**
 * URL field
 */
export interface UrlField extends BaseField {
    type: 'url'
    placeholder?: string
    defaultValue?: string
}

/**
 * File upload field
 */
export interface FileField extends BaseField {
    type: 'file'
    /** Accepted file types (MIME types or extensions) */
    accept?: string[]
    /** Maximum file size in bytes */
    maxSize?: number
    /** Allow multiple files */
    multiple?: boolean
}

/**
 * Image upload field
 */
export interface ImageField extends BaseField {
    type: 'image'
    /** Accepted image types */
    accept?: string[]
    maxSize?: number
    /** Image dimensions constraints */
    maxWidth?: number
    maxHeight?: number
    multiple?: boolean
}

/**
 * Relationship field types
 */
export type RelationshipType = 'belongsTo' | 'hasMany' | 'manyToMany'

/**
 * Relationship field (foreign key)
 */
export interface RelationshipField extends BaseField {
    type: 'relationship'
    /** Type of relationship */
    relationshipType: RelationshipType
    /** Target entity ID */
    targetEntity: string
    /** Display field from target entity */
    displayField?: string
    /** Whether to cascade delete */
    cascadeDelete?: boolean
}

/**
 * JSON field (for storing structured data)
 */
export interface JsonField extends BaseField {
    type: 'json'
    /** JSON schema for validation */
    schema?: Record<string, unknown>
}

/**
 * Auto-increment ID field
 */
export interface AutoIdField extends BaseField {
    type: 'autoId'
    /** Starting value */
    startValue?: number
}

/**
 * Created timestamp field
 */
export interface CreatedAtField extends BaseField {
    type: 'createdAt'
}

/**
 * Updated timestamp field
 */
export interface UpdatedAtField extends BaseField {
    type: 'updatedAt'
}

/**
 * Union type of all possible field types
 */
export type Field =
    | TextField
    | TextAreaField
    | RichTextField
    | NumberField
    | CurrencyField
    | PercentageField
    | BooleanField
    | DateField
    | DateTimeField
    | TimeField
    | SelectField
    | MultiSelectField
    | EmailField
    | PhoneField
    | UrlField
    | FileField
    | ImageField
    | RelationshipField
    | JsonField
    | AutoIdField
    | CreatedAtField
    | UpdatedAtField

/**
 * Type guard to check field types
 */
export function isFieldType<T extends Field['type']>(
    field: Field,
    type: T
): field is Extract<Field, { type: T }> {
    return field.type === type
}
