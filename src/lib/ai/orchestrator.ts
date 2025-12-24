import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
})

// CRM Specification Types
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

const ORCHESTRATOR_SYSTEM_PROMPT = `You are a CRM schema architect. Convert user prompts into structured CRM specifications.

CRITICAL RULES:
1. ALWAYS include these standard CRM tables: leads, contacts, accounts (companies)
2. Infer natural relationships:
   - Lead → Account (when lead converts to customer)
   - Contact → Account (contacts belong to companies)
   - Task/Activity → Lead/Contact/Account (activities link to records)
3. Use proper field types: email, phone, currency, date, enum for statuses
4. Include common CRM fields in each table:
   - id (uuid, primary key)
   - createdAt, updatedAt (datetime)
   - createdBy (string, user who created)
   - status/stage (enum with pipeline stages)
5. For pipelines, create enum fields with stages like: "New", "Contacted", "Qualified", "Proposal", "Won", "Lost"
6. Always include at least one Kanban view for pipeline visualization

STANDARD FIELD PATTERNS:
- Leads: firstName, lastName, email, phone, company, status, source, assignedTo
- Contacts: firstName, lastName, email, phone, jobTitle, accountId
- Accounts: name, industry, website, phone, address, accountOwner
- Tasks: title, description, dueDate, priority, status, assignedTo, relatedTo
- Opportunities: title, value, stage, closeDate, probability, accountId

OUTPUT FORMAT: Return ONLY valid JSON matching this schema:
{
  "tables": [
    {
      "name": "leads",
      "displayName": "Leads",
      "icon": "Users",
      "fields": [
        { "name": "id", "displayName": "ID", "type": "uuid", "required": true },
        { "name": "firstName", "displayName": "First Name", "type": "string", "required": true },
        { "name": "status", "displayName": "Status", "type": "enum", "required": true, "enumOptions": ["New", "Contacted", "Qualified", "Lost"] }
      ]
    }
  ],
  "relationships": [
    { "from": "leads", "to": "accounts", "type": "manyToOne", "foreignKey": "accountId" }
  ],
  "views": [
    { "name": "Lead Pipeline", "type": "kanban", "table": "leads", "groupBy": "status" }
  ]
}

EXAMPLES OF GOOD RESPONSES:
User: "CRM for a real estate agency"
→ Include: properties (listings), clients, showings, agents, commissions
→ Relationships: Property → Agent, Showing → Property + Client
→ Kanban: Properties by status (Available, Under Contract, Sold)

User: "Customer support CRM"
→ Include: tickets, customers, knowledge_base, sla_tracking
→ Kanban: Tickets by status (New, In Progress, Resolved, Closed)

Now convert the user's prompt to a complete CRM specification.`

export async function parsePromptToCRMSpec(
    prompt: string,
    businessContext?: { industry?: string; primaryUseCase?: string }
): Promise<CRMSpec> {
    try {
        const userMessage = `Business Context:
Industry: ${businessContext?.industry || 'Not specified'}
Primary Use Case: ${businessContext?.primaryUseCase || 'Not specified'}

User Prompt: ${prompt}

Generate a complete CRM specification for this business.`

        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022', // Latest Claude model
            max_tokens: 4096,
            temperature: 0.2, // Lower temperature for more consistent outputs
            system: ORCHESTRATOR_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: userMessage,
                },
            ],
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

        // Extract JSON from response (Claude might wrap it in markdown)
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/({[\s\S]*})/)

        if (!jsonMatch) {
            throw new Error('Failed to parse JSON from Claude response')
        }

        const spec: CRMSpec = JSON.parse(jsonMatch[1] || jsonMatch[0])

        // Add business context
        spec.businessContext = {
            industry: businessContext?.industry || 'General',
            primaryUseCase: businessContext?.primaryUseCase || 'CRM',
        }

        return spec
    } catch (error) {
        console.error('Orchestrator error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to generate CRM spec: ${errorMessage}`)
    }
}

// Helper: Validate CRM spec
export function validateCRMSpec(spec: CRMSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for required tables
    const tableNames = spec.tables.map(t => t.name)
    if (!tableNames.includes('leads')) errors.push('Missing required table: leads')
    if (!tableNames.includes('contacts')) errors.push('Missing required table: contacts')
    if (!tableNames.includes('accounts')) errors.push('Missing required table: accounts')

    // Check each table has required fields
    spec.tables.forEach(table => {
        const fieldNames = table.fields.map(f => f.name)
        if (!fieldNames.includes('id')) errors.push(`Table ${table.name} missing id field`)
        if (!fieldNames.includes('createdAt')) errors.push(`Table ${table.name} missing createdAt field`)
    })

    // Check relationships reference valid tables
    spec.relationships.forEach(rel => {
        if (!tableNames.includes(rel.from)) errors.push(`Relationship references invalid table: ${rel.from}`)
        if (!tableNames.includes(rel.to)) errors.push(`Relationship references invalid table: ${rel.to}`)
    })

    return {
        valid: errors.length === 0,
        errors,
    }
}
