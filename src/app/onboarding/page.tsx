"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Building2, Users, Target } from "lucide-react"
import toast from "react-hot-toast"

const INDUSTRIES = [
    "Real Estate",
    "Healthcare",
    "Technology",
    "Finance",
    "Retail",
    "Manufacturing",
    "Education",
    "Professional Services",
    "Non-Profit",
    "Other"
]

const TEAM_SIZES = [
    "Just me",
    "2-10 people",
    "11-50 people",
    "51-200 people",
    "200+ people"
]

const USE_CASES = [
    "Sales & Lead Management",
    "Customer Support",
    "Project Management",
    "Client Relationship Management",
    "Recruitment",
    "Event Management",
    "Other"
]

export default function OnboardingPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        businessName: "",
        industry: "",
        teamSize: "",
        primaryUseCase: ""
    })

    if (status === "unauthenticated") {
        router.push("/")
        return null
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-white text-xl">Loading...</div>
            </div>
        )
    }

    // Check if user has already completed onboarding
    useEffect(() => {
        const checkProfile = async () => {
            if (status === "authenticated") {
                try {
                    const response = await fetch("/api/onboarding")
                    if (response.ok) {
                        const data = await response.json()
                        // If profile exists, redirect to dashboard
                        if (data.profile) {
                            router.push("/dashboard")
                        }
                    }
                } catch (error) {
                    console.error("Error checking profile:", error)
                }
            }
        }
        checkProfile()
    }, [status, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.businessName || !formData.industry || !formData.teamSize || !formData.primaryUseCase) {
            toast.error("Please fill in all fields")
            return
        }

        setLoading(true)

        try {
            const response = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                throw new Error("Failed to save profile")
            }

            toast.success("Profile saved! Redirecting to dashboard...")
            setTimeout(() => {
                router.push("/dashboard")
            }, 1000)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Something went wrong"
            toast.error(errorMessage)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <Sparkles className="w-10 h-10 text-purple-400" />
                        <h1 className="text-3xl font-bold text-white">VibeCRM</h1>
                    </div>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                        Welcome, {session?.user?.name?.split(" ")[0]}! 👋
                    </h2>
                    <p className="text-gray-300">
                        Tell us a bit about your business so we can build the perfect CRM for you
                    </p>
                </div>

                {/* Onboarding Form */}
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Business Profile</CardTitle>
                        <CardDescription className="text-gray-300">
                            This helps our AI understand your needs better
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Business Name */}
                            <div className="space-y-2">
                                <Label htmlFor="businessName" className="text-white flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Business Name
                                </Label>
                                <Input
                                    id="businessName"
                                    placeholder="Acme Inc."
                                    value={formData.businessName}
                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                                    required
                                />
                            </div>

                            {/* Industry */}
                            <div className="space-y-2">
                                <Label htmlFor="industry" className="text-white flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Industry
                                </Label>
                                <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue placeholder="Select your industry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INDUSTRIES.map(industry => (
                                            <SelectItem key={industry} value={industry}>
                                                {industry}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Team Size */}
                            <div className="space-y-2">
                                <Label htmlFor="teamSize" className="text-white flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Team Size
                                </Label>
                                <Select value={formData.teamSize} onValueChange={(value) => setFormData({ ...formData, teamSize: value })}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue placeholder="How many people?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEAM_SIZES.map(size => (
                                            <SelectItem key={size} value={size}>
                                                {size}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Primary Use Case */}
                            <div className="space-y-2">
                                <Label htmlFor="primaryUseCase" className="text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    What&apos;s your main goal?
                                </Label>
                                <Select value={formData.primaryUseCase} onValueChange={(value) => setFormData({ ...formData, primaryUseCase: value })}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                        <SelectValue placeholder="Select your primary use case" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {USE_CASES.map(useCase => (
                                            <SelectItem key={useCase} value={useCase}>
                                                {useCase}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
                                disabled={loading}
                            >
                                {loading ? "Saving..." : "Continue to Dashboard →"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Progress Indicator */}
                <div className="mt-6 text-center">
                    <div className="inline-flex items-center space-x-2 text-sm text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span>Step 1 of 2</span>
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
