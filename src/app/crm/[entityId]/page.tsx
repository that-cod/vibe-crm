import { loadCRMConfig, getEntityFromConfig, getDefaultViewForEntity } from '@/lib/config-loader'
import { ViewResolver } from '@/components/crm-engine/ViewResolver'
import { notFound } from 'next/navigation'

/**
 * Dynamic entity list page
 * 
 * Route: /crm/[entityId]
 * Example: /crm/properties
 * 
 * This page loads the default view for the specified entity.
 */

interface PageProps {
    params: {
        entityId: string
    }
}

export default async function EntityListPage({ params }: PageProps) {
    // Load configuration
    const config = await loadCRMConfig()

    // Find the entity
    const entity = getEntityFromConfig(config, params.entityId)
    if (!entity) {
        notFound()
    }

    // Get the default view for this entity
    const view = getDefaultViewForEntity(config, params.entityId)
    if (!view) {
        return (
            <div style={{ padding: 24 }}>
                <h2>No Default View</h2>
                <p>No default view is configured for {entity.labelPlural}.</p>
            </div>
        )
    }

    // Render the view
    return (
        <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            <ViewResolver
                entity={entity}
                view={view}
                config={config}
            />
        </div>
    )
}

/**
 * Generate static params for all entities
 * This enables static generation at build time.
 */
export async function generateStaticParams() {
    const config = await loadCRMConfig()

    return config.entities.map(entity => ({
        entityId: entity.id,
    }))
}
