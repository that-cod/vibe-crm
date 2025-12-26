/**
 * Custom Refine Data Provider for JSONB Storage
 * 
 * This data provider works with the crm_data table which stores
 * all CRM entity data as JSONB. It provides full CRUD operations
 * with support for:
 * - Filtering (including nested JSONB fields)
 * - Sorting
 * - Pagination
 * - Search
 * - Soft delete
 */

import { DataProvider, GetListParams, GetOneParams, CreateParams, UpdateParams, DeleteOneParams, GetManyParams, CustomParams, MetaQuery, BaseRecord, LogicalFilter, CrudFilter } from '@refinedev/core'
import { supabaseAdmin } from '../supabase'

// Type for CRM data record
export interface CRMDataRecord {
    id: string
    project_id: string
    entity_type: string
    data: Record<string, unknown>
    created_by?: string
    updated_by?: string
    deleted: boolean
    deleted_at?: string
    created_at: string
    updated_at: string
}

// Extended meta for our data provider
interface JSONBMeta extends MetaQuery {
    projectId?: string
    includeDeleted?: boolean
}

// Type guard for LogicalFilter
function isLogicalFilter(filter: CrudFilter): filter is LogicalFilter {
    return 'field' in filter && 'operator' in filter
}

/**
 * Create a Refine Data Provider for JSONB storage
 * 
 * @param projectId - The CRM project ID to scope all queries to
 * @returns Refine DataProvider instance
 */
