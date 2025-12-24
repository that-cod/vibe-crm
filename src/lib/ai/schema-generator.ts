import { CRMSpec, FieldSpec } from './orchestrator'
import crypto from 'crypto'

// Map our field types to PostgreSQL types
const FIELD_TYPE_MAP: Record<string, string> = {
    string: 'VARCHAR(255)',
    email: 'VARCHAR(255)',
    phone: 'VARCHAR(50)',
    number: 'INTEGER',
    currency: 'DECIMAL(10, 2)',
    date: 'DATE',
    datetime: 'TIMESTAMP',
    boolean: 'BOOLEAN',
    text: 'TEXT',
    url: 'VARCHAR(500)',
    uuid: 'UUID',
    enum: 'VARCHAR(50)', // Will be constrained
}

export function generateSQL(spec: CRMSpec, schemaName: string): string {
    const sqlStatements: string[] = []

    // Create schema
    sqlStatements.push(`-- Create schema for user CRM`)
    sqlStatements.push(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`)
    sqlStatements.push(``)

    // Set search path
    sqlStatements.push(`-- Set search path to new schema`)
    sqlStatements.push(`SET search_path TO "${schemaName}";`)
    sqlStatements.push(``)

    // Create tables
    spec.tables.forEach(table => {
        sqlStatements.push(`-- Create ${table.displayName} table`)
        sqlStatements.push(`CREATE TABLE IF NOT EXISTS${table.name} (`)

        const fieldStatements = table.fields.map((field) => {
            let fieldSQL = `  ${field.name} ${getPostgresType(field)}`

            if (field.required) fieldSQL += ' NOT NULL'
            if (field.unique) fieldSQL += ' UNIQUE'
            if (field.name === 'id') fieldSQL += ' PRIMARY KEY DEFAULT gen_random_uuid()'
            if (field.defaultValue !== undefined) {
                if (field.defaultValue === 'now') {
                    fieldSQL += ` DEFAULT CURRENT_TIMESTAMP`
                } else if (typeof field.defaultValue === 'string') {
                    fieldSQL += ` DEFAULT '${field.defaultValue}'`
                } else {
                    fieldSQL += ` DEFAULT ${field.defaultValue}`
                }
            }

            return fieldSQL
        })

        sqlStatements.push(fieldStatements.join(',\n'))
        sqlStatements.push(`);`)
        sqlStatements.push(``)

        // Create indexes
        const indexFields = table.fields.filter(f =>
            f.type === 'email' || f.type === 'enum' || f.name.includes('Id') || f.name === 'status'
        )

        indexFields.forEach(field => {
            if (field.name !== 'id') {
                sqlStatements.push(
                    `CREATE INDEX IF NOT EXISTS idx_${table.name}_${field.name} ON ${table.name}(${field.name});`
                )
            }
        })

        if (indexFields.length > 0) sqlStatements.push(``)
    })

    // Add foreign key constraints
    spec.relationships.forEach(rel => {
        const foreignKey = rel.foreignKey || `${rel.to.slice(0, -1)}Id` // e.g., accountId
        sqlStatements.push(
            `-- Add foreign key: ${rel.from} → ${rel.to}`
        )
        sqlStatements.push(
            `ALTER TABLE ${rel.from} ADD CONSTRAINT fk_${rel.from}_${rel.to} ` +
            `FOREIGN KEY (${foreignKey}) REFERENCES ${rel.to}(id) ON DELETE CASCADE;`
        )
        sqlStatements.push(``)
    })

    // Create enum check constraints
    spec.tables.forEach(table => {
        table.fields.forEach(field => {
            if (field.type === 'enum' && field.enumOptions && field.enumOptions.length > 0) {
                const options = field.enumOptions.map(opt => `'${opt}'`).join(', ')
                sqlStatements.push(
                    `ALTER TABLE ${table.name} ADD CONSTRAINT check_${table.name}_${field.name} ` +
                    `CHECK (${field.name} IN (${options}));`
                )
            }
        })
    })

    return sqlStatements.join('\n')
}

function getPostgresType(field: FieldSpec): string {
    return FIELD_TYPE_MAP[field.type] || 'TEXT'
}

// Generate Prisma-style schema (optional - for documentation)
export function generatePrismaSchema(spec: CRMSpec): string {
    const lines: string[] = []

    spec.tables.forEach(table => {
        lines.push(`model ${capitalize(table.name.slice(0, -1))} {`)

        table.fields.forEach(field => {
            let fieldLine = `  ${field.name}`

            // Type
            const prismaType = getPrismaType(field)
            fieldLine += ` ${prismaType}`

            // Modifiers
            if (field.name === 'id') fieldLine += ' @id @default(uuid())'
            if (field.unique) fieldLine += ' @unique'
            if (field.defaultValue === 'now') fieldLine += ' @default(now())'
            if (!field.required && field.type !== 'boolean') fieldLine += '?'

            lines.push(fieldLine)
        })

        lines.push(`  @@map("${table.name}")`)
        lines.push(`}`)
        lines.push(``)
    })

    return lines.join('\n')
}

function getPrismaType(field: FieldSpec): string {
    const typeMap: Record<string, string> = {
        string: 'String',
        email: 'String',
        phone: 'String',
        number: 'Int',
        currency: 'Decimal',
        date: 'DateTime',
        datetime: 'DateTime',
        boolean: 'Boolean',
        text: 'String',
        url: 'String',
        uuid: 'String',
        enum: 'String',
    }
    return typeMap[field.type] || 'String'
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

// Helper to generate a safe, unique schema name
export function generateSchemaName(userId: string): string {
    // Create hash to ensure uniqueness even with collision in sanitized names
    const hash = crypto.createHash('md5').update(userId).digest('hex').slice(0, 8)

    // Remove any unsafe characters and create a safe identifier
    // Limit to 20 chars to keep total schema name under PostgreSQL limit (63 chars)
    const safeId = userId
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase()
        .slice(0, 20)

    // Format: user_<sanitized-id>_<hash>_crm
    // Total max length: 5 + 20 + 1 + 8 + 1 + 3 = 38 chars (well under 63 limit)
    return `user_${safeId}_${hash}_crm`
}
