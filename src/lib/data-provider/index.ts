/**
 * Data Provider Exports
 * 
 * This module exports the custom JSONB data provider and live provider for Refine.
 * The data provider uses the regular supabase client and can be
 * used in client components.
 * 
 * For server-only operations (bulk operations, aggregations, etc.),
 * import directly from './jsonb-service' in server components or API routes.
 */

// Export the main data provider factory (client-compatible)
export { createJSONBDataProvider, type CRMDataRecord } from './jsonb-data-provider'

// Export the test storage provider (in-memory, for demos)
export { createTestStorageDataProvider } from './test-storage-provider'

// Export the live provider for real-time updates
export {
    createCRMLiveProvider,
    useCRMLiveProvider,
    cleanupCRMSubscriptions,
    getActiveSubscriptionCount,
    isSubscribed,
} from './crm-live-provider'

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

/**
 * Helper to initialize both data and live providers
 */
export async function initializeCRMProviders(projectId: string) {
    const [{ createJSONBDataProvider }, { createCRMLiveProvider }] = await Promise.all([
        import('./jsonb-data-provider'),
        import('./crm-live-provider'),
    ])

    return {
        dataProvider: createJSONBDataProvider(projectId),
        liveProvider: createCRMLiveProvider(projectId),
    }
}
