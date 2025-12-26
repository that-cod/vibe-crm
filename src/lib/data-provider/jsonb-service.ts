/**
 * JSONB Data Service
 * 
 * Low-level service for direct JSONB operations on the crm_data table.
 * Use this for operations that don't fit the Refine data provider pattern,
 * such as complex aggregations or cross-entity queries.
 */

import { supabaseAdmin } from '../supabase'
import { CRMDataRecord } from './jsonb-data-provider'

/**
 * Query options for listing records
 */
export interface QueryOptions {
    projectId: string
    entityType?: string
    filters?: Array<{
        field: string
        operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in'
        value: unknown
    }>
    sort?: {
        field: string
        order: 'asc' | 'desc'
    }
    pagination?: {
        page: number
        pageSize: number
    }
    includeDeleted?: boolean
}

/**
 * Result type for paginated queries
 */
export interface PaginatedResult<T> {
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

/**
 * Get all records matching the query options
 */
export async function queryRecords(
    options: QueryOptions
): Promise<PaginatedResult<CRMDataRecord>> {
    const {
        projectId,
        entityType,
        filters = [],
        sort,
        pagination = { page: 1, pageSize: 25 },
        includeDeleted = false,
    } = options

    let query = supabaseAdmin
        .from('crm_data')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)

    if (entityType) {
        query = query.eq('entity_type', entityType)
    }

    if (!includeDeleted) {
        query = query.eq('deleted', false)
    }

    // Apply filters
    for (const filter of filters) {
        const { field, operator, value } = filter
        const isJsonField = !['id', 'project_id', 'entity_type', 'created_at', 'updated_at', 'deleted'].includes(field)
        const columnPath = isJsonField ? `data->>${field}` : field

        switch (operator) {
            case 'eq':
                query = query.eq(columnPath, value)
                break
            case 'neq':
                query = query.neq(columnPath, value)
                break
            case 'gt':
                query = query.gt(columnPath, value)
                break
            case 'gte':
                query = query.gte(columnPath, value)
                break
            case 'lt':
                query = query.lt(columnPath, value)
                break
            case 'lte':
                query = query.lte(columnPath, value)
                break
            case 'like':
                query = query.like(columnPath, value as string)
                break
            case 'ilike':
                query = query.ilike(columnPath, value as string)
                break
            case 'in':
                query = query.in(columnPath, value as unknown[])
                break
        }
    }

    // Apply sorting
    if (sort) {
        const isJsonField = !['id', 'project_id', 'entity_type', 'created_at', 'updated_at', 'deleted'].includes(sort.field)
        const sortPath = isJsonField ? `data->${sort.field}` : sort.field
        query = query.order(sortPath, { ascending: sort.order === 'asc' })
    } else {
        query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize
    const to = from + pagination.pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
        throw new Error(`Query failed: ${error.message}`)
    }

    const total = count ?? 0

    return {
        data: (data ?? []) as CRMDataRecord[],
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize),
    }
}

/**
 * Get a single record by ID
 */
export async function getRecord(
    projectId: string,
    id: string
): Promise<CRMDataRecord | null> {
    const { data, error } = await supabaseAdmin
        .from('crm_data')
        .select('*')
        .eq('id', id)
        .eq('project_id', projectId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') {
            return null // Not found
        }
        throw new Error(`Failed to get record: ${error.message}`)
    }

    return data as CRMDataRecord
}

/**
 * Create a new record
 */
export async function createRecord(
    projectId: string,
    entityType: string,
    data: Record<string, unknown>,
    userId?: string
): Promise<CRMDataRecord> {
    const { data: created, error } = await supabaseAdmin
        .from('crm_data')
        .insert({
            project_id: projectId,
            entity_type: entityType,
            data,
            created_by: userId,
            updated_by: userId,
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create record: ${error.message}`)
    }

    return created as CRMDataRecord
}

/**
 * Update an existing record
 */
export async function updateRecord(
    projectId: string,
    id: string,
    data: Record<string, unknown>,
    userId?: string
): Promise<CRMDataRecord> {
    const { data: updated, error } = await supabaseAdmin
        .from('crm_data')
        .update({
            data,
            updated_by: userId,
        })
        .eq('id', id)
        .eq('project_id', projectId)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to update record: ${error.message}`)
    }

    return updated as CRMDataRecord
}

/**
 * Soft delete a record
 */
export async function softDeleteRecord(
    projectId: string,
    id: string,
    userId?: string
): Promise<CRMDataRecord> {
    const { data: deleted, error } = await supabaseAdmin
        .from('crm_data')
        .update({
            deleted: true,
            deleted_at: new Date().toISOString(),
            updated_by: userId,
        })
        .eq('id', id)
        .eq('project_id', projectId)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to soft delete record: ${error.message}`)
    }

    return deleted as CRMDataRecord
}

/**
 * Hard delete a record (permanent)
 */
export async function hardDeleteRecord(
    projectId: string,
    id: string
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('crm_data')
        .delete()
        .eq('id', id)
        .eq('project_id', projectId)

    if (error) {
        throw new Error(`Failed to delete record: ${error.message}`)
    }
}

/**
 * Restore a soft-deleted record
 */
export async function restoreRecord(
    projectId: string,
    id: string,
    userId?: string
): Promise<CRMDataRecord> {
    const { data: restored, error } = await supabaseAdmin
        .from('crm_data')
        .update({
            deleted: false,
            deleted_at: null,
            updated_by: userId,
        })
        .eq('id', id)
        .eq('project_id', projectId)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to restore record: ${error.message}`)
    }

    return restored as CRMDataRecord
}

