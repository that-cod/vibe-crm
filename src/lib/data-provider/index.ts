/**
 * Data Provider Exports
 * 
 * This module exports the custom JSONB data provider for Refine
 * along with helper utilities for working with CRM data.
 */

// Export the main data provider factory
export { createJSONBDataProvider, type CRMDataRecord } from './jsonb-data-provider'

// Export service functions for direct database operations
export {
    queryRecords,
    getRecord,
    createRecord,
    updateRecord,
    softDeleteRecord,
    hardDeleteRecord,
    restoreRecord,
    bulkCreateRecords,
    bulkSoftDeleteRecords,
    countRecordsByEntity,
    searchAcrossEntities,
    getRelatedRecords,
    aggregateByField,
    type QueryOptions,
    type PaginatedResult,
} from './jsonb-service'

/**
 * Helper to initialize a data provider with project context
 */
export async function initializeDataProvider(projectId: string) {
    const { createJSONBDataProvider } = await import('./jsonb-data-provider')
    return createJSONBDataProvider(projectId)
}