export function createJSONBDataProvider(projectId: string): DataProvider {
    return {
        /**
         * Get a list of records with filtering, sorting, and pagination
         */
        getList: async <TData extends BaseRecord = BaseRecord>({
            resource,
            pagination,
            filters,
            sorters,
            meta,
        }: GetListParams): Promise<{ data: TData[]; total: number }> => {
            // Access pagination properties with defaults and ensure numeric types
            const paginationConfig = pagination ?? {}
            const current: number = 'current' in paginationConfig ? Number(paginationConfig.current) || 1 : 1
            const pageSize: number = 'pageSize' in paginationConfig ? Number(paginationConfig.pageSize) || 10 : 10
            const mode = 'mode' in paginationConfig ? paginationConfig.mode : 'server'
            const jsonbMeta = meta as JSONBMeta | undefined
            const effectiveProjectId = jsonbMeta?.projectId ?? projectId

            // Start building the query
            let query = supabaseAdmin
                .from('crm_data')
                .select('*', { count: 'exact' })
                .eq('project_id', effectiveProjectId)
                .eq('entity_type', resource)

            // Filter out soft-deleted records unless explicitly included
            if (!jsonbMeta?.includeDeleted) {
                query = query.eq('deleted', false)
            }

            // Apply filters
            if (filters && filters.length > 0) {
                filters.forEach((filter) => {
                    // Only process LogicalFilter, skip ConditionalFilter for now
                    if (!isLogicalFilter(filter)) {
                        console.warn('ConditionalFilter not supported yet:', filter)
                        return
                    }

                    const { field, operator, value } = filter

                    // Handle JSONB field queries (fields stored in data column)
                    if (field !== 'id' && field !== 'created_at' && field !== 'updated_at') {
                        // Query JSONB data using arrow operator
                        const jsonPath = `data->>${field}`

                        switch (operator) {
                            case 'eq':
                                query = query.eq(jsonPath, value)
                                break
                            case 'ne':
                                query = query.neq(jsonPath, value)
                                break
                            case 'contains':
                                query = query.ilike(jsonPath, `%${value}%`)
                                break
                            case 'startswith':
                                query = query.ilike(jsonPath, `${value}%`)
                                break
                            case 'endswith':
                                query = query.ilike(jsonPath, `%${value}`)
                                break
                            case 'gt':
                                query = query.gt(jsonPath, value)
                                break
                            case 'gte':
                                query = query.gte(jsonPath, value)
                                break
                            case 'lt':
                                query = query.lt(jsonPath, value)
                                break
                            case 'lte':
                                query = query.lte(jsonPath, value)
                                break
                            case 'null':
                                query = query.is(jsonPath, null)
                                break
                            case 'nnull':
                                query = query.not(jsonPath, 'is', null)
                                break
                            case 'in':
                                if (Array.isArray(value)) {
                                    query = query.in(jsonPath, value)
                                }
                                break
                            default:
                                console.warn(`Unsupported filter operator: ${operator}`)
                        }
                    } else {
                        // Direct column query
                        switch (operator) {
                            case 'eq':
                                query = query.eq(field, value)
                                break
                            case 'ne':
                                query = query.neq(field, value)
                                break
                            case 'gt':
                                query = query.gt(field, value)
                                break
                            case 'gte':
                                query = query.gte(field, value)
                                break
                            case 'lt':
                                query = query.lt(field, value)
                                break
                            case 'lte':
                                query = query.lte(field, value)
                                break
                            default:
                                console.warn(`Unsupported filter operator: ${operator}`)
                        }
                    }
                })
            }

            // Apply sorting
            if (sorters && sorters.length > 0) {
                sorters.forEach((sorter) => {
                    const { field, order } = sorter

                    // Handle JSONB field sorting
                    if (field !== 'id' && field !== 'created_at' && field !== 'updated_at') {
                        // For JSONB fields, we need to use raw ordering
                        // Note: This is a simplification; complex JSONB sorting might need raw SQL
                        query = query.order(`data->${field}`, { ascending: order === 'asc' })
                    } else {
                        query = query.order(field, { ascending: order === 'asc' })
                    }
                })
            } else {
                // Default sort by created_at desc
                query = query.order('created_at', { ascending: false })
            }

            // Apply pagination (server-side only)
            if (mode === 'server') {
                const from = (current - 1) * pageSize
                const to = from + pageSize - 1
                query = query.range(from, to)
            }

            const { data, error, count } = await query

            if (error) {
                throw new Error(`Failed to fetch ${resource}: ${error.message}`)
            }

            // Transform data: extract JSONB data and merge with metadata
            const transformedData = (data || []).map((record: CRMDataRecord) => ({
                id: record.id,
                ...record.data,
                _meta: {
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    created_by: record.created_by,
                    updated_by: record.updated_by,
                },
            })) as unknown as TData[]

            return {
                data: transformedData,
                total: count ?? 0,
            }
        },

        /**
         * Get a single record by ID
         */
        getOne: async <TData extends BaseRecord = BaseRecord>({
            resource,
            id,
            meta,
        }: GetOneParams): Promise<{ data: TData }> => {
            const jsonbMeta = meta as JSONBMeta | undefined
            const effectiveProjectId = jsonbMeta?.projectId ?? projectId

            const { data, error } = await supabaseAdmin
                .from('crm_data')
                .select('*')
                .eq('id', id)
                .eq('project_id', effectiveProjectId)
                .eq('entity_type', resource)
                .single()

            if (error) {
                throw new Error(`Failed to fetch ${resource} with id ${id}: ${error.message}`)
            }

            if (!data) {
                throw new Error(`${resource} with id ${id} not found`)
            }

            const record = data as CRMDataRecord

            // Transform: merge JSONB data with metadata
            const transformedData = {
                id: record.id,
                ...record.data,
                _meta: {
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    created_by: record.created_by,
                    updated_by: record.updated_by,
                },
            } as unknown as TData

            return { data: transformedData }
        },

        /**
         * Create a new record
         */
        create: async <TData extends BaseRecord = BaseRecord, TVariables = object>({
            resource,
            variables,
            meta,
        }: CreateParams<TVariables>): Promise<{ data: TData }> => {
            const jsonbMeta = meta as (JSONBMeta & { userId?: string }) | undefined
            const effectiveProjectId = jsonbMeta?.projectId ?? projectId

            // Extract system fields from variables
            const { id: _, _meta, ...entityData } = variables as Record<string, unknown>

            const { data, error } = await supabaseAdmin
                .from('crm_data')
                .insert({
                    project_id: effectiveProjectId,
                    entity_type: resource,
                    data: entityData,
                    created_by: jsonbMeta?.userId,
                    updated_by: jsonbMeta?.userId,
                })
                .select()
                .single()

            if (error) {
                throw new Error(`Failed to create ${resource}: ${error.message}`)
            }

            const record = data as CRMDataRecord

            return {
                data: {
                    id: record.id,
                    ...record.data,
                    _meta: {
                        created_at: record.created_at,
                        updated_at: record.updated_at,
                        created_by: record.created_by,
                        updated_by: record.updated_by,
                    },
                } as unknown as TData,
            }
        },

        /**
         * Update an existing record
         */
        update: async <TData extends BaseRecord = BaseRecord, TVariables = object>({
            resource,
            id,
            variables,
            meta,
        }: UpdateParams<TVariables>): Promise<{ data: TData }> => {
            const jsonbMeta = meta as (JSONBMeta & { userId?: string }) | undefined
            const effectiveProjectId = jsonbMeta?.projectId ?? projectId

            // Extract system fields from variables
            const { id: _, _meta, ...entityData } = variables as Record<string, unknown>

            const { data, error } = await supabaseAdmin
                .from('crm_data')
                .update({
                    data: entityData,
                    updated_by: jsonbMeta?.userId,
                })
                .eq('id', id)
                .eq('project_id', effectiveProjectId)
                .eq('entity_type', resource)
                .select()
                .single()

            if (error) {
                throw new Error(`Failed to update ${resource} with id ${id}: ${error.message}`)
            }

            const record = data as CRMDataRecord

            return {
                data: {
                    id: record.id,
                    ...record.data,
                    _meta: {
                        created_at: record.created_at,
                        updated_at: record.updated_at,
                        created_by: record.created_by,
                        updated_by: record.updated_by,
                    },
                } as unknown as TData,
            }
        },

        /**
         * Delete a record (soft delete by default)
         */
        deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = object>({
            resource,
            id,
            meta,
        }: DeleteOneParams<TVariables>): Promise<{ data: TData }> => {
            const jsonbMeta = meta as (JSONBMeta & { hardDelete?: boolean; userId?: string }) | undefined
            const effectiveProjectId = jsonbMeta?.projectId ?? projectId

            if (jsonbMeta?.hardDelete) {
                // Hard delete - permanently remove the record
                const { data, error } = await supabaseAdmin
                    .from('crm_data')
                    .delete()
                    .eq('id', id)
                    .eq('project_id', effectiveProjectId)
                    .eq('entity_type', resource)
                    .select()
                    .single()

                if (error) {
                    throw new Error(`Failed to delete ${resource} with id ${id}: ${error.message}`)
                }

                const record = data as CRMDataRecord
                return {
                    data: {
                        id: record.id,
                        ...record.data,
                    } as TData,
                }
            } else {
                // Soft delete - mark as deleted
                const { data, error } = await supabaseAdmin
                    .from('crm_data')
                    .update({
                        deleted: true,
                        deleted_at: new Date().toISOString(),
                        updated_by: jsonbMeta?.userId,
                    })
                    .eq('id', id)
                    .eq('project_id', effectiveProjectId)
                    .eq('entity_type', resource)
                    .select()
                    .single()

                if (error) {
                    throw new Error(`Failed to soft delete ${resource} with id ${id}: ${error.message}`)
                }

                const record = data as CRMDataRecord
                return {
                    data: {
                        id: record.id,
                        ...record.data,
                    } as TData,
                }
            }
        },

        /**
         * Get multiple records by IDs
         */
        getMany: async <TData extends BaseRecord = BaseRecord>({
            resource,
            ids,
            meta,
        }: GetManyParams): Promise<{ data: TData[] }> => {
            const jsonbMeta = meta as JSONBMeta | undefined
            const effectiveProjectId = jsonbMeta?.projectId ?? projectId

            const { data, error } = await supabaseAdmin
                .from('crm_data')
                .select('*')
                .eq('project_id', effectiveProjectId)
                .eq('entity_type', resource)
                .in('id', ids.map(id => String(id)))

            if (error) {
                throw new Error(`Failed to fetch ${resource} records: ${error.message}`)
            }

            const transformedData = (data || []).map((record: CRMDataRecord) => ({
                id: record.id,
                ...record.data,
                _meta: {
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            })) as unknown as TData[]

            return { data: transformedData }
        },

        /**
         * Custom endpoint for specialized queries
         */
        custom: async <TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>({
            url,
            method,
            payload,
            meta,
        }: CustomParams<TQuery, TPayload>): Promise<{ data: TData }> => {
            const jsonbMeta = meta as (JSONBMeta & { action?: string }) | undefined
            const effectiveProjectId = jsonbMeta?.projectId ?? projectId

            // Handle custom actions
            switch (jsonbMeta?.action) {
                case 'search': {
                    // Full-text search across all fields
                    const searchTerm = (payload as { searchTerm?: string })?.searchTerm ?? ''
                    const entityType = (payload as { entityType?: string })?.entityType

                    let query = supabaseAdmin
                        .from('crm_data')
                        .select('*')
                        .eq('project_id', effectiveProjectId)
                        .eq('deleted', false)

                    if (entityType) {
                        query = query.eq('entity_type', entityType)
                    }

                    // Use the search function
                    query = query.filter('data', 'cs', `%${searchTerm}%`)

                    const { data, error } = await query

                    if (error) {
                        throw new Error(`Search failed: ${error.message}`)
                    }

                    return { data: data as unknown as TData }
                }

                case 'restore': {
                    // Restore a soft-deleted record
                    const recordId = (payload as { id?: string })?.id

                    if (!recordId) {
                        throw new Error('Record ID required for restore')
                    }

                    const { data, error } = await supabaseAdmin
                        .from('crm_data')
                        .update({
                            deleted: false,
                            deleted_at: null,
                        })
                        .eq('id', recordId)
                        .eq('project_id', effectiveProjectId)
                        .select()
                        .single()

                    if (error) {
                        throw new Error(`Failed to restore record: ${error.message}`)
                    }

                    return { data: data as unknown as TData }
                }

                case 'bulkUpdate': {
                    // Bulk update multiple records
                    const updates = (payload as { updates?: Array<{ id: string; data: Record<string, unknown> }> })?.updates

                    if (!updates || updates.length === 0) {
                        throw new Error('Updates required for bulk update')
                    }

                    const results = await Promise.all(
                        updates.map(async ({ id, data: updateData }) => {
                            const { data, error } = await supabaseAdmin
                                .from('crm_data')
                                .update({ data: updateData })
                                .eq('id', id)
                                .eq('project_id', effectiveProjectId)
                                .select()
                                .single()

                            if (error) {
                                throw new Error(`Failed to update record ${id}: ${error.message}`)
                            }

                            return data
                        })
                    )

                    return { data: results as unknown as TData }
                }

                default:
                    throw new Error(`Unsupported custom action: ${jsonbMeta?.action}`)
            }
        },

        /**
         * Get API URL (not used with Supabase direct connection)
         */
        getApiUrl: () => {
            return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
        },
    }
}

/**
 * Export a default data provider factory
 * Usage: const dataProvider = createJSONBDataProvider('project-id')
 */
export default createJSONBDataProvider