/**
 * Bulk create multiple records
 */
export async function bulkCreateRecords(
    projectId: string,
    entityType: string,
    records: Array<Record<string, unknown>>,
    userId?: string
): Promise<CRMDataRecord[]> {
    const insertData = records.map((data) => ({
        project_id: projectId,
        entity_type: entityType,
        data,
        created_by: userId,
        updated_by: userId,
    }))

    const { data: created, error } = await supabaseAdmin
        .from('crm_data')
        .insert(insertData)
        .select()

    if (error) {
        throw new Error(`Failed to bulk create records: ${error.message}`)
    }

    return created as CRMDataRecord[]
}

/**
 * Bulk soft delete multiple records
 */
export async function bulkSoftDeleteRecords(
    projectId: string,
    ids: string[],
    userId?: string
): Promise<number> {
    const { data, error } = await supabaseAdmin
        .from('crm_data')
        .update({
            deleted: true,
            deleted_at: new Date().toISOString(),
            updated_by: userId,
        })
        .eq('project_id', projectId)
        .in('id', ids)
        .select('id')

    if (error) {
        throw new Error(`Failed to bulk delete records: ${error.message}`)
    }

    return data?.length ?? 0
}

/**
 * Count records by entity type
 */
export async function countRecordsByEntity(
    projectId: string
): Promise<Record<string, number>> {
    const { data, error } = await supabaseAdmin
        .from('crm_data')
        .select('entity_type')
        .eq('project_id', projectId)
        .eq('deleted', false)

    if (error) {
        throw new Error(`Failed to count records: ${error.message}`)
    }

    const counts: Record<string, number> = {}
    for (const record of data ?? []) {
        const entityType = record.entity_type
        counts[entityType] = (counts[entityType] ?? 0) + 1
    }

    return counts
}

/**
 * Search across all entity types
 */
export async function searchAcrossEntities(
    projectId: string,
    searchTerm: string,
    entityTypes?: string[]
): Promise<CRMDataRecord[]> {
    let query = supabaseAdmin
        .from('crm_data')
        .select('*')
        .eq('project_id', projectId)
        .eq('deleted', false)
        .textSearch('data', searchTerm, {
            type: 'websearch',
            config: 'english',
        })

    if (entityTypes && entityTypes.length > 0) {
        query = query.in('entity_type', entityTypes)
    }

    const { data, error } = await query.limit(100)

    if (error) {
        // Fallback to simple contains search if full-text search fails
        console.warn('Full-text search failed, falling back to contains:', error)

        let fallbackQuery = supabaseAdmin
            .from('crm_data')
            .select('*')
            .eq('project_id', projectId)
            .eq('deleted', false)
            .ilike('data::text', `%${searchTerm}%`)

        if (entityTypes && entityTypes.length > 0) {
            fallbackQuery = fallbackQuery.in('entity_type', entityTypes)
        }

        const fallbackResult = await fallbackQuery.limit(100)

        if (fallbackResult.error) {
            throw new Error(`Search failed: ${fallbackResult.error.message}`)
        }

        return fallbackResult.data as CRMDataRecord[]
    }

    return data as CRMDataRecord[]
}

/**
 * Get records that reference another record (for relationship lookups)
 */
export async function getRelatedRecords(
    projectId: string,
    entityType: string,
    relationshipField: string,
    targetId: string
): Promise<CRMDataRecord[]> {
    const { data, error } = await supabaseAdmin
        .from('crm_data')
        .select('*')
        .eq('project_id', projectId)
        .eq('entity_type', entityType)
        .eq('deleted', false)
        .eq(`data->>${relationshipField}`, targetId)

    if (error) {
        throw new Error(`Failed to get related records: ${error.message}`)
    }

    return data as CRMDataRecord[]
}

/**
 * Aggregate data by a field (for dashboards/reports)
 */
export async function aggregateByField(
    projectId: string,
    entityType: string,
    groupByField: string
): Promise<Array<{ value: string; count: number }>> {
    const { data, error } = await supabaseAdmin
        .from('crm_data')
        .select(`data->>${groupByField}`)
        .eq('project_id', projectId)
        .eq('entity_type', entityType)
        .eq('deleted', false)

    if (error) {
        throw new Error(`Failed to aggregate data: ${error.message}`)
    }

    // Count occurrences
    const counts: Record<string, number> = {}
    for (const record of data ?? []) {
        const value = String(Object.values(record)[0] ?? 'null')
        counts[value] = (counts[value] ?? 0) + 1
    }

    return Object.entries(counts).map(([value, count]) => ({ value, count }))
}
