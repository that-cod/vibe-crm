import Anthropic from '@anthropic-ai/sdk'
import { CRMSpec, FieldSpec } from './orchestrator'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface CustomizationSpec {
    action: 'add_field' | 'modify_field' | 'remove_field' | 'add_table' | 'modify_relationship'
    targetTable: string
    changes: {
        field?: FieldSpec
        oldFieldName?: string
        newFieldName?: string
        relationship?: { from: string; to: string; foreignKey?: string }
    }
    sqlChanges: string[]
    codeChanges: string[]
}

const CUSTOMIZATION_SYSTEM_PROMPT = `You are a CRM customization expert. Parse incremental change requests and generate SQL ALTER statements and code modifications.

RULES:
1. Parse the user's customization request
2. Identify what needs to change: add/modify/remove fields or tables
3. Generate appropriate SQL ALTER TABLE statements
4. Describe code changes needed (which components to update)
5. Preserve existing data and relationships

SUPPORTED ACTIONS:
- Add field to existing table
- Modify field (rename, change type, add constraints)
- Remove field
- Add new table with relationships
- Modify relationships between tables

OUTPUT FORMAT (JSON only):
{
  "action": "add_field",
  "targetTable": "leads",
  "changes": {
    "field": {
      "name": "leadScore",
      "displayName": "Lead Score",
      "type": "number",
      "required": false
    }
  },
  "sqlChanges": [
    "ALTER TABLE leads ADD COLUMN lead_score INTEGER DEFAULT 0;"
  ],
  "codeChanges": [
    "Add 'leadScore' field to LeadList component",
    "Add 'leadScore' field to LeadCreate/Edit forms",
    "Update LeadShow to display leadScore"
  ]
}

Be precise and conservative - only suggest changes explicitly requested by the user.`

export async function parseCustomizationPrompt(
    prompt: string,
    currentSpec: CRMSpec,
    schemaName: string
): Promise<CustomizationSpec> {
    try {
        const specSummary = {
            tables: currentSpec.tables.map(t => ({
                name: t.name,
                displayName: t.displayName,
                fields: t.fields.map(f => f.name)
            })),
            relationships: currentSpec.relationships
        }

        const userMessage = `Current CRM Structure:
${JSON.stringify(specSummary, null, 2)}

Schema Name: ${schemaName}

User's Customization Request: "${prompt}"

Parse this request and generate the incremental changes needed.`

        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            temperature: 0.1,
            system: CUSTOMIZATION_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: userMessage,
                },
            ],
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

        // Extract JSON
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/({[\s\S]*})/)

        if (!jsonMatch) {
            throw new Error('Failed to parse customization response')
        }

        const customization: CustomizationSpec = JSON.parse(jsonMatch[1] || jsonMatch[0])

        return customization
    } catch (error) {
        console.error('Customization parsing error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to parse customization: ${errorMessage}`)
    }
}

// Helper: Apply customization to existing CRM spec
export function applyCustomizationToSpec(
    spec: CRMSpec,
    customization: CustomizationSpec
): CRMSpec {
    const updatedSpec = JSON.parse(JSON.stringify(spec)) // Deep clone

    switch (customization.action) {
        case 'add_field':
            const table = updatedSpec.tables.find((t: { name: string }) => t.name === customization.targetTable)
            if (table && customization.changes.field) {
                table.fields.push(customization.changes.field)
            }
            break

        case 'modify_field':
            const tableToModify = updatedSpec.tables.find((t: { name: string }) => t.name === customization.targetTable)
            if (tableToModify && customization.changes.oldFieldName && customization.changes.newFieldName) {
                const fieldIndex = tableToModify.fields.findIndex(
                    (f: { name: string }) => f.name === customization.changes.oldFieldName
                )
                if (fieldIndex !== -1 && customization.changes.field) {
                    tableToModify.fields[fieldIndex] = customization.changes.field
                }
            }
            break

        case 'remove_field':
            const tableToRemoveFrom = updatedSpec.tables.find((t: { name: string }) => t.name === customization.targetTable)
            if (tableToRemoveFrom && customization.changes.oldFieldName) {
                tableToRemoveFrom.fields = tableToRemoveFrom.fields.filter(
                    (f: { name: string }) => f.name !== customization.changes.oldFieldName
                )
            }
            break

        // Add more cases as needed
    }

    return updatedSpec
}

// Generate SQL for customization
export function generateCustomizationSQL(
    customization: CustomizationSpec,
    schemaName: string
): string {
    const sqlStatements: string[] = []

    sqlStatements.push(`-- Customization: ${customization.action}`)
    sqlStatements.push(`SET search_path TO "${schemaName}";`)
    sqlStatements.push(``)

    // Use the AI-generated SQL changes
    customization.sqlChanges.forEach(sql => {
        sqlStatements.push(sql)
    })

    return sqlStatements.join('\n')
}

// Generate rollback SQL to undo customizations
export function generateRollbackSQL(
    customization: CustomizationSpec,
    schemaName: string
): string | null {
    const sqlStatements: string[] = []

    sqlStatements.push(`-- Rollback: ${customization.action}`)
    sqlStatements.push(`SET search_path TO "${schemaName}";`)
    sqlStatements.push(``)

    try {
        switch (customization.action) {
            case 'add_field':
                // Rollback: DROP the added column
                if (customization.changes.field) {
                    sqlStatements.push(
                        `ALTER TABLE ${customization.targetTable} DROP COLUMN IF EXISTS ${customization.changes.field.name};`
                    )
                }
                break

            case 'remove_field':
                // Rollback: Re-add the removed field
                // Note: Data will be lost, so this is marked as non-rollbackable in practice
                // We include the SQL but mark canRollback=false
                if (customization.changes.field) {
                    const field = customization.changes.field
                    let columnType = 'VARCHAR(255)' // Default
                    // Map field types (simplified)
                    const typeMap: Record<string, string> = {
                        'string': 'VARCHAR(255)',
                        'number': 'INTEGER',
                        'boolean': 'BOOLEAN',
                        'date': 'DATE',
                        'datetime': 'TIMESTAMP',
                        'text': 'TEXT',
                        'email': 'VARCHAR(255)',
                        'phone': 'VARCHAR(50)',
                        'currency': 'DECIMAL(10,2)',
                        'uuid': 'UUID'
                    }
                    columnType = typeMap[field.type] || 'VARCHAR(255)'

                    sqlStatements.push(
                        `ALTER TABLE ${customization.targetTable} ADD COLUMN ${field.name} ${columnType};`
                    )
                    sqlStatements.push(`-- WARNING: Original data cannot be restored`)
                }
                return null // Cannot truly rollback data deletion

            case 'modify_field':
                // Rollback: Revert to old field name/type
                if (customization.changes.oldFieldName && customization.changes.newFieldName) {
                    sqlStatements.push(
                        `ALTER TABLE ${customization.targetTable} RENAME COLUMN ${customization.changes.newFieldName} TO ${customization.changes.oldFieldName};`
                    )
                }
                break

            case 'add_table':
                // Rollback: DROP the added table
                sqlStatements.push(
                    `DROP TABLE IF EXISTS ${customization.targetTable} CASCADE;`
                )
                break

            default:
                // Unknown action, cannot generate rollback
                return null
        }

        return sqlStatements.join('\n')
    } catch (error) {
        console.error('Error generating rollback SQL:', error)
        return null // If we can't generate rollback, return null
    }
}

