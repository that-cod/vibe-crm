# Using the JSONB Data Provider in Refine Components

This document explains how to integrate the custom JSONB data provider with Refine components.

## Quick Start

### 1. Basic Usage with CRMProvider

```tsx
import { CRMProvider } from '@/components/crm-provider'

// In your layout or page
export default function CRMLayout({ children }) {
    return (
        <CRMProvider projectId="your-project-id" userId="current-user-id">
            {children}
        </CRMProvider>
    )
}
```

### 2. With Pre-loaded Config (faster rendering)

```tsx
import { CRMProvider } from '@/components/crm-provider'
import type { CRMConfig } from '@/types/config'

export default function CRMLayout({ 
    children, 
    config 
}: { 
    children: React.ReactNode
    config: CRMConfig 
}) {
    return (
        <CRMProvider 
            projectId="your-project-id" 
            initialConfig={config}
            userId="current-user-id"
        >
            {children}
        </CRMProvider>
    )
}
```

### 3. Using CRMAppWrapper (simpler, when you have all props ready)

```tsx
import { CRMAppWrapper } from '@/components/crm-app-wrapper'
import type { CRMConfig } from '@/types/config'

export default function CRMView({ 
    projectId, 
    config 
}: { 
    projectId: string
    config: CRMConfig 
}) {
    return (
        <CRMAppWrapper projectId={projectId} config={config}>
            <YourCRMContent />
        </CRMAppWrapper>
    )
}
```

### 4. Using LiveCRMPreview (full interactive preview)

```tsx
import { LiveCRMPreview } from '@/components/live-crm-preview'
import type { CRMConfig } from '@/types/config'

export default function PreviewPage({ 
    projectId, 
    config 
}: { 
    projectId: string
    config: CRMConfig 
}) {
    return (
        <LiveCRMPreview 
            projectId={projectId} 
            config={config}
            initialEntityId="leads"  // Optional: start on specific entity
            initialViewId="leads-table" // Optional: start on specific view
        />
    )
}
```

## Using Refine Hooks

Once wrapped with a provider, you can use all Refine hooks:

### useList - Fetch records

```tsx
import { useList } from '@refinedev/core'

function LeadsList() {
    const { data, isLoading, isError } = useList({
        resource: 'leads', // Maps to entity_type in crm_data
        pagination: {
            current: 1,
            pageSize: 20
        },
        filters: [
            { field: 'status', operator: 'eq', value: 'new' }
        ],
        sorters: [
            { field: 'created_at', order: 'desc' }
        ]
    })

    if (isLoading) return <div>Loading...</div>
    if (isError) return <div>Error loading leads</div>

    return (
        <ul>
            {data?.data.map(lead => (
                <li key={lead.id}>{lead.name}</li>
            ))}
        </ul>
    )
}
```

### useOne - Fetch single record

```tsx
import { useOne } from '@refinedev/core'

function LeadDetail({ leadId }: { leadId: string }) {
    const { data, isLoading } = useOne({
        resource: 'leads',
        id: leadId
    })

    if (isLoading) return <div>Loading...</div>

    const lead = data?.data

    return (
        <div>
            <h1>{lead?.name}</h1>
            <p>Email: {lead?.email}</p>
            <p>Status: {lead?.status}</p>
        </div>
    )
}
```

### useCreate - Create record

```tsx
import { useCreate } from '@refinedev/core'

function CreateLeadForm() {
    const { mutate, isLoading } = useCreate()

    const handleSubmit = (formData: Record<string, unknown>) => {
        mutate({
            resource: 'leads',
            values: {
                name: formData.name,
                email: formData.email,
                status: 'new',
                source: formData.source
            }
        }, {
            onSuccess: () => {
                console.log('Lead created!')
            }
        })
    }

    return <form onSubmit={(e) => { /* ... */ }}>...</form>
}
```

### useUpdate - Update record

```tsx
import { useUpdate } from '@refinedev/core'

function UpdateLeadStatus({ leadId }: { leadId: string }) {
    const { mutate, isLoading } = useUpdate()

    const updateStatus = (newStatus: string) => {
        mutate({
            resource: 'leads',
            id: leadId,
            values: {
                status: newStatus
            }
        })
    }

    return (
        <select onChange={(e) => updateStatus(e.target.value)}>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
        </select>
    )
}
```

### useDelete - Delete record (soft delete)

```tsx
import { useDelete } from '@refinedev/core'

function DeleteLeadButton({ leadId }: { leadId: string }) {
    const { mutate, isLoading } = useDelete()

    const handleDelete = () => {
        mutate({
            resource: 'leads',
            id: leadId,
            // For hard delete (permanent):
            // meta: { hardDelete: true }
        })
    }

    return (
        <button onClick={handleDelete} disabled={isLoading}>
            Delete
        </button>
    )
}
```

## Using with Dynamic Views

The `ViewResolver` component automatically renders the correct view type:

```tsx
import { ViewResolver } from '@/components/crm-engine'
import type { Entity, View, CRMConfig } from '@/types/config'

function EntityView({ 
    entity, 
    view, 
    config 
}: { 
    entity: Entity
    view: View
    config: CRMConfig 
}) {
    return (
        <ViewResolver
            entity={entity}
            view={view}
            config={config}
        />
    )
}
```

This renders:
- `DynamicTable` for `view.type === 'table'`
- `DynamicKanban` for `view.type === 'kanban'`
- `DynamicCalendar` for `view.type === 'calendar'`

## Component Hierarchy

```
CRMProvider / CRMAppWrapper
    └── Refine
        └── Your Components
            ├── useList, useOne, useCreate, useUpdate, useDelete
            └── ViewResolver
                ├── DynamicTable
                ├── DynamicKanban
                └── DynamicCalendar

LiveCRMPreview (combines all of the above)
    └── Sidebar Navigation
    └── View Switcher
    └── ViewResolver
```

## Data Flow

1. **CRMProvider/CRMAppWrapper** creates a `DataProvider` using `createJSONBDataProvider(projectId)`
2. Refine hooks call `dataProvider.getList()`, `dataProvider.create()`, etc.
3. The JSONB data provider translates these to Supabase queries on `crm_data`
4. Records are stored with:
   - `project_id`: isolates data per CRM project
   - `entity_type`: groups records by entity (leads, contacts, etc.)
   - `data`: JSONB column with all field values
5. Responses are transformed to merge `data` fields with metadata

## Tips

### Filter by JSONB Fields

```tsx
// Filter by any field stored in JSONB
useList({
    resource: 'leads',
    filters: [
        { field: 'status', operator: 'eq', value: 'qualified' },
        { field: 'value', operator: 'gte', value: 10000 },
        { field: 'company', operator: 'contains', value: 'Tech' }
    ]
})
```

### Include Soft-Deleted Records

```tsx
useList({
    resource: 'leads',
    meta: { includeDeleted: true }
})
```

### Override Project ID

```tsx
// Useful for admin views that span projects
useList({
    resource: 'leads',
    meta: { projectId: 'different-project-id' }
})
```
