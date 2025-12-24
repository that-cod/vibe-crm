// Type-safe error handling utilities

export interface ApiError {
    message: string
    code?: string
    statusCode?: number
}

export function isError(error: unknown): error is Error {
    return error instanceof Error
}

export function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message
    }
    if (typeof error === 'string') {
        return error
    }
    return 'An unknown error occurred'
}

export interface ProjectChanges {
    [key: string]: unknown
    customization?: unknown
    success?: boolean
    sqlApplied?: string
    error?: string
    failed?: boolean
}
