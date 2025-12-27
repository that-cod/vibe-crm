/**
 * Shared in-memory storage for CRM projects during testing
 * Used when database is unavailable
 * 
 * Updated to store full GenerationResult with sample data
 */

import type { GenerationResult, SampleDataPayload, DashboardConfig } from '@/lib/ai/orchestrator'
import type { CRMConfig } from '@/types/config'
import type { ResourceProps } from '@refinedev/core'

/**
 * Full project with all generation artifacts
 */
export interface TestProject {
    id: string
    projectName: string
    originalPrompt: string
    config: CRMConfig
    sampleData?: SampleDataPayload
    dashboardConfig?: DashboardConfig
    resources?: ResourceProps[]
    status: string
    createdAt: Date
    meta?: {
        generatedAt: string
        promptHash: string
        version: string
    }
}

/**
 * Sample data record for storage
 */
export interface TestDataRecord {
    id: string
    projectId: string
    entityType: string
    data: Record<string, unknown>
    createdAt: Date
    updatedAt: Date
}

// In-memory storage for projects
export const testProjects: Map<string, TestProject> = new Map()

// In-memory storage for CRM data records
export const testDataRecords: Map<string, TestDataRecord> = new Map()

/**
 * Add a project to the test storage
 */
export function addTestProject(project: TestProject): void {
    testProjects.set(project.id, project)
}

/**
 * Add project from generation result
 */
export function addProjectFromGenerationResult(
    projectId: string,
    prompt: string,
    result: GenerationResult
): TestProject {
    const project: TestProject = {
        id: projectId,
        projectName: result.config.name || 'My CRM',
        originalPrompt: prompt,
        config: result.config,
        sampleData: result.sampleData,
        dashboardConfig: result.dashboardConfig,
        resources: result.resources,
        status: 'completed',
        createdAt: new Date(),
        meta: result.meta,
    }

    testProjects.set(projectId, project)
    return project
}

/**
 * Seed sample data records for a project
 */
export function seedSampleData(projectId: string, sampleData: SampleDataPayload): number {
    let recordCount = 0

    for (const entityData of sampleData.entities) {
        for (const record of entityData.records) {
            const id = crypto.randomUUID()
            const dataRecord: TestDataRecord = {
                id,
                projectId,
                entityType: entityData.entityId,
                data: record,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
            testDataRecords.set(id, dataRecord)
            recordCount++
        }
    }

    return recordCount
}

/**
 * Get data records for a project/entity
 */
export function getDataRecords(
    projectId: string,
    entityType?: string,
    options?: {
        limit?: number
        offset?: number
        deleted?: boolean
    }
): TestDataRecord[] {
    let records = Array.from(testDataRecords.values())
        .filter(r => r.projectId === projectId)
        .filter(r => !entityType || r.entityType === entityType)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    if (options?.offset) {
        records = records.slice(options.offset)
    }

    if (options?.limit) {
        records = records.slice(0, options.limit)
    }

    return records
}

/**
 * Get a single data record by ID
 */
export function getDataRecord(recordId: string): TestDataRecord | undefined {
    return testDataRecords.get(recordId)
}

/**
 * Create a new data record
 */
export function createDataRecord(
    projectId: string,
    entityType: string,
    data: Record<string, unknown>
): TestDataRecord {
    const id = crypto.randomUUID()
    const record: TestDataRecord = {
        id,
        projectId,
        entityType,
        data,
        createdAt: new Date(),
        updatedAt: new Date(),
    }
    testDataRecords.set(id, record)
    return record
}

/**
 * Update a data record
 */
export function updateDataRecord(
    recordId: string,
    data: Record<string, unknown>
): TestDataRecord | undefined {
    const existing = testDataRecords.get(recordId)
    if (!existing) return undefined

    const updated: TestDataRecord = {
        ...existing,
        data: { ...existing.data, ...data },
        updatedAt: new Date(),
    }
    testDataRecords.set(recordId, updated)
    return updated
}

/**
 * Delete a data record
 */
export function deleteDataRecord(recordId: string): boolean {
    return testDataRecords.delete(recordId)
}

/**
 * Get count of records for a project/entity
 */
export function getDataRecordCount(projectId: string, entityType?: string): number {
    return Array.from(testDataRecords.values())
        .filter(r => r.projectId === projectId)
        .filter(r => !entityType || r.entityType === entityType)
        .length
}

/**
 * Get a project from the test storage
 */
export function getTestProject(projectId: string): TestProject | undefined {
    return testProjects.get(projectId)
}

/**
 * Get all test projects sorted by creation date
 */
export function getAllTestProjects(): TestProject[] {
    return Array.from(testProjects.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/**
 * Clear all test projects (useful for testing)
 */
export function clearTestProjects(): void {
    testProjects.clear()
}

/**
 * Clear all data records for a project
 */
export function clearProjectData(projectId: string): void {
    for (const [id, record] of testDataRecords.entries()) {
        if (record.projectId === projectId) {
            testDataRecords.delete(id)
        }
    }
}

/**
 * Clear all test data
 */
export function clearAllTestData(): void {
    testProjects.clear()
    testDataRecords.clear()
}
