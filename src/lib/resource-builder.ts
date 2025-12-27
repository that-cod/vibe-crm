/**
 * Resource Builder
 * 
 * Converts CRM configuration into Refine.dev resources with:
 * - Dynamic routes for CRUD operations
 * - Relationship metadata for lookups and linked records
 * - Form field configurations with validation
 * - Entity metadata for component rendering
 */

import type { CRMConfig, Entity, View } from '@/types/config'
import type { Field } from '@/types/field-types'
import type { ResourceProps } from '@refinedev/core'

/**
 * Extended resource metadata with relationship and form info
 */
export interface ExtendedResourceMeta {
    entityId: string
    label: string
    labelSingular: string
    icon?: string
    description?: string
    entity: Entity
    relationships: RelationshipMeta[]
    formFields: FormFieldConfig[]
    titleField: string
    defaultView?: string
}

/**
 * Relationship metadata for lookups
 */
export interface RelationshipMeta {
    fieldId: string
    fieldName: string
    type: 'belongsTo' | 'hasMany' | 'manyToMany'
    targetEntityId: string
    targetEntityName: string
    targetTitleField: string
    displayInList: boolean
    displayInDetail: boolean
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
    fieldId: string
    name: string
    label: string
    type: string
    required: boolean
    placeholder?: string
    defaultValue?: unknown
    validation?: ValidationRule[]
    options?: { value: string; label: string; color?: string }[]
    relationship?: {
        targetEntityId: string
        displayField: string
    }
    width?: number // 1-12 grid columns
    hidden?: boolean
    readOnly?: boolean
}

/**
 * Validation rule for form fields
 */
export interface ValidationRule {
    type: 'required' | 'email' | 'phone' | 'url' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern'
    value?: unknown
    message: string
}

/**
 * Build Refine resources from CRM configuration
 * 
 * Converts each entity in the config to a Refine resource with:
 * - Dynamic routes
 * - Relationship metadata
 * - Form field configurations
 */
export function buildResourcesFromConfig(config: CRMConfig): ResourceProps[] {
    return config.entities.map(entity => {
        const relationships = extractRelationships(entity, config.entities)
        const formFields = buildFormFields(entity, config.entities)
        const defaultView = findDefaultView(entity.id, config.views)

        const meta: ExtendedResourceMeta = {
            entityId: entity.id,
            label: entity.labelPlural,
            labelSingular: entity.label,
            icon: entity.icon,
            description: entity.description,
            entity,
            relationships,
            formFields,
            titleField: entity.titleField || 'name',
            defaultView,
        }

        return {
            name: entity.tableName,
            identifier: entity.id,
            list: `/crm/${entity.id}`,
            show: `/crm/${entity.id}/:id`,
            create: `/crm/${entity.id}/new`,
            edit: `/crm/${entity.id}/:id/edit`,
            meta,
        }
    })
}

/**
 * Extract relationship metadata from entity fields
 */
function extractRelationships(entity: Entity, allEntities: Entity[]): RelationshipMeta[] {
    const relationships: RelationshipMeta[] = []

    for (const field of entity.fields) {
        if (field.type === 'relationship') {
            const relField = field as Field & {
                relationshipType?: 'belongsTo' | 'hasMany' | 'manyToMany'
                targetEntity?: string
            }

            if (relField.targetEntity) {
                const targetEntity = allEntities.find(e => e.id === relField.targetEntity)

                relationships.push({
                    fieldId: field.id,
                    fieldName: field.name,
                    type: relField.relationshipType || 'belongsTo',
                    targetEntityId: relField.targetEntity,
                    targetEntityName: targetEntity?.name || relField.targetEntity,
                    targetTitleField: targetEntity?.titleField || 'name',
                    displayInList: field.showInList !== false,
                    displayInDetail: true,
                })
            }
        }
    }

    // Also check for reverse relationships (hasMany)
    for (const otherEntity of allEntities) {
        if (otherEntity.id === entity.id) continue

        for (const field of otherEntity.fields) {
            if (field.type === 'relationship') {
                const relField = field as Field & { targetEntity?: string }

                if (relField.targetEntity === entity.id) {
                    // This entity has a hasMany relationship with otherEntity
                    relationships.push({
                        fieldId: `${otherEntity.id}_reverse`,
                        fieldName: otherEntity.namePlural.toLowerCase(),
                        type: 'hasMany',
                        targetEntityId: otherEntity.id,
                        targetEntityName: otherEntity.name,
                        targetTitleField: otherEntity.titleField || 'name',
                        displayInList: false,
                        displayInDetail: true,
                    })
                }
            }
        }
    }

    return relationships
}

/**
 * Build form field configurations from entity fields
 */
