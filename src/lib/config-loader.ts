import type { CRMConfig, Entity, View } from '@/types/config'
// Use relative path to access public directory from src
import mockConfig from '../../public/mock-crm-config.json'

/**
 * Load CRM configuration
 * 
 * For now, loads from the mock JSON file.
 * In production, this would fetch from database based on user/tenant.
 */
export async function loadCRMConfig(): Promise<CRMConfig> {
    // TODO: Replace with database fetch
    // Example: const config = await prisma.crmConfig.findUnique({ where: { userId } })
    return mockConfig as CRMConfig
}

/**
 * Get an entity by its ID from the configuration
 */
export function getEntityFromConfig(
    config: CRMConfig,
    entityId: string
): Entity | undefined {
    return config.entities.find(e => e.id === entityId)
}

/**
 * Get an entity by its table name from the configuration
 */
export function getEntityByTableName(
    config: CRMConfig,
    tableName: string
): Entity | undefined {
    return config.entities.find(e => e.tableName === tableName)
}

/**
 * Get a view by its ID from the configuration
 */
export function getViewFromConfig(
    config: CRMConfig,
    viewId: string
): View | undefined {
    return config.views.find(v => v.id === viewId)
}

/**
 * Get all views for a specific entity
 */
export function getViewsForEntity(
    config: CRMConfig,
    entityId: string
): View[] {
    return config.views.filter(v => v.entityId === entityId)
}

/**
 * Get the default view for an entity
 * Returns the first table view found, or the first view of any type
 */
export function getDefaultViewForEntity(
    config: CRMConfig,
    entityId: string
): View | undefined {
    const entityViews = getViewsForEntity(config, entityId)

    // Prefer table views as default
    const tableView = entityViews.find(v => v.type === 'table')
    if (tableView) return tableView

    // Fallback to any view
    return entityViews[0]
}

/**
 * Get a view by view name (for URL routing)
 * This handles the case where view.name is used in URLs instead of view.id
 */
export function getViewByName(
    config: CRMConfig,
    viewName: string
): View | undefined {
    return config.views.find(v => v.name === viewName)
}

/**
 * Validate if a view belongs to an entity
 */
export function validateViewForEntity(
    view: View,
    entityId: string
): boolean {
    return view.entityId === entityId
}
