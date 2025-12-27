/**
 * Sample Data Generator
 * 
 * Uses Claude AI to generate realistic sample data for CRM entities.
 * This provides users with a working demo immediately after CRM generation.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { CRMConfig, Entity } from '@/types/config'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Sample data for a single entity
 */
export interface EntitySampleData {
    entityId: string
    entityName: string
    records: Record<string, unknown>[]
}

/**
 * Complete sample data payload for all entities
 */
export interface SampleDataPayload {
    projectId: string
    entities: EntitySampleData[]
    generatedAt: string
}

/**
 * System prompt for sample data generation
 */
const SAMPLE_DATA_SYSTEM_PROMPT = `You are a sample data generator for CRM systems. Your job is to create realistic, contextually appropriate sample data for CRM entities.

# Rules

1. **OUTPUT ONLY VALID JSON** - No explanations, no markdown, just a JSON array
2. **Generate realistic data** - Names, emails, phone numbers should look real (use common names)
3. **Use consistent relationships** - If generating Deals for Contacts, reference valid Contact IDs
4. **Respect field types** - Dates as ISO strings, numbers as numbers, emails with @ symbol
5. **Use the provided options** - For select fields, only use values from the options array
6. **Generate 5-8 records per entity** - Enough to demonstrate the CRM without overwhelming

# Field Type Guidelines

- **text**: Realistic names, titles, descriptions
- **email**: format: firstname.lastname@company.com or similar
- **phone**: Use formats like "+1 (555) 123-4567" or "555-123-4567"
- **currency**: Reasonable amounts for the domain (real estate: 100k-2M, sales: 1k-100k)
- **date/datetime**: Dates within last 6 months to next 3 months
- **select**: ONLY use values from the provided options array
- **number/percentage**: Contextually appropriate ranges
- **relationship**: Use IDs from the referenced entity (will be provided)

# Response Format

Return a JSON array with one object per entity:
[
  {
    "entityId": "contact",
    "records": [
      { "name": "John Smith", "email": "john.smith@acme.com", "status": "active" },
      ...
    ]
  },
  ...
]

IMPORTANT: Do NOT include id, createdAt, updatedAt fields - those are auto-generated.`

/**
 * Generate sample data for all entities in a CRM config
 */
export async function generateSampleData(
    config: CRMConfig,
    projectId: string
): Promise<SampleDataPayload> {
    try {
        // Build entity descriptions for the prompt
        const entityDescriptions = config.entities.map(entity => ({
            id: entity.id,
            name: entity.name,
            fields: entity.fields
                .filter(f => !['id', 'createdAt', 'updatedAt', 'autoId'].includes(f.type))
                .map(f => ({
                    name: f.name,
                    type: f.type,
                    required: f.required,
                    ...(f.type === 'select' || f.type === 'multiselect' ? {
                        options: (f as { options?: { value: string; label: string }[] }).options?.map(o => o.value)
                    } : {}),
                    ...(f.type === 'relationship' ? {
                        targetEntity: (f as { targetEntity?: string }).targetEntity,
                        relationshipType: (f as { relationshipType?: string }).relationshipType
                    } : {})
                }))
        }))

        // Find relationships to determine generation order
        const entityOrder = getEntityGenerationOrder(config.entities)

        const userMessage = `Generate sample data for this CRM: "${config.name}"

Description: ${config.description || 'A custom CRM system'}

Entities to generate data for (in this order for proper relationships):
${entityOrder.map(id => {
            const entity = entityDescriptions.find(e => e.id === id)
            return `
## ${entity?.name} (${entity?.id})
Fields:
${entity?.fields.map(f => `- ${f.name}: ${f.type}${f.required ? ' (required)' : ''}${f.options ? ` [options: ${f.options.join(', ')}]` : ''}${f.targetEntity ? ` → ${f.targetEntity}` : ''}`).join('\n')}
`
        }).join('\n')}

Generate 5-8 realistic sample records for each entity. For relationship fields, use placeholder IDs like "ref-contact-1", "ref-deal-1" etc. that I will replace with real UUIDs later.

Return ONLY the JSON array.`

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            temperature: 0.7, // Higher temperature for more varied data
            system: SAMPLE_DATA_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

        // Extract JSON from response
        let jsonString = responseText.trim()

        // Handle markdown code blocks
        const markdownMatch = responseText.match(/```json?\s*([\s\S]*?)\s*```/)
        if (markdownMatch) {
            jsonString = markdownMatch[1].trim()
        }

        // Try to find JSON array
        if (!jsonString.startsWith('[')) {
            const arrayMatch = responseText.match(/(\[[\s\S]*\])/)
            if (arrayMatch) {
                jsonString = arrayMatch[1]
            }
        }

        const sampleDataArray: { entityId: string; records: Record<string, unknown>[] }[] = JSON.parse(jsonString)

        // Transform and validate the data
        const entities: EntitySampleData[] = sampleDataArray.map(item => ({
            entityId: item.entityId,
            entityName: config.entities.find(e => e.id === item.entityId)?.name || item.entityId,
            records: item.records
        }))

        return {
            projectId,
            entities,
            generatedAt: new Date().toISOString()
        }
    } catch (error) {
        console.error('Sample data generation error:', error)

        // Return empty sample data on error (don't fail the whole generation)
        return {
            projectId,
            entities: config.entities.map(e => ({
                entityId: e.id,
                entityName: e.name,
                records: []
            })),
            generatedAt: new Date().toISOString()
        }
    }
}

