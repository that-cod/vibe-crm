/**
 * AI Orchestrator - CRM Configuration Generator
 * 
 * This module orchestrates the complete CRM generation pipeline:
 * 1. Generate CRMConfig via Claude AI
 * 2. Generate sample data for all entities
 * 3. Generate dashboard widget configuration
 * 4. Build Refine.dev resources from config
 * 
 * The main entry point is generateFullCRM() which returns a complete
 * GenerationResult ready for immediate CRM rendering.
 */

import { generateCRMConfig, modifyCRMConfig, validateCRMConfig, type ConfigGenerationContext } from './config-generator'
import { generateSampleData, type SampleDataPayload, generatePlaceholderIds, resolveRelationshipIds } from './sample-data-generator'
import { generateDashboardConfig, type DashboardConfig } from './dashboard-config-generator'
import type { CRMConfig } from '@/types/config'
import type { ResourceProps } from '@refinedev/core'

/**
 * Complete generation result with all components needed to render a CRM
 */
export interface GenerationResult {
    /** CRM configuration (entities, views, navigation) */
    config: CRMConfig
    /** Sample data for all entities */
    sampleData: SampleDataPayload
    /** Dashboard widget configuration */
    dashboardConfig: DashboardConfig
    /** Refine.dev resource definitions */
    resources: ResourceProps[]
    /** Generation metadata */
    meta: {
        generatedAt: string
        promptHash: string
        version: string
    }
}

/**
 * Generate a complete CRM with sample data and dashboard
 * 
 * This is the NEW main entry point for AI-powered CRM generation.
 * Returns everything needed to render a fully functional CRM.
 * 
 * @param prompt - User's natural language description
 * @param projectId - Unique project identifier for data isolation
 * @param context - Optional business context
 * @returns Complete generation result
 */
export async function generateFullCRM(
    prompt: string,
    projectId: string,
    context?: ConfigGenerationContext
): Promise<GenerationResult> {
    console.log('Step 1: Generating CRM configuration...')

    // 1. Generate CRM Configuration
    const config = await generateCRMConfig(prompt, context)

    // 2. Validate the configuration
    const validation = validateCRMConfig(config)
    if (!validation.valid) {
        console.error('Generated config validation errors:', validation.errors)
        throw new Error(`Invalid config generated: ${validation.errors.join(', ')}`)
    }
    console.log('✅ CRM configuration generated and validated!')

    // 3. Generate sample data
    console.log('Step 2: Generating sample data...')
    let sampleData = await generateSampleData(config, projectId)

    // 4. Resolve relationship placeholder IDs
    if (sampleData.entities.some(e => e.records.length > 0)) {
        const idMap = generatePlaceholderIds(sampleData.entities)
        sampleData = {
            ...sampleData,
            entities: resolveRelationshipIds(sampleData.entities, idMap)
        }
        console.log('✅ Sample data generated:', sampleData.entities.map(e => `${e.entityName}: ${e.records.length} records`).join(', '))
    }

    // 5. Generate dashboard configuration
    console.log('Step 3: Generating dashboard configuration...')
    const dashboardConfig = generateDashboardConfig(config)
    console.log('✅ Dashboard configured with', dashboardConfig.widgets.length, 'widgets')

    // 6. Build Refine resources
    console.log('Step 4: Building Refine resources...')
    const resources = buildResources(config)
    console.log('✅ Built', resources.length, 'Refine resources')

    // 7. Create generation metadata
    const meta = {
        generatedAt: new Date().toISOString(),
        promptHash: hashString(prompt),
        version: '2.0.0' // Version with sample data + dashboard
    }

    return {
        config,
        sampleData,
        dashboardConfig,
        resources,
        meta
    }
}

/**
 * Build Refine ResourceProps from CRM config
 */
function buildResources(config: CRMConfig): ResourceProps[] {
    return config.entities.map(entity => ({
        name: entity.tableName,
        identifier: entity.id,
        meta: {
            label: entity.labelPlural,
            icon: entity.icon || 'database',
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canShow: true,
        },
        // Routes will be handled by the CRM engine
        list: `/crm/${entity.id}`,
        create: `/crm/${entity.id}/create`,
        edit: `/crm/${entity.id}/edit/:id`,
        show: `/crm/${entity.id}/show/:id`,
    }))
}

