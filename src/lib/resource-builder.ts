import type { CRMConfig } from '@/types/config'
import type { ResourceProps } from '@refinedev/core'

/**
 * Build Refine resources from CRM configuration
 * 
 * Converts each entity in the config to a Refine resource with dynamic routes.
 */
export function buildResourcesFromConfig(config: CRMConfig): ResourceProps[] {
    return config.entities.map(entity => ({
        // Resource name (used by Refine for data fetching)
        name: entity.tableName,

        // List route (default view for entity)
        list: `/crm/${entity.id}`,

        // Show route (detail view)
        show: `/crm/${entity.id}/:id`,

        // Create route (new record form)
        create: `/crm/${entity.id}/new`,

        // Edit route (edit record form)
        edit: `/crm/${entity.id}/:id/edit`,

        // Additional metadata
        meta: {
            // Entity ID for lookups
            entityId: entity.id,

            // Display label (plural)
            label: entity.labelPlural,

            // Icon for navigation
            icon: entity.icon,

            // Description
            description: entity.description,

            // Original entity config (for component access)
            entity,
        },
    }))
}

/**
 * Get resource metadata by entity ID
 */
export function getResourceByEntityId(
    resources: ResourceProps[],
    entityId: string
): ResourceProps | undefined {
    return resources.find(r => r.meta?.entityId === entityId)
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