/**
 * Determine entity generation order based on relationships
 * Entities without relationships first, then entities that depend on them
 */
function getEntityGenerationOrder(entities: Entity[]): string[] {
    const order: string[] = []
    const remaining = new Set(entities.map(e => e.id))
    const processed = new Set<string>()

    // First pass: entities with no relationship fields
    for (const entity of entities) {
        const hasRelationships = entity.fields.some(f => f.type === 'relationship')
        if (!hasRelationships) {
            order.push(entity.id)
            processed.add(entity.id)
            remaining.delete(entity.id)
        }
    }

    // Second pass: entities whose dependencies are already processed
    let iterations = 0
    while (remaining.size > 0 && iterations < entities.length) {
        for (const entityId of remaining) {
            const entity = entities.find(e => e.id === entityId)!
            const relationshipFields = entity.fields.filter(f => f.type === 'relationship')

            const dependenciesMet = relationshipFields.every(f => {
                const targetEntity = (f as { targetEntity?: string }).targetEntity
                return !targetEntity || processed.has(targetEntity)
            })

            if (dependenciesMet) {
                order.push(entityId)
                processed.add(entityId)
                remaining.delete(entityId)
            }
        }
        iterations++
    }

    // Add any remaining entities (circular dependencies)
    for (const entityId of remaining) {
        order.push(entityId)
    }

    return order
}

/**
 * Generate placeholder IDs for relationship linking
 */
export function generatePlaceholderIds(entities: EntitySampleData[]): Map<string, Map<string, string>> {
    const idMap = new Map<string, Map<string, string>>()

    for (const entity of entities) {
        const entityIdMap = new Map<string, string>()
        entity.records.forEach((_, index) => {
            entityIdMap.set(`ref-${entity.entityId}-${index + 1}`, crypto.randomUUID())
        })
        idMap.set(entity.entityId, entityIdMap)
    }

    return idMap
}

/**
 * Replace placeholder IDs with real UUIDs in sample data
 */
export function resolveRelationshipIds(
    entities: EntitySampleData[],
    idMap: Map<string, Map<string, string>>
): EntitySampleData[] {
    return entities.map(entity => ({
        ...entity,
        records: entity.records.map(record => {
            const resolvedRecord: Record<string, unknown> = {}

            for (const [key, value] of Object.entries(record)) {
                if (typeof value === 'string' && value.startsWith('ref-')) {
                    // Find the referenced entity and ID
                    const match = value.match(/ref-([^-]+)-(\d+)/)
                    if (match) {
                        const refEntityId = match[1]
                        const entityIdMap = idMap.get(refEntityId)
                        if (entityIdMap) {
                            resolvedRecord[key] = entityIdMap.get(value) || value
                        } else {
                            resolvedRecord[key] = value
                        }
                    } else {
                        resolvedRecord[key] = value
                    }
                } else {
                    resolvedRecord[key] = value
                }
            }

            return resolvedRecord
        })
    }))
}

export default generateSampleData
