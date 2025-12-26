/**
 * Data Provider Exports
 * 
 * This module exports the custom JSONB data provider for Refine.
 * The data provider uses the regular supabase client and can be
 * used in client components.
 * 
 * For server-only operations (bulk operations, aggregations, etc.),
 * import directly from './jsonb-service' in server components or API routes.
 */

// Export the main data provider factory (client-compatible)
export { createJSONBDataProvider, type CRMDataRecord } from './jsonb-data-provider'

// NOTE: The jsonb-service module is SERVER ONLY.
// Import it directly in server components/API routes:
// import { queryRecords, aggregateByField, ... } from '@/lib/data-provider/jsonb-service'

/**
 * Helper to initialize a data provider with project context
 */
export function initializeDataProvider(projectId: string) {
    // Dynamic import to avoid issues with SSR
    return import('./jsonb-data-provider').then(({ createJSONBDataProvider }) =>
        createJSONBDataProvider(projectId)
    )
}
