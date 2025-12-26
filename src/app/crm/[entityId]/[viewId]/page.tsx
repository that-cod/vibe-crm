import { loadCRMConfig, getEntityFromConfig, getViewFromConfig, validateViewForEntity } from '@/lib/config-loader'
import { ViewResolver } from '@/components/crm-engine/ViewResolver'
import { notFound } from 'next/navigation'

/**
 * Dynamic view page
 * 
 * Route: /crm/[entityId]/[viewId]
 * Example: /crm/properties/pipeline
 * 
 * This page loads a specific view for an entity.
 */

interface PageProps {
    params: {
        entityId: string
        viewId: string
    }
}

export default async function EntityViewPage({ params }: PageProps) {
    // Load configuration
    const config = await loadCRMConfig()

    // Find the entity
    const entity = getEntityFromConfig(config, params.entityId)
    if (!entity) {
        notFound()
    }

    // Find the view
    const view = getViewFromConfig(config, params.viewId)
    if (!view) {
        notFound()
    }

    // Validate that this view belongs to this entity
    if (!validateViewForEntity(view, params.entityId)) {
        notFound()
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
 * Generate static params for all entity/view combinations
 * This enables static generation at build time.
 */
export async function generateStaticParams() {
    const config = await loadCRMConfig()

    const params: Array<{ entityId: string; viewId: string }> = []

    // Generate params for each view
    config.views.forEach(view => {
        params.push({
            entityId: view.entityId,
            viewId: view.id,
        })
    })

    return params
}
