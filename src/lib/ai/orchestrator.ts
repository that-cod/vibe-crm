/**
 * AI Orchestrator - CRM Configuration Generator
 * 
 * This module has been updated to generate CRM configurations in JSON format
 * instead of generating SQL/TSX code.
 * 
 * For the new config-based approach, use config-generator.ts instead.
 */

import { generateCRMConfig, modifyCRMConfig, validateCRMConfig, type ConfigGenerationContext } from './config-generator'
import type { CRMConfig } from '@/types/config'

/**
 * Generate a CRM configuration from a user prompt
 * 
 * This is the main entry point for AI-powered CRM generation.
 * It returns a complete CRMConfig JSON that can be immediately used
 * to render a live CRM.
 * 
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
export type { CRMConfig, ConfigGenerationContext }

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