/**
 * Simple hash function for tracking prompt changes
 */
function hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return Math.abs(hash).toString(16)
}

/**
 * Generate a CRM configuration from a user prompt (legacy function)
 * 
 * @deprecated Use generateFullCRM() instead for complete generation
 * @param prompt - User's natural language description
 * @param context - Optional business context
 * @returns Complete CRM configuration
 */
export async function generateCRM(
    prompt: string,
    context?: ConfigGenerationContext
): Promise<CRMConfig> {
    const config = await generateCRMConfig(prompt, context)

    // Validate the generated config
    const validation = validateCRMConfig(config)
    if (!validation.valid) {
        console.error('Generated config validation errors:', validation.errors)
        throw new Error(`Invalid config generated: ${validation.errors.join(', ')}`)
    }

    return config
}

/**
 * Modify an existing CRM configuration
 * 
 * Takes an existing config and a modification request, returns updated config.
 * 
 * @param existingConfig - Current CRM configuration
 * @param modificationPrompt - What to change
 * @returns Updated CRM configuration
 */
export async function modifyCRM(
    existingConfig: CRMConfig,
    modificationPrompt: string
): Promise<CRMConfig> {
    const updatedConfig = await modifyCRMConfig(existingConfig, modificationPrompt)

    // Validate the modified config
    const validation = validateCRMConfig(updatedConfig)
    if (!validation.valid) {
        console.error('Modified config validation errors:', validation.errors)
        throw new Error(`Invalid modified config: ${validation.errors.join(', ')}`)
    }

    return updatedConfig
}

/**
 * Validate a CRM configuration
 * 
 * @param config - Config to validate
 * @returns Validation result
 */
export { validateCRMConfig as validateCRM }

/**
 * Export types
 */
export type { CRMConfig, ConfigGenerationContext, SampleDataPayload, DashboardConfig }


// ============================================
// DEPRECATED: Old CRMSpec-based approach
// ============================================

/**
 * @deprecated Use generateCRM() instead
 * This function is kept for backward compatibility but will be removed.
 */
export interface CRMSpec {
    tables: TableSpec[]
    relationships: RelationshipSpec[]
    views: ViewSpec[]
    businessContext: {
        industry: string
        primaryUseCase: string
    }
}

export interface TableSpec {
    name: string
    displayName: string
    fields: FieldSpec[]
    icon?: string
}

export interface FieldSpec {
    name: string
    displayName: string
    type: 'string' | 'email' | 'phone' | 'number' | 'currency' | 'date' | 'datetime' | 'boolean' | 'enum' | 'text' | 'url' | 'uuid'
    required: boolean
    unique?: boolean
    defaultValue?: string | number | boolean | 'now'
    enumOptions?: string[]
    validation?: {
        min?: number
        max?: number
        pattern?: string
    }
}

export interface RelationshipSpec {
    from: string
    to: string
    type: 'oneToMany' | 'manyToOne' | 'manyToMany'
    foreignKey?: string
}

export interface ViewSpec {
    name: string
    type: 'list' | 'kanban' | 'calendar' | 'chart'
    table: string
    groupBy?: string
}

/**
 * @deprecated Use generateCRM() instead
 */
export async function parsePromptToCRMSpec(
    prompt: string,
    businessContext?: { industry?: string; primaryUseCase?: string }
): Promise<CRMSpec> {
    console.warn('parsePromptToCRMSpec is deprecated. Use generateCRM() instead.')
    throw new Error('This function is deprecated. Please use generateCRM() which returns CRMConfig.')
}

/**
 * @deprecated CRMSpec validation is deprecated
 */
export function validateCRMSpec(spec: CRMSpec): { valid: boolean; errors: string[] } {
    console.warn('validateCRMSpec is deprecated. Use validateCRM() instead.')
    return { valid: false, errors: ['Deprecated function'] }
}
