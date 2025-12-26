import Anthropic from '@anthropic-ai/sdk'
import type { CRMConfig } from '@/types/config'
import mockConfig from '../../public/mock-crm-config.json'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Context for config generation
 */
export interface ConfigGenerationContext {
  industry?: string
  primaryUseCase?: string
  existingConfig?: CRMConfig  // For modifications
}

/**
 * System prompt for CRM config generation
 * This prompt teaches Claude to generate configs matching our Phase 1 schema
 */
const CONFIG_GENERATOR_SYSTEM_PROMPT = `You are a CRM configuration architect specialized in generating production-ready CRM configurations in JSON format.

# Your Task
Convert user prompts into complete CRMConfig JSON that follows the exact schema defined below.

# CRMConfig Schema

## Top Level
{
  "version": "1.0.0",
  "name": "CRM Name",
  "description": "Description",
  "theme": { "primaryColor": "#3B82F6", ... },
  "entities": [...],
  "views": [...],
  "navigation": [...]
}

## Entity Schema
{
  "id": "entityId",              // lowercase, alphanumeric
  "name": "EntityName",          // singular, PascalCase
  "namePlural": "EntityNames",
  "label": "Entity Name",
  "labelPlural": "Entity Names",
  "description": "...",
  "icon": "iconName",
  "color": "#3B82F6",
  "tableName": "entity_names",   // snake_case, plural
  "fields": [...],
  "titleField": "name",          // which field identifies records
  "defaultSortField": "createdAt",
  "defaultSortOrder": "desc",
  "softDelete": true
}

## Field Types (choose appropriate type)

**Text Fields:**
- text: Single-line text
- textarea: Multi-line text  
- richtext: WYSIWYG editor
- email: Email validation
- phone: Phone format
- url: URL validation

**Numeric Fields:**
- number: Integer or decimal
- currency: Money (requires "currency": "USD")
- percentage: Percentage values

**Date/Time Fields:**
- date: Date only
- datetime: Date and time
- time: Time only

**Selection Fields:**
- select: Single choice (requires "options": [{"value": "x", "label": "X", "color": "#..."}])
- multiselect: Multiple choices
- boolean: True/false

**Special Fields:**
- relationship: Links to another entity (requires "relationshipType": "belongsTo|hasMany|manyToMany", "targetEntity": "entityId")
- file: File upload
- image: Image upload
- autoId: Auto-increment ID
- createdAt: Creation timestamp
- updatedAt: Update timestamp

## View Types

**Table View:**
{
  "type": "table",
  "id": "viewId",
  "name": "viewName",
  "label": "View Label",
  "entityId": "entityId",
  "columns": [
    { "field": "fieldName", "width": 150, "sortable": true, "filterable": true }
  ],
  "sort": { "field": "createdAt", "order": "desc" },
  "searchable": true,
  "pageSize": 25,
  "showCreate": true,
  "showDelete": true
}

**Kanban View:**
{
  "type": "kanban",
  "id": "viewId",
  "name": "viewName",
  "label": "Pipeline",
  "entityId": "entityId",
  "groupByField": "status",
  "columns": [
    { "id": "new", "label": "New", "filterValue": "new", "color": "#3B82F6" }
  ],
  "cardFields": [
    { "field": "fieldName", "position": "body" }
  ],
  "cardTitleField": "name",
  "draggable": true
}

**Calendar View:**
{
  "type": "calendar",
  "id": "viewId",
  "name": "viewName",
  "label": "Calendar",
  "entityId": "entityId",
  "startDateField": "date",
  "endDateField": "endDate",    // optional
  "titleField": "name",
  "colorField": "status",        // optional
  "defaultView": "month"
}

# Critical Rules

1. **OUTPUT ONLY VALID JSON** - No explanations, no markdown, just JSON
2. **Always include standard fields**: id (autoId), createdAt, updatedAt
3. **Use exact field types** from schema above
4. **Set titleField** to the most descriptive field (usually "name" or "title")
5. **Create meaningful views** - at least one table and one kanban per entity
6. **Use select fields** for statuses/categories with color-coded options
7. **Set proper relationships** - belongsTo for foreign keys, hasMany for reverse
8. **Include navigation** structure grouping related entities

# Field Configuration Best Practices

- **Required fields**: name, email, status typically required: true
- **Show in list**: Important fields should have "showInList": true
- **Searchable**: Text/email fields should be "searchable": true
- **Sortable**: Most fields should be "sortable": true
- **Default values**: Status fields should have "defaultValue"
- **Colors**: Use hex colors for visual distinction

# Navigation Structure

Create a logical hierarchy:
{
  "id": "dashboard",
  "label": "Dashboard",
  "icon": "home",
  "viewId": "default-view"
},
{
  "id": "entities-group",
  "label": "Group Label",
  "icon": "folder",
  "children": [
    { "id": "entity1", "label": "Entity 1", "viewId": "..." }
  ]
}

# Industry-Specific Patterns

**Real Estate:**
- Entities: Properties, Leads, Agents, Showings
- Properties: address, price (currency), bedrooms, bathrooms, status (Available/Sold)
- Kanban: Properties by status

**Sales CRM:**
- Entities: Leads, Deals, Accounts, Contacts
- Deals: title, value (currency), stage, probability (percentage)
- Kanban: Deals by stage

**Customer Support:**
- Entities: Tickets, Customers, Agents
- Tickets: subject, priority (High/Med/Low), status
- Kanban: Tickets by status

# Examples

Real Estate CRM snippet:
{
  "entities": [{
    "id": "property",
    "name": "Property",
    "tableName": "properties",
    "titleField": "address",
    "fields": [
      { "id": "id", "name": "id", "label": "ID", "type": "autoId", "required": true },
      { "id": "address", "name": "address", "label": "Address", "type": "text", "required": true, "showInList": true },
      { "id": "price", "name": "price", "label": "Price", "type": "currency", "currency": "USD", "required": true, "showInList": true },
      { "id": "status", "name": "status", "label": "Status", "type": "select", "required": true, "options": [
        { "value": "available", "label": "Available", "color": "#10B981" },
        { "value": "sold", "label": "Sold", "color": "#6B7280" }
      ]}
    ]
  }],
  "views": [{
    "type": "table",
    "id": "properties-all",
    "entityId": "property",
    "columns": [{ "field": "address" }, { "field": "price" }, { "field": "status" }]
  }]
}

# Response Format
Return ONLY the complete, valid CRMConfig JSON. No additional text.`

