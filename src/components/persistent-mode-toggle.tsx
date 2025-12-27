'use client'

/**
 * PersistentModeToggle - Component to enable persistent Supabase storage
 * 
 * Allows users to migrate from in-memory test-storage to Supabase
 * for persistent, real-time data storage
 */

import { useState } from 'react'
import { Database, Cloud, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface PersistentModeToggleProps {
    projectId: string
    isPersistent: boolean
    onToggle: (enabled: boolean) => void
}

export function PersistentModeToggle({ projectId, isPersistent, onToggle }: PersistentModeToggleProps) {
    const [migrating, setMigrating] = useState(false)

    const handleEnablePersistent = async () => {
        if (isPersistent) {
            toast.error('Already in persistent mode')
            return
        }

        const confirmed = confirm(
            'Enable Persistent Mode?\n\n' +
            'This will:\n' +
            '✓ Save all data to Supabase database\n' +
            '✓ Enable real-time updates\n' +
            '✓ Keep data across page refreshes\n\n' +
            'Continue?'
        )

        if (!confirmed) return

        setMigrating(true)
        const toastId = toast.loading('Migrating data to Supabase...')

        try {
            const response = await fetch(`/api/projects/${projectId}/migrate`, {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Migration failed')
            }

            toast.success(`Migrated ${data.migratedCount} records!`, { id: toastId })
            onToggle(true)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Migration failed'
            toast.error(errorMessage, { id: toastId })
        } finally {
            setMigrating(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            {isPersistent ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Check className="w-4 h-4 text-green-400" />
                    <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-medium">
                            Persistent Mode
                        </span>
                    </div>
                </div>
            ) : (
                <button
                    onClick={handleEnablePersistent}
                    disabled={migrating}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
                >
                    {migrating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Migrating...
                        </>
                    ) : (
                        <>
                            <Database className="w-4 h-4" />
                            Enable Persistent Mode
                        </>
                    )}
                </button>
            )}

            {/* Info Badge */}
            {!isPersistent && (
                <div className="text-xs text-gray-500">
                    <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400">
                        In-Memory Mode
                    </span>
                </div>
            )}
        </div>
    )
}

export default PersistentModeToggle
