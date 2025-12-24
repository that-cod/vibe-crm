import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (creating schemas, running SQL)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

// ============================================
// SECURITY VALIDATION FUNCTIONS
// ============================================

/**
 * Validates schema name matches expected pattern
 * Prevents SQL injection via schema names
 */
function validateSchemaName(schemaName: string): boolean {
    // Must match: user_[alphanumeric/underscore]_[8-char-hash]_crm
    // Example: user_abc123_a1b2c3d4_crm
    const pattern = /^user_[a-z0-9_]{1,20}_[a-f0-9]{8}_crm$/
    return pattern.test(schemaName)
}

/**
 * Validates SQL contains only allowed commands
 * Prevents dangerous operations
 */
function validateSQLCommand(sql: string): { valid: boolean; error?: string } {
    const trimmedSQL = sql.trim().toUpperCase()

    // Allowed DDL commands for schema management
    const allowedCommands = [
        'CREATE SCHEMA',
        'CREATE TABLE',
        'ALTER TABLE',
        'CREATE INDEX',
        'DROP SCHEMA',
        'SET SEARCH_PATH',
        'SET search_path'
    ]

    // Check if SQL starts with allowed command
    const startsWithAllowed = allowedCommands.some(cmd =>
        trimmedSQL.startsWith(cmd.toUpperCase())
    )

    if (!startsWithAllowed) {
        return {
            valid: false,
            error: 'SQL must start with allowed DDL command'
        }
    }

    // Block dangerous patterns
    const dangerousPatterns = [
        /DROP\s+(DATABASE|USER|ROLE)/i,
        /ALTER\s+(DATABASE|USER|ROLE)/i,
        /GRANT/i,
        /REVOKE/i,
        /(public|information_schema|pg_catalog)\.\w+/i, // Don't allow operations on system schemas
        /;\s*DROP/i, // Prevent chained DROP commands
        /--/,  // Block SQL comments (can hide injection)
        /\/\*/  // Block multiline comments
    ]

    for (const pattern of dangerousPatterns) {
        if (pattern.test(sql)) {
            return {
                valid: false,
                error: `Dangerous SQL pattern detected: ${pattern.source}`
            }
        }
    }

    return { valid: true }
}

// ============================================
// SQL EXECUTION FUNCTIONS
// ============================================

// Helper to execute SQL with proper escaping
export async function executeSQLMigration(sql: string) {
    try {
        // Validate SQL before execution
        const validation = validateSQLCommand(sql)
        if (!validation.valid) {
            throw new Error(`SQL validation failed: ${validation.error}`)
        }

        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            sql_query: sql
        })

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('SQL execution error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: errorMessage }
    }
}

// Helper to create a new PostgreSQL schema for a user
export async function createUserSchema(schemaName: string) {
    // Validate schema name format
    if (!validateSchemaName(schemaName)) {
        return {
            success: false,
            error: 'Invalid schema name format. Expected: user_<id>_<hash>_crm'
        }
    }

    const sql = `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`
    return await executeSQLMigration(sql)
}

// Helper to run table creation SQL in a specific schema
export async function executeInSchema(schemaName: string, sql: string) {
    // Validate schema name
    if (!validateSchemaName(schemaName)) {
        return {
            success: false,
            error: 'Invalid schema name format'
        }
    }

    const wrappedSQL = `
    SET search_path TO "${schemaName}";
    ${sql}
  `
    return await executeSQLMigration(wrappedSQL)
}

// Helper to delete a user's schema (CASCADE drops all tables)
export async function deleteUserSchema(schemaName: string) {
    // Validate schema name
    if (!validateSchemaName(schemaName)) {
        return {
            success: false,
            error: 'Invalid schema name format'
        }
    }

    // Extra safety: ensure it's a user schema, not system schema
    if (!schemaName.startsWith('user_') || !schemaName.endsWith('_crm')) {
        return {
            success: false,
            error: 'Can only delete user CRM schemas'
        }
    }

    const sql = `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`
    return await executeSQLMigration(sql)
}
