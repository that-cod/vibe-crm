"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { authConfig } from "@/lib/auth-config"

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    prompt?: string
}

export function AuthModal({ isOpen, onClose, prompt }: AuthModalProps) {
    const [mode, setMode] = useState<"main" | "email">("main")
    const [isSignUp, setIsSignUp] = useState(true)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
    })

    const handleGoogleSignIn = async () => {
        setLoading(true)
        if (prompt) {
            sessionStorage.setItem("pendingPrompt", prompt)
        }
        await signIn("google", { callbackUrl: "/onboarding" })
    }

    const handleGitHubSignIn = async () => {
        setLoading(true)
        if (prompt) {
            sessionStorage.setItem("pendingPrompt", prompt)
        }
        await signIn("github", { callbackUrl: "/onboarding" })
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isSignUp) {
                // Register new user
                const response = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || "Registration failed")
                }

                toast.success("Account created! Signing you in...")
            }

            // Sign in with credentials
            if (prompt) {
                sessionStorage.setItem("pendingPrompt", prompt)
            }

            // Sign in with credentials - redirect:true navigates on success
            await signIn("credentials", {
                email: formData.email,
                password: formData.password,
                callbackUrl: "/onboarding",
                redirect: true,
            })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Authentication failed"
            toast.error(errorMessage)
            setLoading(false)
        }
    }

    const resetToMain = () => {
        setMode("main")
        setFormData({ name: "", email: "", password: "" })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] bg-slate-900 border-white/10">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4 text-white" />
                    <span className="sr-only">Close</span>
                </button>

                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center">
                            <span className="text-2xl">💜</span>
                        </div>
                    </div>
                    <DialogTitle className="text-3xl font-bold text-white">
                        Start Building.
                    </DialogTitle>
                    <DialogDescription className="text-xl text-gray-400">
                        {mode === "main" ? "Create free account" : isSignUp ? "Create your account" : "Sign in to continue"}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-6">
                    {mode === "main" ? (
                        <div className="space-y-3">
                            {/* Google */}
                            <Button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-blue-500/50 justify-start text-base relative"
                            >
                                <span className="absolute left-4 text-xl">G</span>
                                <span className="flex-1">Continue with Google</span>
                                <span className="text-xs text-blue-400">Last used</span>
                            </Button>

                            {/* GitHub */}
                            {authConfig.providers.github.enabled && (
                                <Button
                                    onClick={handleGitHubSignIn}
                                    disabled={loading}
                                    className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start text-base relative"
                                >
                                    <svg className="absolute left-4 w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    <span className="flex-1">Continue with GitHub</span>
                                </Button>
                            )}

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-white/20" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-900 px-2 text-gray-400">OR</span>
                                </div>
                            </div>

                            {/* Email */}
                            <Button
                                onClick={() => setMode("email")}
                                disabled={loading}
                                className="w-full h-12 bg-white hover:bg-gray-100 text-black text-base"
                            >
                                Continue with email
                            </Button>

                            {/* Terms */}
                            <p className="text-xs text-gray-400 text-center mt-4">
                                By continuing, you agree to the{" "}
                                <a href="#" className="underline">
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="#" className="underline">
                                    Privacy Policy
                                </a>
                                .
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            {isSignUp && (
                                <div>
                                    <Label htmlFor="name" className="text-white">
                                        Name
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-white/10 border-white/20 text-white mt-1"
                                        placeholder="John Doe"
                                        required={isSignUp}
                                    />
                                </div>
                            )}
                            <div>
                                <Label htmlFor="email" className="text-white">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white mt-1"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="password" className="text-white">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white mt-1"
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                                {isSignUp && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Must be at least 8 characters
                                    </p>
                                )}
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isSignUp ? "Creating account..." : "Signing in..."}
                                    </>
                                ) : (
                                    <>{isSignUp ? "Create account" : "Sign in"}</>
                                )}
                            </Button>
                            <div className="text-center space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                                </button>
                                <br />
                                <button
                                    type="button"
                                    onClick={resetToMain}
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    ← Back to all options
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
