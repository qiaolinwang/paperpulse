'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Sparkles, BookOpen, Zap, Clock, Filter } from 'lucide-react'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [keywords, setKeywords] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        router.push('/dashboard')
      }
    }

    checkUser()
  }, [router, supabase.auth])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k)
      const requestBody = { email, keywords: keywordArray }

      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const responseData = await response.json()
        setSubscribed(true)
        setEmail('')
        setKeywords('')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Subscription failed: ${errorData.error || 'Please try again.'}`)
      }
    } catch (error) {
      alert('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (subscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to PaperPulse! 🎉</h2>
            <p className="text-muted-foreground mb-4">
              Check your email to confirm your subscription. You'll start receiving daily digests soon!
            </p>
            <Button onClick={() => setSubscribed(false)} variant="outline">
              Subscribe Another Email
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Top Navigation */}
      <header className="border-b bg-white/50 dark:bg-gray-800/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <span className="text-lg font-bold">PaperPulse</span>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="https://arxiv.org" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                arXiv
              </a>
              <a 
                href="/auth/signin" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </a>
              <a 
                href="/auth/signup" 
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 pt-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-full border">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">AI-Powered Research Digest</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6 leading-tight">
            Your Daily AI Paper Pulse
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Stop drowning in research papers. Get AI-summarized papers matching your interests delivered every morning.
          </p>

          {/* Subscription Form */}
          <Card className="max-w-2xl mx-auto mb-16">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-center">
                <Mail className="w-5 h-5" />
                Start Your Daily Digest
              </CardTitle>
              <CardDescription>
                Enter your email and research keywords to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubscribe} className="space-y-4">
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-lg h-12"
                />
                <Input
                  type="text"
                  placeholder="Keywords: diffusion, transformers, neural networks..."
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  required
                  className="text-lg h-12"
                />
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg" 
                  disabled={isLoading}
                  variant="neumorphic"
                >
                  {isLoading ? 'Subscribing...' : 'Subscribe for Free'}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                No spam, unsubscribe anytime. Powered by arXiv and Claude AI.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why PaperPulse?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Research moves fast. We help you stay ahead with intelligent curation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <Filter className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle>Smart Filtering</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Only papers matching your exact keywords and interests. No noise, just signal.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Sparkles className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>AI Summaries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Claude 4 reads every paper and gives you clear, concise summaries in plain English.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle>Daily Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Fresh papers delivered to your inbox every morning. Start your day informed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BookOpen className="w-8 h-8 text-orange-600 mb-2" />
              <CardTitle>arXiv Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Direct access to the world's largest repository of research papers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-8 h-8 text-red-600 mb-2" />
              <CardTitle>Zero Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Just email and keywords. No apps to install, no complex configurations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="w-8 h-8 text-indigo-600 mb-2" />
              <CardTitle>Beautiful Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Clean, readable format with direct links to papers and PDFs.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to stay ahead of research?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join researchers and engineers who trust PaperPulse for their daily research updates.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-3"
            onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-gray-800/50 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <span className="text-lg font-bold">PaperPulse</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              {/* arXiv moved to top navigation */}
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-4 pt-4 border-t">
            © 2025 PaperPulse. Powered by arXiv and Claude AI.
          </div>
        </div>
      </footer>
    </div>
  )
}