/**
 * Generate a new CRM configuration from a user prompt
 */
export async function generateCRMConfig(
  prompt: string,
  context?: ConfigGenerationContext
): Promise<CRMConfig> {
  try {
    const userMessage = `Business Context:
Industry: ${context?.industry || 'Not specified'}
Primary Use Case: ${context?.primaryUseCase || 'Not specified'}

User Request: ${prompt}

Generate a complete, production-ready CRM configuration.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.3,
      system: CONFIG_GENERATOR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON (Claude might wrap in markdown)
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/({[\s\S]*})/)

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from AI response')
    }

    const config: CRMConfig = JSON.parse(jsonMatch[1] || jsonMatch[0])

    return config
  } catch (error) {
    console.error('Config generation error:', error)
    throw new Error(`Failed to generate CRM config: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Modify an existing CRM configuration
 */
export async function modifyCRMConfig(
  existingConfig: CRMConfig,
  modificationPrompt: string
): Promise<CRMConfig> {
  try {
    const userMessage = `Here is the existing CRM configuration:

\`\`\`json
${JSON.stringify(existingConfig, null, 2)}
\`\`\`

Modification Request: ${modificationPrompt}

Return the COMPLETE updated configuration (not just changes). Preserve all existing entities/views unless the modification explicitly changes them.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.2,
      system: CONFIG_GENERATOR_SYSTEM_PROMPT + '\n\nYou are modifying an existing config. Return the FULL updated config.',
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/({[\s\S]*})/)

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from AI response')
    }

    const config: CRMConfig = JSON.parse(jsonMatch[1] || jsonMatch[0])

    return config
  } catch (error) {
    console.error('Config modification error:', error)
    throw new Error(`Failed to modify CRM config: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate a CRM configuration against the schema
 */
export function validateCRMConfig(config: CRMConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Basic structure validation
  if (!config.version) errors.push('Missing version')
  if (!config.name) errors.push('Missing name')
  if (!config.entities || config.entities.length === 0) errors.push('No entities defined')
  if (!config.views || config.views.length === 0) errors.push('No views defined')
  if (!config.navigation) errors.push('Missing navigation')

  // Entity validation
  const entityIds = new Set<string>()
  config.entities?.forEach((entity, index) => {
    if (!entity.id) errors.push(`Entity ${index} missing id`)
    else if (entityIds.has(entity.id)) errors.push(`Duplicate entity id: ${entity.id}`)
    else entityIds.add(entity.id)

    if (!entity.name) errors.push(`Entity ${entity.id} missing name`)
    if (!entity.tableName) errors.push(`Entity ${entity.id} missing tableName`)
    if (!entity.fields || entity.fields.length === 0) errors.push(`Entity ${entity.id} has no fields`)

    // Check for required standard fields
    const fieldNames = entity.fields?.map(f => f.name) || []
    if (!fieldNames.includes('id')) errors.push(`Entity ${entity.id} missing id field`)
    if (!fieldNames.includes('createdAt')) errors.push(`Entity ${entity.id} missing createdAt field`)
    if (!fieldNames.includes('updatedAt')) errors.push(`Entity ${entity.id} missing updatedAt field`)

    // Validate titleField exists
    if (entity.titleField && !fieldNames.includes(entity.titleField)) {
      errors.push(`Entity ${entity.id} titleField "${entity.titleField}" does not exist`)
    }
  })

  // View validation
  config.views?.forEach((view, index) => {
    if (!view.id) errors.push(`View ${index} missing id`)
    if (!view.type) errors.push(`View ${view.id || index} missing type`)
    if (!view.entityId) errors.push(`View ${view.id || index} missing entityId`)
    else if (!entityIds.has(view.entityId)) {
      errors.push(`View ${view.id} references non-existent entity: ${view.entityId}`)
    }

    // Type-specific validation
    const entity = config.entities?.find(e => e.id === view.entityId)
    if (entity) {
      const fieldNames = entity.fields.map(f => f.name)

      if (view.type === 'kanban') {
        const kanbanView = view as any
        if (kanbanView.groupByField && !fieldNames.includes(kanbanView.groupByField)) {
          errors.push(`Kanban view ${view.id} groupByField "${kanbanView.groupByField}" does not exist`)
        }
      }

      if (view.type === 'calendar') {
        const calView = view as any
        if (calView.startDateField && !fieldNames.includes(calView.startDateField)) {
          errors.push(`Calendar view ${view.id} startDateField "${calView.startDateField}" does not exist`)
        }
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
