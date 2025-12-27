/**
 * Test Storage Data Provider for Refine
 * 
 * Uses in-memory test-storage instead of Supabase for demo/testing
 * This allows instant CRM previews without database setup
 */

import { DataProvider } from '@refinedev/core'
import {
    getDataRecords,
    getDataRecord,
    createDataRecord,
    updateDataRecord,
    deleteDataRecord,
    type TestDataRecord
} from '@/lib/test-storage'

export function createTestStorageDataProvider(projectId: string): DataProvider {
    return {
        // Get list of records
        getList: async ({ resource, pagination, filters, sorters }) => {
            const entityType = resource

            // Get all records for this entity
            const allRecords = getDataRecords(projectId, entityType)

            // Apply filters (simple implementation)
            let filtered = allRecords
            if (filters) {
                // Basic filter support - can be enhanced
                filtered = allRecords.filter(record => {
                    // For now, just return all - filters can be added later
                    return true
                })
            }

            // Apply sorting
            if (sorters && sorters.length > 0) {
                const sorter = sorters[0]
                filtered.sort((a, b) => {
                    const aVal = (a.data as any)[sorter.field]
                    const bVal = (b.data as any)[sorter.field]

                    if (aVal === bVal) return 0
                    const comparison = aVal > bVal ? 1 : -1
                    return sorter.order === 'desc' ? -comparison : comparison
                })
            }

            // Apply pagination
            const page = (pagination as any)?.current || 1
            const pageSize = (pagination as any)?.pageSize || 10
            const start = (page - 1) * pageSize
            const end = start + pageSize

            const paginatedData = filtered.slice(start, end)

            return {
                data: paginatedData.map(transformRecord),
                total: filtered.length,
            }
        },

        // Get single record
        getOne: async ({ resource, id }) => {
            const record = getDataRecord(String(id))

            if (!record) {
                throw new Error(`Record ${id} not found`)
            }

            return {
                data: transformRecord(record),
            }
        },

        // Get many records
        getMany: async ({ resource, ids }) => {
            const records = ids
                .map(id => getDataRecord(String(id)))
                .filter((r): r is TestDataRecord => r !== undefined)

            return {
                data: records.map(transformRecord),
            }
        },

        // Create record
        create: async ({ resource, variables }) => {
            const entityType = resource
            const record = createDataRecord(projectId, entityType, variables as Record<string, unknown>)

            return {
                data: transformRecord(record),
            }
        },

        // Update record
        update: async ({ resource, id, variables }) => {
            const record = updateDataRecord(String(id), variables as Record<string, unknown>)

            if (!record) {
                throw new Error(`Record ${id} not found`)
            }

            return {
                data: transformRecord(record),
            }
        },

        // Delete record
        deleteOne: async ({ resource, id }) => {
            deleteDataRecord(String(id))

            return {
                data: { id } as any,
            }
        },

        // Get API URL (not used for test storage)
        getApiUrl: () => '/api/test-storage',

        // Custom method support
        custom: async () => {
            throw new Error('Custom methods not supported in test storage')
        },
    }
}

/**
 * Transform test storage record to Refine format
 */
function transformRecord(record: TestDataRecord): any {
    return {
        id: record.id,
        ...record.data,
        _meta: {
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        },
    }
}

export default createTestStorageDataProvider
