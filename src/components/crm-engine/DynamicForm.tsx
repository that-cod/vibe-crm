'use client'

/**
 * DynamicForm - Create/Edit form component
 * 
 * Renders forms dynamically based on entity field configuration.
 * Supports:
 * - All field types (text, select, date, relationship, etc.)
 * - Validation rules
 * - Relationship lookups
 * - Create and edit modes
 */

import { useState, useEffect, useCallback } from 'react'
import { useOneData, useCreateData, useUpdateData, useListData } from '@/lib/refine-hooks'
import type { Entity, CRMConfig } from '@/types/config'
import type { Field } from '@/types/field-types'
import { type FormFieldConfig } from '@/lib/resource-builder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, X, AlertCircle } from 'lucide-react'

export interface DynamicFormProps {
    entity: Entity
    config: CRMConfig
    recordId?: string  // Undefined for create, ID for edit
    initialData?: Record<string, unknown>
    onSuccess?: (record: Record<string, unknown>) => void
    onCancel?: () => void
    mode?: 'page' | 'modal' | 'drawer'
}

export function DynamicForm({
    entity,
    config,
    recordId,
    initialData,
    onSuccess,
    onCancel,
    mode = 'page'
}: DynamicFormProps) {
    const isEdit = !!recordId
    const [formData, setFormData] = useState<Record<string, unknown>>(initialData || {})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    // Fetch existing record for edit mode
    const { data: existingRecord, isLoading: isLoadingRecord } = useOneData({
        resource: entity.tableName,
        id: recordId || '',
        queryOptions: { enabled: isEdit }
    })

    // Create and update mutations
    const { mutate: createRecord, isLoading: isCreating } = useCreateData()
    const { mutate: updateRecord, isLoading: isUpdating } = useUpdateData()

    const isLoading = isLoadingRecord || isCreating || isUpdating

    // Get form field configurations
    const formFields = getFormFields(entity)

    // Populate form with existing data when editing
    useEffect(() => {
        if (existingRecord && isEdit) {
            setFormData(existingRecord as Record<string, unknown>)
        }
    }, [existingRecord, isEdit])

    // Handle field value change
    const handleChange = useCallback((fieldName: string, value: unknown) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }))
        setTouched(prev => ({ ...prev, [fieldName]: true }))

        // Clear error when field is modified
        if (errors[fieldName]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[fieldName]
                return newErrors
            })
        }
    }, [errors])

    // Validate all fields
    const validate = useCallback((): boolean => {
        const newErrors: Record<string, string> = {}

        for (const field of formFields) {
            const value = formData[field.name]

            // Required validation
            if (field.required && (value === undefined || value === null || value === '')) {
                newErrors[field.name] = `${field.label} is required`
                continue
            }

            // Type-specific validation
            if (value) {
                if (field.type === 'email' && typeof value === 'string') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!emailRegex.test(value)) {
                        newErrors[field.name] = 'Please enter a valid email address'
                    }
                }

                if (field.type === 'url' && typeof value === 'string') {
                    try {
                        new URL(value)
                    } catch {
                        newErrors[field.name] = 'Please enter a valid URL'
                    }
                }
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }, [formData, formFields])

    // Handle form submission
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        const submitData = { ...formData }

        if (isEdit && recordId) {
            updateRecord(
                {
                    resource: entity.tableName,
                    id: recordId,
                    values: submitData,
                },
                {
                    onSuccess: (data) => {
                        onSuccess?.(data.data as Record<string, unknown>)
                    },
                }
            )
        } else {
            createRecord(
                {
                    resource: entity.tableName,
                    values: submitData,
                },
                {
                    onSuccess: (data) => {
                        onSuccess?.(data.data as Record<string, unknown>)
                    },
                }
            )
        }
    }, [formData, isEdit, recordId, entity.tableName, validate, createRecord, updateRecord, onSuccess])

    if (isLoadingRecord && isEdit) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                    {isEdit ? `Edit ${entity.label}` : `New ${entity.label}`}
                </h2>
                {onCancel && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-12 gap-4">
                {formFields.map(field => (
                    <FormField
                        key={field.fieldId}
                        field={field}
                        value={formData[field.name]}
                        onChange={(value) => handleChange(field.name, value)}
                        error={touched[field.name] ? errors[field.name] : undefined}
                        config={config}
                    />
                ))}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="border-white/20 text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isEdit ? 'Updating...' : 'Creating...'}
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {isEdit ? 'Update' : 'Create'} {entity.label}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}

/**
 * Individual form field component
 */
interface FormFieldProps {
    field: FormFieldConfig
    value: unknown
    onChange: (value: unknown) => void
    error?: string
    config: CRMConfig
}

function FormField({ field, value, onChange, error, config }: FormFieldProps) {
    const colSpan = field.width || 6

    if (field.hidden) return null

    return (
        <div className={`col-span-${colSpan} space-y-2`} style={{ gridColumn: `span ${colSpan}` }}>
            <Label htmlFor={field.fieldId} className="text-gray-300">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>

            <FieldInput
                field={field}
                value={value}
                onChange={onChange}
                config={config}
            />

            {error && (
                <div className="flex items-center gap-1 text-red-400 text-sm">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </div>
            )}
        </div>
    )
}

