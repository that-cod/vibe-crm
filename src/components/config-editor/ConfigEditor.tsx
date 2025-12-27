'use client'

/**
 * ConfigEditor - Live editor for modifying CRM configuration
 * 
 * Allows users to:
 * - Add/edit/delete entities
 * - Manage fields per entity
 * - Configure views
 * 
 * Changes are reflected immediately in the LiveCRMPreview
 */

import { useState } from 'react'
import type { CRMConfig, Entity, View } from '@/types/config'
import {
    Plus,
    Trash2,
    Save,
    X,
    ChevronDown,
    ChevronRight,
    Database,
    Layout,
    Eye
} from 'lucide-react'

interface ConfigEditorProps {
    config: CRMConfig
    onChange: (updatedConfig: CRMConfig) => void
    onSave?: () => void
}

type EditorTab = 'entities' | 'views' | 'settings'

export function ConfigEditor({ config, onChange, onSave }: ConfigEditorProps) {
    const [activeTab, setActiveTab] = useState<EditorTab>('entities')
    const [expandedEntityId, setExpandedEntityId] = useState<string | null>(null)

    const handleAddEntity = () => {
        const newEntity = {
            id: `entity_${Date.now()}`,
            name: 'NewEntity',
            namePlural: 'NewEntities',
            label: 'New Entity',
            labelPlural: 'New Entities',
            description: 'A new entity',
            icon: 'database',
            color: '#3B82F6',
            tableName: 'new_entities',
            titleField: 'name',
            defaultSortField: 'createdAt',
            defaultSortOrder: 'desc' as const,
            softDelete: true,
            fields: [
                {
                    id: 'id',
                    name: 'id',
                    label: 'ID',
                    type: 'autoId' as const,
                    required: true,
                },
                {
                    id: 'name',
                    name: 'name',
                    label: 'Name',
                    type: 'text' as const,
                    required: true,
                },
            ],
        } as Entity

        onChange({
            ...config,
            entities: [...config.entities, newEntity],
        })
    }

    const handleDeleteEntity = (entityId: string) => {
        if (!confirm('Are you sure you want to delete this entity?')) return

        onChange({
            ...config,
            entities: config.entities.filter(e => e.id !== entityId),
            views: config.views.filter(v => v.entityId !== entityId),
        })
    }

    const handleUpdateEntity = (entityId: string, updates: Partial<Entity>) => {
        onChange({
            ...config,
            entities: config.entities.map(e =>
                e.id === entityId ? { ...e, ...updates } as Entity : e
            ),
        })
    }

    const handleAddField = (entityId: string) => {
        const entity = config.entities.find(e => e.id === entityId)
        if (!entity) return

        const newField = {
            id: `field_${Date.now()}`,
            name: 'newField',
            label: 'New Field',
            type: 'text' as const,
            required: false,
        }

        handleUpdateEntity(entityId, {
            fields: [...entity.fields, newField as any],
        })
    }

    const handleUpdateField = (entityId: string, fieldId: string, updates: Record<string, any>) => {
        const entity = config.entities.find(e => e.id === entityId)
        if (!entity) return

        handleUpdateEntity(entityId, {
            fields: entity.fields.map(f =>
                f.id === fieldId ? { ...f, ...updates } : f
            ),
        })
    }

    const handleDeleteField = (entityId: string, fieldId: string) => {
        const entity = config.entities.find(e => e.id === entityId)
        if (!entity) return

        if (!confirm('Delete this field?')) return

        handleUpdateEntity(entityId, {
            fields: entity.fields.filter(f => f.id !== fieldId),
        })
    }

    return (
        <div className="h-full flex flex-col bg-[#0a0a1a]">
            {/* Header */}
            <div className="border-b border-white/10 p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Config Editor</h2>
                    {onSave && (
                        <button
                            onClick={onSave}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('entities')}
                    className={`flex items-center gap-2 px-6 py-3 transition-colors ${activeTab === 'entities'
                            ? 'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Database className="w-4 h-4" />
                    Entities & Fields
                </button>
                <button
                    onClick={() => setActiveTab('views')}
                    className={`flex items-center gap-2 px-6 py-3 transition-colors ${activeTab === 'views'
                            ? 'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Eye className="w-4 h-4" />
                    Views
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-6 py-3 transition-colors ${activeTab === 'settings'
                            ? 'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Layout className="w-4 h-4" />
                    Settings
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {activeTab === 'entities' && (
                    <EntitiesEditor
                        entities={config.entities}
                        expandedEntityId={expandedEntityId}
                        onToggleExpand={setExpandedEntityId}
                        onAddEntity={handleAddEntity}
                        onDeleteEntity={handleDeleteEntity}
                        onUpdateEntity={handleUpdateEntity}
                        onAddField={handleAddField}
                        onUpdateField={handleUpdateField}
                        onDeleteField={handleDeleteField}
                    />
                )}

                {activeTab === 'views' && (
                    <ViewsEditor
                        views={config.views}
                        entities={config.entities}
                        onChange={(views) => onChange({ ...config, views })}
                    />
                )}

                {activeTab === 'settings' && (
                    <SettingsEditor
                        config={config}
                        onChange={onChange}
                    />
                )}
            </div>
        </div>
    )
}

/**
 * Entities & Fields Editor
 */
interface EntitiesEditorProps {
    entities: Entity[]
    expandedEntityId: string | null
    onToggleExpand: (id: string | null) => void
    onAddEntity: () => void
    onDeleteEntity: (id: string) => void
    onUpdateEntity: (id: string, updates: Partial<Entity>) => void
    onAddField: (entityId: string) => void
    onUpdateField: (entityId: string, fieldId: string, updates: Record<string, any>) => void
    onDeleteField: (entityId: string, fieldId: string) => void
}

function EntitiesEditor({
    entities,
    expandedEntityId,
    onToggleExpand,
    onAddEntity,
    onDeleteEntity,
    onUpdateEntity,
    onAddField,
    onUpdateField,
    onDeleteField,
}: EntitiesEditorProps) {
    return (
        <div className="space-y-2">
            {/* Add Entity Button */}
            <button
                onClick={onAddEntity}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors"
            >
                <Plus className="w-5 h-5" />
                Add Entity
            </button>

            {/* Entity List */}
            {entities.map(entity => (
                <div key={entity.id} className="border border-white/10 rounded-lg overflow-hidden">
                    {/* Entity Header */}
                    <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors">
                        <button
                            onClick={() => onToggleExpand(expandedEntityId === entity.id ? null : entity.id)}
                            className="flex items-center gap-3 flex-1 text-left"
                        >
                            {expandedEntityId === entity.id ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="text-2xl">{entity.icon}</span>
                            <div>
                                <div className="text-white font-medium">{entity.label}</div>
                                <div className="text-xs text-gray-500">{entity.fields.length} fields</div>
                            </div>
                        </button>
                        <button
                            onClick={() => onDeleteEntity(entity.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Entity Fields (Expanded) */}
                    {expandedEntityId === entity.id && (
                        <div className="p-4 space-y-3 bg-[#0f0f23]">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={entity.label}
                                    onChange={(e) => onUpdateEntity(entity.id, { label: e.target.value })}
                                    className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                                    placeholder="Entity Label"
                                />
                                <input
                                    type="text"
                                    value={entity.tableName}
                                    onChange={(e) => onUpdateEntity(entity.id, { tableName: e.target.value })}
                                    className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
                                    placeholder="Table Name"
                                />
                            </div>

                            {/* Fields */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-400">Fields</span>
                                    <button
                                        onClick={() => onAddField(entity.id)}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Field
                                    </button>
                                </div>

                                {entity.fields.map(field => (
                                    <div key={field.id} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => onUpdateField(entity.id, field.id, { label: e.target.value })}
                                            className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                                        />
                                        <select
                                            value={field.type}
                                            onChange={(e) => onUpdateField(entity.id, field.id, { type: e.target.value })}
                                            className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="email">Email</option>
                                            <option value="date">Date</option>
                                            <option value="select">Select</option>
                                            <option value="boolean">Boolean</option>
                                        </select>
                                        <button
                                            onClick={() => onDeleteField(entity.id, field.id)}
                                            className="p-1 text-red-400 hover:text-red-300 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

/**
 * Views Editor (Placeholder)
 */
function ViewsEditor({ views, entities, onChange }: { views: View[], entities: Entity[], onChange: (views: View[]) => void }) {
    return (
        <div className="text-center text-gray-500 py-12">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Views editor coming soon</p>
            <p className="text-sm mt-2">{views.length} views configured</p>
        </div>
    )
}

/**
 * Settings Editor (Placeholder)
 */
function SettingsEditor({ config, onChange }: { config: CRMConfig, onChange: (config: CRMConfig) => void }) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">CRM Name</label>
                <input
                    type="text"
                    value={config.name}
                    onChange={(e) => onChange({ ...config, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea
                    value={config.description}
                    onChange={(e) => onChange({ ...config, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                    rows={3}
                />
            </div>
        </div>
    )
}

export default ConfigEditor
