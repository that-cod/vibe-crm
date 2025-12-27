/**
 * Refine Hook Helpers
 * 
 * Wrappers to normalize Refine v5 hook returns for easier consumption.
 * Refine v5 returns { query: {...}, result: {...} } for list/one hooks.
 */

import {
    useList as useRefineList,
    useOne as useRefineOne,
    useCreate as useRefineCreate,
    useUpdate as useRefineUpdate,
    useDelete as useRefineDelete
} from '@refinedev/core'

/**
 * Normalized useList hook - returns data/isLoading at top level
 */
export function useListData(options: Parameters<typeof useRefineList>[0]) {
    const listResult = useRefineList(options)

    // Extract from nested query structure
    const queryData = listResult.query?.data

    return {
        data: queryData?.data ?? listResult.result?.data ?? [],
        total: queryData?.total ?? listResult.result?.total ?? 0,
        isLoading: listResult.query?.isLoading ?? false,
        isFetching: listResult.query?.isFetching ?? false,
        isError: listResult.query?.isError ?? false,
        refetch: listResult.query?.refetch ?? (() => Promise.resolve()),
    }
}

/**
 * Normalized useOne hook
 */
export function useOneData(options: Parameters<typeof useRefineOne>[0]) {
    const oneResult = useRefineOne(options)

    return {
        data: oneResult.query?.data?.data ?? oneResult.result,
        isLoading: oneResult.query?.isLoading ?? false,
        isFetching: oneResult.query?.isFetching ?? false,
        isError: oneResult.query?.isError ?? false,
        refetch: oneResult.query?.refetch ?? (() => Promise.resolve()),
    }
}

/**
 * Normalized useCreate - extracts mutation state
 */
export function useCreateData() {
    const createResult = useRefineCreate()

    // Type assertion to access mutation property
    const mutation = (createResult as unknown as { mutation?: { isPending?: boolean } }).mutation

    return {
        mutate: createResult.mutate,
        mutateAsync: createResult.mutateAsync,
        isLoading: mutation?.isPending ?? false,
    }
}

/**
 * Normalized useUpdate
 */
export function useUpdateData() {
    const updateResult = useRefineUpdate()

    const mutation = (updateResult as unknown as { mutation?: { isPending?: boolean } }).mutation

    return {
        mutate: updateResult.mutate,
        mutateAsync: updateResult.mutateAsync,
        isLoading: mutation?.isPending ?? false,
    }
}

/**
 * Normalized useDelete
 */
export function useDeleteData() {
    const deleteResult = useRefineDelete()

    const mutation = (deleteResult as unknown as { mutation?: { isPending?: boolean } }).mutation

    return {
        mutate: deleteResult.mutate,
        mutateAsync: deleteResult.mutateAsync,
        isLoading: mutation?.isPending ?? false,
    }
}