/**
 * Field input renderer based on type
 */
interface FieldInputProps {
    field: FormFieldConfig
    value: unknown
    onChange: (value: unknown) => void
    config: CRMConfig
}

function FieldInput({ field, value, onChange, config }: FieldInputProps) {
    const baseInputClass = "w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"

    switch (field.type) {
        case 'text':
        case 'email':
        case 'phone':
        case 'url':
            return (
                <Input
                    id={field.fieldId}
                    type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    className={baseInputClass}
                    readOnly={field.readOnly}
                />
            )

        case 'textarea':
        case 'richtext':
            return (
                <textarea
                    id={field.fieldId}
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    rows={4}
                    className={`${baseInputClass} resize-none`}
                    readOnly={field.readOnly}
                />
            )

        case 'number':
        case 'percentage':
            return (
                <div className="relative">
                    <Input
                        id={field.fieldId}
                        type="number"
                        value={(value as number) ?? ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={field.placeholder || '0'}
                        className={baseInputClass}
                        readOnly={field.readOnly}
                    />
                    {field.type === 'percentage' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    )}
                </div>
            )

        case 'currency':
            return (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <Input
                        id={field.fieldId}
                        type="number"
                        value={(value as number) ?? ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="0.00"
                        className={`${baseInputClass} pl-7`}
                        readOnly={field.readOnly}
                    />
                </div>
            )

        case 'date':
            return (
                <Input
                    id={field.fieldId}
                    type="date"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                    readOnly={field.readOnly}
                />
            )

        case 'datetime':
            return (
                <Input
                    id={field.fieldId}
                    type="datetime-local"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                    readOnly={field.readOnly}
                />
            )

        case 'time':
            return (
                <Input
                    id={field.fieldId}
                    type="time"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                    readOnly={field.readOnly}
                />
            )

        case 'boolean':
            return (
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                        disabled={field.readOnly}
                    />
                    <span className="text-gray-300">{field.label}</span>
                </label>
            )

        case 'select':
            return (
                <select
                    id={field.fieldId}
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={baseInputClass}
                    disabled={field.readOnly}
                >
                    <option value="">Select {field.label}</option>
                    {field.options?.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            )

        case 'multiselect':
            const selectedValues = (value as string[]) || []
            return (
                <div className="space-y-2">
                    {field.options?.map(option => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(option.value)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        onChange([...selectedValues, option.value])
                                    } else {
                                        onChange(selectedValues.filter(v => v !== option.value))
                                    }
                                }}
                                className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500"
                                disabled={field.readOnly}
                            />
                            <span className="text-gray-300">{option.label}</span>
                        </label>
                    ))}
                </div>
            )

        case 'relationship':
            return (
                <RelationshipSelect
                    field={field}
                    value={value as string}
                    onChange={onChange}
                    config={config}
                />
            )

        default:
            return (
                <Input
                    id={field.fieldId}
                    type="text"
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className={baseInputClass}
                />
            )
    }
}

/**
 * Relationship field with lookup
 */
interface RelationshipSelectProps {
    field: FormFieldConfig
    value: string | undefined
    onChange: (value: unknown) => void
    config: CRMConfig
}

function RelationshipSelect({ field, value, onChange, config }: RelationshipSelectProps) {
    const targetEntityId = field.relationship?.targetEntityId
    const targetEntity = config.entities.find(e => e.id === targetEntityId)

    // Fetch related records for selection
    const { data, isLoading } = useListData({
        resource: targetEntity?.tableName || '',
        pagination: { pageSize: 100 },
        queryOptions: { enabled: !!targetEntity }
    })

    const records = data || []
    const displayField = field.relationship?.displayField || targetEntity?.titleField || 'name'

    return (
        <select
            id={field.fieldId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading || field.readOnly}
        >
            <option value="">
                {isLoading ? 'Loading...' : `Select ${targetEntity?.label || 'record'}`}
            </option>
            {records.map((record: Record<string, unknown>) => (
                <option key={record.id as string} value={record.id as string}>
                    {String(record[displayField] || record.id)}
                </option>
            ))}
        </select>
    )
}

/**
 * Helper to get form fields from entity
 */
function getFormFields(entity: Entity): FormFieldConfig[] {
    return entity.fields
        .filter(f => !['autoId', 'createdAt', 'updatedAt'].includes(f.type))
        .map(field => ({
            fieldId: field.id,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required || false,
            placeholder: (field as { placeholder?: string }).placeholder,
            defaultValue: (field as { defaultValue?: unknown }).defaultValue,
            validation: [],
            options: (field as { options?: { value: string; label: string }[] }).options,
            relationship: field.type === 'relationship' ? {
                targetEntityId: (field as { targetEntity?: string }).targetEntity || '',
                displayField: 'name'
            } : undefined,
            width: ['textarea', 'richtext'].includes(field.type) ? 12 : 6,
            hidden: field.name === 'id' || field.type === 'autoId',
            readOnly: false,
        }))
}

export default DynamicForm
