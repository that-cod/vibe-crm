"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
    Sparkles,
    ArrowLeft,
    Code2,
    Database,
    FileCode,
    Download,
    Loader2
} from "lucide-react"
import toast from "react-hot-toast"

interface ProjectData {
    id: string
    projectName: string
    schemaName: string
    originalPrompt: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generatedSchema: any
    generatedSQL: string
    generatedCode: string
    status: string
    createdAt: string
}

export default function PreviewPage() {
    const { status } = useSession()
    const router = useRouter()
    const params = useParams()
    const projectId = params?.projectId as string

    const [project, setProject] = useState<ProjectData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'schema' | 'sql' | 'code'>('overview')
    const [customizePrompt, setCustomizePrompt] = useState("")
    const [customizing, setCustomizing] = useState(false)

    const fetchProject = useCallback(async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}`)
            if (!response.ok) throw new Error("Failed to fetch project")

            const data = await response.json()
            setProject(data.project)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to load project"
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/")
        } else if (status === "authenticated" && projectId) {
            fetchProject()
        }
    }, [status, projectId, router, fetchProject])



    const downloadCode = () => {
        if (!project) return

        const codeData = JSON.parse(project.generatedCode)
        const filesContent = codeData.files
            .map((file: { path: string; content: string }) => `// ${file.path}\n${file.content}`)
            .join('\n\n// ================================\n\n')

        const blob = new Blob([filesContent], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project.projectName.replace(/\s+/g, '_')}_code.txt`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("Code downloaded!")
    }

    const downloadSQL = () => {
        if (!project) return

        const blob = new Blob([project.generatedSQL], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project.schemaName}_schema.sql`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("SQL downloaded!")
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
            </div>
        )
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-white text-xl">Project not found</div>
            </div>
        )
    }

    const spec = project.generatedSchema
    const codeData = JSON.parse(project.generatedCode || '{"files":[],"dependencies":{},"instructions":""}')

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <nav className="border-b border-white/10 backdrop-blur-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.push("/dashboard")}
                                className="text-white hover:bg-white/10"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Dashboard
                            </Button>
                            <div className="text-white font-semibold text-lg">
                                {project.projectName}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={downloadCode}
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/10"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Code
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tab Navigation */}
                <div className="flex space-x-2 mb-6 border-b border-white/10">
                    {[
                        { id: 'overview', label: 'Overview', icon: Sparkles },
                        { id: 'schema', label: 'Schema', icon: Database },
                        { id: 'sql', label: 'SQL', icon: FileCode },
                        { id: 'code', label: 'Code', icon: Code2 },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'overview' | 'schema' | 'sql' | 'code')}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-purple-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">CRM Specification</CardTitle>
                                <CardDescription className="text-gray-300">
                                    Your original prompt and generated structure
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="text-white font-medium mb-2">Original Prompt:</h4>
                                    <div className="bg-white/5 rounded-lg p-4 text-gray-300 italic">
                                        &ldquo;{project.originalPrompt}&rdquo;
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-white font-medium mb-2">Generated Tables:</h4>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {spec?.tables?.map((table: { name: string; displayName: string; fields: unknown[] }) => (
                                            <div key={table.name} className="bg-white/5 rounded-lg p-4">
                                                <h5 className="text-white font-medium mb-1">{table.displayName}</h5>
                                                <p className="text-gray-400 text-sm">{table.fields.length} fields</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-white font-medium mb-2">Views:</h4>
                                    <div className="space-y-2">
                                        {spec?.views?.map((view: { name: string; type: string }, idx: number) => (
                                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                                                <span className="text-white">{view.name}</span>
                                                <span className="text-gray-400 text-sm ml-2">({view.type})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customization Card */}
                        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                    Refine Your CRM
                                </CardTitle>
                                <CardDescription className="text-gray-300">
                                    Make incremental changes using natural language
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Example: Add a lead score field to leads with values from 1 to 100"
                                    value={customizePrompt}
                                    onChange={(e) => setCustomizePrompt(e.target.value)}
                                    className="min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                                    disabled={customizing}
                                />

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">
                                        {customizePrompt.length} characters {customizePrompt.length < 10 && "(minimum 10)"}
                                    </span>
                                    <Button
                                        onClick={async () => {
                                            if (customizePrompt.length < 10) {
                                                toast.error("Please provide more details (minimum 10 characters)")
                                                return
                                            }

                                            setCustomizing(true)
                                            const toastId = toast.loading("Applying customization...")

                                            try {
                                                const response = await fetch("/api/customize-crm", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        projectId: project.id,
                                                        prompt: customizePrompt
                                                    })
                                                })

                                                const data = await response.json()

                                                if (!response.ok) {
                                                    throw new Error(data.error || "Failed to apply customization")
                                                }

                                                toast.success("Customization applied! Refreshing...", { id: toastId })
                                                setCustomizePrompt("")

                                                // Reload project data
                                                await fetchProject()
                                            } catch (error) {
                                                const errorMessage = error instanceof Error ? error.message : "Customization failed"
                                                toast.error(errorMessage, { id: toastId })
                                            } finally {
                                                setCustomizing(false)
                                            }
                                        }}
                                        disabled={customizing || customizePrompt.length < 10}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                                    >
                                        {customizing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Applying...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Apply Changes
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                                    <p className="text-purple-300 text-sm">
                                        <strong>Examples:</strong> &quot;Add a priority field to tasks&quot;, &quot;Remove the phone field from contacts&quot;, &quot;Add a new table for meetings&quot;
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'schema' && (
                    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center justify-between">
                                Database Schema
                                <Button onClick={downloadSQL} variant="outline" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download SQL
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-gray-300 text-sm">
                                {JSON.stringify(spec, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'sql' && (
                    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center justify-between">
                                SQL Migration
                                <Button onClick={downloadSQL} variant="outline" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-green-400 text-sm font-mono">
                                {project.generatedSQL}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'code' && (
                    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center justify-between">
                                Generated Application Code
                                <Button onClick={downloadCode} variant="outline" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="text-white font-medium mb-2">Files:</h4>
                                <div className="space-y-2">
                                    {codeData.files.map((file: { path: string; content: string }, idx: number) => (
                                        <details key={idx} className="bg-white/5 rounded-lg">
                                            <summary className="p-3 cursor-pointer text-purple-400 hover:text-purple-300">
                                                {file.path}
                                            </summary>
                                            <pre className="bg-black/50 p-4 text-gray-300 text-xs overflow-x-auto">
                                                {file.content}
                                            </pre>
                                        </details>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-white font-medium mb-2">Dependencies:</h4>
                                <pre className="bg-black/50 rounded-lg p-4 text-gray-300 text-sm">
                                    {JSON.stringify(codeData.dependencies, null, 2)}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
