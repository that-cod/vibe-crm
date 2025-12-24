"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Sparkles, Zap, Database, Code2 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-white/10 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold text-white">VibeCRM</span>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => signIn("google")}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => signIn("google")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Build Your Perfect CRM
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                in Minutes, Not Months
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Just describe your business needs in plain English. Our AI builds a production-ready,
              customized CRM tailored exactly to your workflow.
            </p>
            <Button
              onClick={() => signIn("google")}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started Free
            </Button>
          </div>

          {/* Features Grid */}
          <div className="mt-32 grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-12 h-12 text-yellow-400" />}
              title="Lightning Fast"
              description="From prompt to deployed CRM in under 2 minutes. No coding required."
            />
            <FeatureCard
              icon={<Database className="w-12 h-12 text-blue-400" />}
              title="Smart Database"
              description="Automatically generates optimized schemas with proper relationships and indexes."
            />
            <FeatureCard
              icon={<Code2 className="w-12 h-12 text-green-400" />}
              title="Production Ready"
              description="Built on Refine.dev with best practices. Fully customizable via prompts."
            />
          </div>

          {/* Example Prompts */}
          <div className="mt-24">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Try These Example Prompts
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <ExamplePrompt text="Build a CRM for my real estate agency with properties, clients, showings, and agent commission tracking" />
              <ExamplePrompt text="Create a customer support CRM with tickets, customers, knowledge base, and SLA tracking" />
              <ExamplePrompt text="I need a CRM for my cleaning business to manage clients, appointments, teams, and invoices" />
              <ExamplePrompt text="Build a recruitment CRM with candidates, jobs, interviews, and hiring pipeline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:border-purple-500/50 transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  )
}

function ExamplePrompt({ text }: { text: string }) {
  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-lg rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer group">
      <p className="text-gray-200 group-hover:text-white transition-colors">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  )
}
