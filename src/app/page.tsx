"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { signIn } from "next-auth/react"

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handlePromptSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()

      if (prompt.trim().length < 20) {
        return
      }

      if (session) {
        // User is authenticated, store prompt and redirect to dashboard
        sessionStorage.setItem("pendingPrompt", prompt)
        router.push("/dashboard")
      } else {
        // User not authenticated, show auth modal
        setShowAuthModal(true)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-transparent animate-pulse" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">VibeCRM</span>
            </div>
            <div className="flex items-center space-x-3">
              {session ? (
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    Log in
                  </Button>

                  <Button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Get started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Centered Prompt */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Small badge */}
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
            <span className="text-sm text-white">🎁 Build your own CRM</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Build your own{" "}
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Vibe CRM
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            Create custom CRMs by chatting with AI
          </p>

          {/* Centered Prompt Box */}
          <div
            className={`max-w-3xl mx-auto transition-all duration-200 ${isFocused ? 'scale-105' : 'scale-100'
              }`}
          >
            <div
              className={`bg-black/40 backdrop-blur-xl rounded-2xl border transition-all ${isFocused ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20' : 'border-white/20'
                }`}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handlePromptSubmit}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Ask VibeCRM to create your custom CRM..."
                className="w-full bg-transparent text-white placeholder:text-gray-500 px-6 py-4 text-lg resize-none focus:outline-none min-h-[80px]"
                rows={3}
              />

              <div className="flex items-center justify-between px-4 pb-3 border-t border-white/10">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <button className="hover:text-white p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button className="hover:text-white p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <span className="text-xs">Theme</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="text-gray-400 hover:text-white p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors">
                    <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {prompt.length > 0 && prompt.length < 20 && (
              <p className="text-sm text-yellow-400 mt-2">Minimum 20 characters required</p>
            )}
          </div>

          {/* Helper text */}
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Press <kbd className="px-2 py-1 bg-white/10 rounded">Enter</kbd> to start building. No credit card required.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        prompt={prompt}
      />
    </div>
  )
}
