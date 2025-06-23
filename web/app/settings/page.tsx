'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookOpen, Mail, Settings, Trash2 } from 'lucide-react'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        setMessage('Successfully unsubscribed. Sorry to see you go!')
        setEmail('')
      } else {
        const data = await response.json()
        setMessage(data.error || 'Unsubscribe failed. Please try again.')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-gray-800/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <span className="text-lg font-bold">PaperPulse</span>
            </div>
            <nav className="flex gap-4">
              <Button variant="ghost" onClick={() => window.location.href = '/'}>
                Home
              </Button>
              <Button variant="ghost" onClick={() => window.location.href = '/browse'}>
                Browse
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-full">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Manage Your Subscription
            </h1>
            <p className="text-lg text-muted-foreground">
              Update your preferences or unsubscribe from PaperPulse
            </p>
          </div>

          {/* Update Preferences */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Update Preferences
              </CardTitle>
              <CardDescription>
                Change your keywords or email preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email Address
                  </label>
                  <Input 
                    type="email" 
                    placeholder="your.email@example.com"
                    className="mb-4"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Research Keywords
                  </label>
                  <Input 
                    type="text" 
                    placeholder="machine learning, neural networks, nlp..."
                    className="mb-4"
                  />
                </div>
                <Button className="w-full" disabled>
                  Update Preferences (Coming Soon)
                </Button>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Pro tip:</strong> To update your preferences now, simply subscribe again with the same email and new keywords. Your preferences will be updated automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Unsubscribe */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                Unsubscribe
              </CardTitle>
              <CardDescription>
                Stop receiving daily digest emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnsubscribe} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email to unsubscribe"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Unsubscribing...' : 'Unsubscribe'}
                </Button>
              </form>
              
              {message && (
                <div className={`mt-4 p-4 rounded-lg ${
                  message.includes('Successfully') 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  {message}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">How to update keywords?</h4>
                <p className="text-sm text-muted-foreground">
                  Subscribe again with the same email and new keywords. Your preferences will be automatically updated.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Not receiving emails?</h4>
                <p className="text-sm text-muted-foreground">
                  Check your spam folder or ensure your email address is correct. Digests are sent daily at 1 PM UTC.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Want to pause temporarily?</h4>
                <p className="text-sm text-muted-foreground">
                  You can unsubscribe and re-subscribe later. Your preferences will be saved for 30 days.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}