function buildFormFields(entity: Entity, allEntities: Entity[]): FormFieldConfig[] {
    return entity.fields
        .filter(field => !['autoId', 'createdAt', 'updatedAt'].includes(field.type))
        .map(field => {
            const config: FormFieldConfig = {
                fieldId: field.id,
                name: field.name,
                label: field.label,
                type: field.type,
                required: field.required || false,
                placeholder: (field as { placeholder?: string }).placeholder,
                defaultValue: (field as { defaultValue?: unknown }).defaultValue,
                validation: buildValidationRules(field),
                width: calculateFieldWidth(field),
                hidden: field.name === 'id' || field.type === 'autoId',
            }

            // Handle select/multiselect options
            if (field.type === 'select' || field.type === 'multiselect') {
                const selectField = field as { options?: { value: string; label: string; color?: string }[] }
                config.options = selectField.options
            }

            // Handle relationship fields
            if (field.type === 'relationship') {
                const relField = field as { targetEntity?: string }
                const targetEntity = allEntities.find(e => e.id === relField.targetEntity)

                config.relationship = {
                    targetEntityId: relField.targetEntity || '',
                    displayField: targetEntity?.titleField || 'name',
                }
            }

            return config
        })
}

/**
 * Build validation rules from field configuration
 */
function buildValidationRules(field: Field): ValidationRule[] {
    const rules: ValidationRule[] = []

    if (field.required) {
        rules.push({
            type: 'required',
            message: `${field.label} is required`,
        })
    }

    if (field.type === 'email') {
        rules.push({
            type: 'email',
            message: 'Please enter a valid email address',
        })
    }

    if (field.type === 'phone') {
        rules.push({
            type: 'phone',
            message: 'Please enter a valid phone number',
        })
    }

    if (field.type === 'url') {
        rules.push({
            type: 'url',
            message: 'Please enter a valid URL',
        })
    }

    // Check for min/max validation on numeric fields
    const fieldWithValidation = field as { validation?: { min?: number; max?: number; minLength?: number; maxLength?: number; pattern?: string } }

    if (fieldWithValidation.validation) {
        const v = fieldWithValidation.validation

        if (v.min !== undefined) {
            rules.push({
                type: 'min',
                value: v.min,
                message: `Minimum value is ${v.min}`,
            })
        }

        if (v.max !== undefined) {
            rules.push({
                type: 'max',
                value: v.max,
                message: `Maximum value is ${v.max}`,
            })
        }

        if (v.minLength !== undefined) {
            rules.push({
                type: 'minLength',
                value: v.minLength,
                message: `Minimum length is ${v.minLength} characters`,
            })
        }

        if (v.maxLength !== undefined) {
            rules.push({
                type: 'maxLength',
                value: v.maxLength,
                message: `Maximum length is ${v.maxLength} characters`,
            })
        }

        if (v.pattern) {
            rules.push({
                type: 'pattern',
                value: v.pattern,
                message: 'Invalid format',
            })
        }
    }

    return rules
}

/**
 * Calculate field width based on type
 */
function calculateFieldWidth(field: Field): number {
    // Full width fields
    if (['textarea', 'richtext'].includes(field.type)) {
        return 12
    }

    // Half width fields
    if (['date', 'datetime', 'time', 'number', 'currency', 'percentage', 'boolean'].includes(field.type)) {
        return 6
    }

    // Default: 2/3 width
    return 8
}

/**
 * Find default view for an entity
 */
function findDefaultView(entityId: string, views: View[]): string | undefined {
    // First try to find a table view for this entity
    const tableView = views.find(v => v.entityId === entityId && v.type === 'table')
    if (tableView) return tableView.id

    // Otherwise any view for this entity
    const anyView = views.find(v => v.entityId === entityId)
    return anyView?.id
}

/**
 * Get resource metadata by entity ID
 */
export function getResourceByEntityId(
    resources: ResourceProps[],
    entityId: string
): ResourceProps | undefined {
    return resources.find(r => (r.meta as ExtendedResourceMeta)?.entityId === entityId)
}

/**
 * Get resource metadata by table name
 */
export function getResourceByTableName(
    resources: ResourceProps[],
    tableName: string
): ResourceProps | undefined {
    return resources.find(r => r.name === tableName)
}

/**
 * Get relationship metadata for an entity
 */
export function getEntityRelationships(
    resources: ResourceProps[],
    entityId: string
): RelationshipMeta[] {
    const resource = getResourceByEntityId(resources, entityId)
    return (resource?.meta as ExtendedResourceMeta)?.relationships || []
}

/**
 * Get form field configurations for an entity
 */
export function getEntityFormFields(
    resources: ResourceProps[],
    entityId: string
): FormFieldConfig[] {
    const resource = getResourceByEntityId(resources, entityId)
    return (resource?.meta as ExtendedResourceMeta)?.formFields || []
}

export default buildResourcesFromConfig
