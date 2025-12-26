# CRM Data Storage & JSONB Data Provider

This module provides a flexible, schema-less data storage solution for the VibeCRM application using PostgreSQL's JSONB field type.

## Overview

Instead of creating individual database tables for each CRM entity (leads, contacts, deals, etc.), we use a single `crm_data` table that stores all entity records using JSONB. This approach provides:

- **No migrations needed** when adding new entities or fields
- **Dynamic schema** that adapts to any CRM configuration
- **Fast queries** using PostgreSQL's GIN indexing on JSONB
- **Soft delete support** for data recovery
- **Multi-tenant isolation** via project_id

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Refine.dev Components                     │
│                 (useList, useOne, useCreate, etc.)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              JSONB Data Provider (jsonb-data-provider.ts)   │
│                                                             │
│  • Implements Refine's DataProvider interface               │
│  • Translates CRUD operations to JSONB queries              │
│  • Handles filtering, sorting, pagination on JSONB fields   │
│  • Provides soft delete by default                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                JSONB Service (jsonb-service.ts)             │
│                                                             │
│  • Low-level CRUD operations                                │
│  • Bulk operations (create, delete)                         │
│  • Cross-entity search                                      │
│  • Aggregations for dashboards                              │
│  • Relationship lookups                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  crm_data Table (PostgreSQL)                │
│                                                             │
│  id          UUID        Primary key                        │
│  project_id  TEXT        CRM project reference              │
│  entity_type TEXT        Entity name (leads, contacts, etc) │
│  data        JSONB       All record fields                  │
│  created_by  TEXT        User who created                   │
│  updated_by  TEXT        User who last updated              │
│  deleted     BOOLEAN     Soft delete flag                   │
│  deleted_at  TIMESTAMP   When soft deleted                  │
│  created_at  TIMESTAMP   Creation timestamp                 │
│  updated_at  TIMESTAMP   Last update timestamp              │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### 1. Initialize the Data Provider

```typescript
import { createJSONBDataProvider } from '@/lib/data-provider'

// Create a data provider scoped to a specific CRM project
const dataProvider = createJSONBDataProvider('project-id-here')

// Use with Refine
<Refine dataProvider={dataProvider} ... />
```

### 2. Using with Refine Hooks

```typescript
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core'

// List leads
const { data: leads } = useList({
    resource: 'leads', // Maps to entity_type in crm_data
    pagination: { current: 1, pageSize: 10 },
    filters: [
        { field: 'status', operator: 'eq', value: 'new' }
    ],
    sorters: [
        { field: 'created_at', order: 'desc' }
    ]
})

// Create a lead
const { mutate: createLead } = useCreate()
createLead({
    resource: 'leads',
    values: {
        name: 'John Doe',
        email: 'john@example.com',
        status: 'new'
    }
})

// Update a lead
const { mutate: updateLead } = useUpdate()
updateLead({
    resource: 'leads',
    id: 'lead-id',
    values: { status: 'contacted' }
})

// Delete a lead (soft delete by default)
const { mutate: deleteLead } = useDelete()
deleteLead({ resource: 'leads', id: 'lead-id' })
```

### 3. Direct Service Access

For operations that don't fit the Refine pattern:

```typescript
import {
    queryRecords,
    createRecord,
    searchAcrossEntities,
    aggregateByField
} from '@/lib/data-provider'

// Custom query
const result = await queryRecords({
    projectId: 'project-id',
    entityType: 'leads',
    filters: [
        { field: 'value', operator: 'gte', value: 10000 }
    ],
    sort: { field: 'value', order: 'desc' }
})

// Search across all entities
const searchResults = await searchAcrossEntities(
    'project-id',
    'john', // Search term
    ['leads', 'contacts'] // Optional: limit to specific entities
)

// Get aggregations for dashboard
const statusCounts = await aggregateByField(
    'project-id',
    'leads',
    'status'
)
// Result: [{ value: 'new', count: 15 }, { value: 'contacted', count: 8 }, ...]
```

## Database Migration

To set up the database, run the SQL migration:

```bash
# Option 1: Using Supabase SQL Editor
# Copy contents of prisma/migrations/20251226_create_crm_data_table.sql
# and run in Supabase SQL Editor

# Option 2: Using psql
psql $DATABASE_URL < prisma/migrations/20251226_create_crm_data_table.sql
```

## Data Structure

### Record Format

Each record in `crm_data` looks like:

```json
{
    "id": "a1b2c3d4-...",
    "project_id": "project-123",
    "entity_type": "leads",
    "data": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "status": "new",
        "value": 50000,
        "company_id": "company-456"
    },
    "created_by": "user-789",
    "updated_by": "user-789",
    "deleted": false,
    "deleted_at": null,
    "created_at": "2025-12-26T10:00:00Z",
    "updated_at": "2025-12-26T10:30:00Z"
}
```

### Transformed Response

When retrieved via the data provider, records are transformed to:

```json
{
    "id": "a1b2c3d4-...",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "new",
    "value": 50000,
    "company_id": "company-456",
    "_meta": {
        "created_at": "2025-12-26T10:00:00Z",
        "updated_at": "2025-12-26T10:30:00Z",
        "created_by": "user-789",
        "updated_by": "user-789"
    }
}
```

## Indexing

The `crm_data` table includes these indexes for performance:

1. **project_id** - Filter by CRM project
2. **entity_type** - Filter by entity type
3. **(project_id, entity_type)** - Common query pattern
4. **GIN on data** - Fast JSONB field queries
5. **deleted** - Fast soft-delete filtering
6. **created_at DESC** - Default sort order

## Soft Delete

By default, all deletes are soft deletes:

```typescript
// Soft delete (default)
await deleteRecord({ resource: 'leads', id: '123' })

// Hard delete (permanent)
await deleteRecord({
    resource: 'leads',
    id: '123',
    meta: { hardDelete: true }
})

// Include deleted records in queries
const { data } = useList({
    resource: 'leads',
    meta: { includeDeleted: true }
})

// Restore a soft-deleted record
await dataProvider.custom({
    url: '',
    method: 'post',
    payload: { id: '123' },
    meta: { action: 'restore' }
})
```

## Type Safety

The data provider exports TypeScript types:

```typescript
import type { CRMDataRecord } from '@/lib/data-provider'

// CRMDataRecord represents the raw database record
interface CRMDataRecord {
    id: string
    project_id: string
    entity_type: string
    data: Record<string, unknown>
    created_by?: string
    updated_by?: string
    deleted: boolean
    deleted_at?: string
    created_at: string
    updated_at: string
}
```
