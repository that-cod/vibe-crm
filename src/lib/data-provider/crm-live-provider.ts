/**
 * Custom Live Provider for JSONB-based CRM Data
 * 
 * This provider integrates with Supabase real-time to enable live updates
 * for CRM data stored in the crm_data JSONB table.
 * 
 * Features:
 * - Subscribe to specific entity types within a project
 * - Transform JSONB payloads to match component expectations
 * - Handle INSERT, UPDATE, DELETE events
 * - Automatic cleanup on unmount
 */

import type { LiveProvider, LiveEvent } from '@refinedev/core'
import { supabase } from '../supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Store active subscriptions
const activeChannels = new Map<string, RealtimeChannel>()

/**
 * Transform raw crm_data record to flattened format
 */
function transformRecord(record: CRMDataPayload): Record<string, unknown> {
    return {
        id: record.id,
        ...record.data,
        _meta: {
            created_at: record.created_at,
            updated_at: record.updated_at,
            created_by: record.created_by,
            updated_by: record.updated_by,
        },
    }
}

/**
 * CRM data record from Supabase
 */
interface CRMDataPayload {
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

/**
 * Create subscription key for identifying unique subscriptions
 */
function getSubscriptionKey(projectId: string, entityType: string): string {
    return `crm_${projectId}_${entityType}`
}

/**
 * Create a custom live provider for JSONB CRM data
 * 
 * @param projectId - The CRM project ID to scope subscriptions to
 * @returns Refine LiveProvider instance
 */
export function createCRMLiveProvider(projectId: string): LiveProvider {
    return {
        /**
         * Subscribe to changes for a specific entity type
         */
        subscribe: ({ channel, types, params, callback }) => {
            // 'channel' in our case is the entity type (resource)
            const entityType = channel
            const subscriptionKey = getSubscriptionKey(projectId, entityType)

            // If already subscribed, don't create duplicate
            if (activeChannels.has(subscriptionKey)) {
                console.log(`Already subscribed to ${subscriptionKey}`)
                return { unsubscribe: () => { } }
            }

            console.log(`Subscribing to real-time updates for ${entityType}...`)

            // Create Supabase real-time channel with filter
            const realtimeChannel = supabase
                .channel(subscriptionKey)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to all events
                        schema: 'public',
                        table: 'crm_data',
                        filter: `project_id=eq.${projectId}`,
                    },
                    (payload: RealtimePostgresChangesPayload<CRMDataPayload>) => {
                        // Only process events for this entity type
                        const newRecord = payload.new as CRMDataPayload | undefined
                        const oldRecord = payload.old as CRMDataPayload | undefined

                        const recordEntityType = newRecord?.entity_type || oldRecord?.entity_type
                        if (recordEntityType !== entityType) {
                            return // Skip events for other entity types
                        }

                        // Skip deleted records unless specifically requested
                        if (newRecord?.deleted && !params?.meta?.includeDeleted) {
                            return
                        }

                        // Map Supabase event to Refine event type
                        let eventType: LiveEvent['type']
                        switch (payload.eventType) {
                            case 'INSERT':
                                eventType = 'created'
                                break
                            case 'UPDATE':
                                eventType = 'updated'
                                break
                            case 'DELETE':
                                eventType = 'deleted'
                                break
                            default:
                                return // Unknown event type
                        }

                        // Check if this event type should be processed
                        if (types && !types.includes(eventType)) {
                            return
                        }

                        // Create Refine live event
                        const liveEvent: LiveEvent = {
                            channel: entityType,
                            type: eventType,
                            date: new Date(),
                            payload: {
                                ids: newRecord ? [newRecord.id] : oldRecord ? [oldRecord.id] : [],
                            },
                        }

                        // Add transformed data if available
                        if (newRecord) {
                            (liveEvent.payload as Record<string, unknown>).data = transformRecord(newRecord)
                        }

                        console.log(`Live event: ${eventType} on ${entityType}`, liveEvent.payload)

                        // Call the callback with the event
                        callback(liveEvent)
                    }
                )
                .subscribe((status) => {
                    console.log(`Realtime subscription status for ${entityType}:`, status)
                })

            // Store the channel reference
            activeChannels.set(subscriptionKey, realtimeChannel)

            // Return unsubscribe function
            return {
                unsubscribe: () => {
                    console.log(`Unsubscribing from ${subscriptionKey}`)
                    realtimeChannel.unsubscribe()
                    activeChannels.delete(subscriptionKey)
                },
            }
        },

        /**
         * Unsubscribe from a specific channel
         */
        unsubscribe: (subscription) => {
            subscription.unsubscribe()
        },

        /**
         * Publish an event (for optimistic updates)
         * Note: In a real implementation, this would broadcast to other clients
         */
        publish: (event) => {
            console.log('Publishing live event:', event)
            // In Supabase, the database change triggers the event automatically
            // This method is used for optimistic updates in the UI
            return Promise.resolve()
        },
    }
}

/**
 * Clean up all active subscriptions
 * Call this when the CRM is unmounted
 */
export function cleanupCRMSubscriptions(): void {
    console.log(`Cleaning up ${activeChannels.size} active subscriptions`)
    activeChannels.forEach((channel, key) => {
        channel.unsubscribe()
        console.log(`Unsubscribed from ${key}`)
    })
    activeChannels.clear()
}

/**
 * Get count of active subscriptions
 */
export function getActiveSubscriptionCount(): number {
    return activeChannels.size
}

/**
 * Check if subscribed to a specific entity
 */
export function isSubscribed(projectId: string, entityType: string): boolean {
    return activeChannels.has(getSubscriptionKey(projectId, entityType))
}

/**
 * Hook-friendly version for use in React components
 */
export function useCRMLiveProvider(projectId: string): LiveProvider {
    // Create provider - this is stable for the same projectId
    return createCRMLiveProvider(projectId)
}

export default createCRMLiveProvider
