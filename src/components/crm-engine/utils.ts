import type { Entity, CRMConfig } from '@/types/config'
import type { Field as FieldType } from '@/types/field-types'
import dayjs from 'dayjs'

/**
 * Get a field definition by its name from an entity
 */
export function getFieldByName(
    entity: Entity,
    fieldName: string
): FieldType | undefined {
    return entity.fields.find(f => f.name === fieldName)
}

/**
 * Get a field value from a record
 */
export function getFieldValue<T = unknown>(
    record: Record<string, unknown>,
    fieldName: string
): T | undefined {
    return record[fieldName] as T | undefined
}

/**
 * Get an entity by its ID from the config
 */
export function getEntityById(
    config: CRMConfig,
    entityId: string
): Entity | undefined {
    return config.entities.find(e => e.id === entityId)
}

/**
 * Get the display value for a field (formatted)
 */
export function getDisplayValue(
    value: unknown,
    field: FieldType
): string {
    if (value === null || value === undefined) {
        return '-'
    }

    switch (field.type) {
        case 'currency':
            const currencyField = field
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyField.currency || 'USD'
            }).format(value as number)

        case 'percentage':
            return `${value}%`

        case 'date':
            return dayjs(value as string).format('MMM D, YYYY')

        case 'datetime':
            return dayjs(value as string).format('MMM D, YYYY h:mm A')

        case 'time':
            return dayjs(value as string).format('h:mm A')

        case 'boolean':
            return value ? 'Yes' : 'No'

        case 'select':
            const selectField = field
            const option = selectField.options.find(o => o.value === value)
            return option?.label || String(value)

        case 'multiselect':
            const multiSelectField = field
            const values = value as string[]
            return values
                .map(v => multiSelectField.options.find(o => o.value === v)?.label || v)
                .join(', ')

        case 'email':
        case 'phone':
        case 'url':
        case 'text':
        case 'textarea':
        case 'richtext':
        default:
            return String(value)
    }
}

/**
 * Get color for a select field value
 */
export function getSelectColor(
    value: unknown,
    field: FieldType
): string | undefined {
    if (field.type !== 'select' && field.type !== 'multiselect') {
        return undefined
    }

    const option = field.options.find(o => o.value === value)
    return option?.color
}

/**
 * Convert a record field value to a Date object
 */
export function getDateValue(
    record: Record<string, unknown>,
    fieldName: string
): Date | undefined {
    const value = getFieldValue(record, fieldName)
    if (!value) return undefined

    const date = dayjs(value as string)
    return date.isValid() ? date.toDate() : undefined
}

/**
 * Get the title/name field value for a record
 */
export function getRecordTitle(
    record: Record<string, unknown>,
    entity: Entity
): string {
    const titleField = entity.titleField || entity.fields[0]?.name
    if (!titleField) return 'Untitled'

    const value = getFieldValue(record, titleField)
    return value ? String(value) : 'Untitled'
}

/**
 * Filter records by a field value
 */
export function filterRecords(
    records: Record<string, unknown>[],
    fieldName: string,
    filterValue: unknown
): Record<string, unknown>[] {
    return records.filter(record => {
        const value = getFieldValue(record, fieldName)
        return value === filterValue
    })
}

/**
 * Sort records by a field
 */
export function sortRecords(
    records: Record<string, unknown>[],
    fieldName: string,
    order: 'asc' | 'desc' = 'asc'
): Record<string, unknown>[] {
    return [...records].sort((a, b) => {
        const aValue = getFieldValue(a, fieldName)
        const bValue = getFieldValue(b, fieldName)

        if (aValue === bValue) return 0
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        const comparison = aValue < bValue ? -1 : 1
        return order === 'asc' ? comparison : -comparison
    })
}

/**
 * Get icon name for an entity
 */
export function getEntityIcon(entity: Entity): string {
    return entity.icon || 'file'
}

/**
 * Validate field value
 */
export function validateFieldValue(
    value: unknown,
    field: FieldType
): string | null {
    if (field.required && (value === null || value === undefined || value === '')) {
        return `${field.label} is required`
    }

    switch (field.type) {
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (value && !emailRegex.test(String(value))) {
                return 'Invalid email format'
            }
            break

        case 'url':
            try {
                if (value) new URL(String(value))
            } catch {
                return 'Invalid URL format'
            }
            break

        case 'number':
        case 'currency':
        case 'percentage':
            const numField = field
            const numValue = Number(value)
            if (numField.min !== undefined && numValue < numField.min) {
                return `Minimum value is ${numField.min}`
            }
            if (numField.max !== undefined && numValue > numField.max) {
                return `Maximum value is ${numField.max}`
            }
            break

        case 'text':
        case 'textarea':
            const textField = field
            const strValue = String(value)
            if (textField.maxLength && strValue.length > textField.maxLength) {
                return `Maximum length is ${textField.maxLength} characters`
            }
            if (textField.pattern) {
                const regex = new RegExp(textField.pattern)
                if (!regex.test(strValue)) {
                    return 'Invalid format'
                }
            }
            break
    }

    return null
}
