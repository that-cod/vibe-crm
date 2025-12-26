"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, LogOut, Zap, Clock, CheckCircle2, XCircle } from "lucide-react"
import toast from "react-hot-toast"

const EXAMPLE_PROMPTS = [
    "Create a CRM for my real estate agency with properties, clients, showings, and agent commission tracking",
    "Build a customer support CRM with tickets, customers, knowledge base articles, and SLA tracking",
    "I need a CRM for my cleaning business to manage clients, appointments, teams, and invoices",
    "Create a recruitment CRM with candidates, jobs, interviews, and hiring pipeline stages"
]

interface Project {
    id: string
    projectName: string
    status: string
    createdAt: string
}

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [prompt, setPrompt] = useState("")
    const [generating, setGenerating] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])
    const [loadingProjects, setLoadingProjects] = useState(true)

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/")
        } else if (status === "authenticated") {
            fetchProjects()

            // Check for stored prompt from landing page
            const storedPrompt = sessionStorage.getItem("pendingPrompt")
            if (storedPrompt) {
                setPrompt(storedPrompt)
                sessionStorage.removeItem("pendingPrompt")
            }
        }
    }, [status, router])

    const fetchProjects = async () => {
        try {
            const response = await fetch("/api/generate-crm")
            if (response.ok) {
                const data = await response.json()
                setProjects(data.projects || [])
            }
        } catch (error) {
            console.error("Failed to fetch projects:", error)
        } finally {
            setLoadingProjects(false)
        }
    }

    const handleGenerate = async () => {
        if (!prompt || prompt.length < 20) {
            toast.error("Please write a more detailed prompt (at least 20 characters)")
            return
        }

        setGenerating(true)
        const toastId = toast.loading("Analyzing your prompt...")

        try {
            const response = await fetch("/api/generate-crm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate CRM")
            }

            toast.success("CRM generated successfully!", { id: toastId })

            // Redirect to preview page
            setTimeout(() => {
                router.push(`/dashboard/preview/${data.projectId}`)
            }, 500)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Something went wrong"
            toast.error(errorMessage, { id: toastId })
            setGenerating(false)
        }
    }

    const fillExample = (example: string) => {
        setPrompt(example)
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-white text-xl">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <nav className="border-b border-white/10 backdrop-blur-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-8 h-8 text-purple-400" />
                            <span className="text-2xl font-bold text-white">VibeCRM</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-white text-sm">
                                {session?.user?.email}
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="text-white hover:bg-white/10"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Prompt Area - 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">
                                Build Your CRM
                            </h1>
                            <p className="text-gray-300 text-lg">
                                Describe your business needs in plain English, and our AI will build a custom CRM for you
                            </p>
                        </div>

                        {/* Prompt Input Card */}
                        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-400" />
                                    What kind of CRM do you need?
                                </CardTitle>
                                <CardDescription className="text-gray-300">
                                    Be as detailed as you want - mention specific features, data fields, or workflows
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Example: Create a CRM for my real estate agency. I need to track properties, clients, showings, and agent commissions. Include a pipeline view for property status..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="min-h-[200px] bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none text-lg"
                                    disabled={generating}
                                />

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">
                                        {prompt.length} characters {prompt.length < 20 && "(minimum 20)"}
                                    </span>
                                    <Button
                                        onClick={handleGenerate}
                                        disabled={generating || prompt.length < 20}
                                        size="lg"
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                                    >
                                        {generating ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate CRM
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Example Prompts */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">
                                Not sure what to write? Try these examples:
                            </h3>
                            <div className="grid gap-3">
                                {EXAMPLE_PROMPTS.map((example, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => fillExample(example)}
                                        disabled={generating}
                                        className="text-left bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-lg rounded-lg p-4 border border-purple-500/20 hover:border-purple-500/50 transition-all text-gray-200 hover:text-white disabled:opacity-50"
                                    >
                                        <span className="text-purple-400 text-sm font-medium">Example {idx + 1}</span>
                                        <p className="mt-1 text-sm">{example}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Recent Projects */}
                    <div className="lg:col-span-1">
                        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Your CRMs
                                </CardTitle>
                                <CardDescription className="text-gray-300">
                                    {projects.length > 0 ? "Recent projects" : "You haven't created any CRMs yet"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingProjects ? (
                                    <div className="text-gray-400 text-sm">Loading...</div>
                                ) : projects.length === 0 ? (
                                    <div className="text-gray-400 text-sm italic">
                                        Your generated CRMs will appear here
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {projects.slice(0, 5).map(project => (
                                            <button
                                                key={project.id}
                                                onClick={() => router.push(`/dashboard/preview/${project.id}`)}
                                                className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg p-3 border border-white/10 hover:border-purple-500/50 transition-all"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-white font-medium text-sm truncate">
                                                            {project.projectName}
                                                        </h4>
                                                        <p className="text-gray-400 text-xs mt-1">
                                                            {new Date(project.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="ml-2">
                                                        {project.status === "completed" && (
                                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                        )}
                                                        {project.status === "generating" && (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                                                        )}
                                                        {project.status === "failed" && (
                                                            <XCircle className="w-4 h-4 text-red-400" />
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
