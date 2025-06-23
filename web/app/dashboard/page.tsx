'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PDFPreview } from '@/components/ui/pdf-preview'
import { 
  BookOpen, 
  ExternalLink, 
  FileText, 
  Calendar, 
  Users, 
  Clock, 
  Bookmark,
  BookmarkCheck,
  Star,
  Settings,
  LogOut
} from 'lucide-react'
import { Paper, User } from '@/lib/auth'

interface DigestData {
  date: string
  papers: Paper[]
  generated_at: string
}

interface PaperWithInteraction extends Paper {
  bookmarked?: boolean
  rating?: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [digests, setDigests] = useState<Record<string, DigestData>>({})
  const [selectedDate, setSelectedDate] = useState('')
  const [userPapers, setUserPapers] = useState<Record<string, any>>({})
  const router = useRouter()
  const supabase = createClient()

  // Generate last 7 days (today first)
  const getLast7Days = () => {
    const days = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      days.push(date.toISOString().split('T')[0])
    }
    return days
  }

  const last7Days = getLast7Days()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }
      setUser(user as any)
      
      // Set today as default selection
      const today = new Date().toISOString().split('T')[0]
      setSelectedDate(today)
    }

    checkUser()
  }, [router, supabase.auth])

  useEffect(() => {
    const fetchUserDigests = async () => {
      if (!user?.email) return

      try {
        // Fetch user's personalized digests
        const response = await fetch(`/api/user-digests?email=${encodeURIComponent(user.email)}&days=7`)
        
        if (!response.ok) {
          console.error('Failed to fetch user digests:', response.status)
          setLoading(false)
          return
        }

        const { success, data } = await response.json()
        
        if (success && data) {
          const digestsMap: Record<string, DigestData> = {}
          
          // Convert user digest data to the expected format
          data.forEach((userDigest: any) => {
            if (userDigest.papers && userDigest.papers.length > 0) {
              digestsMap[userDigest.date] = {
                date: userDigest.date,
                papers: userDigest.papers,
                generated_at: userDigest.sent_at
              }
            }
          })
          
          setDigests(digestsMap)
        }
      } catch (error) {
        console.error('Error fetching user digests:', error)
      }
      
      setLoading(false)
    }

    fetchUserDigests()
  }, [user?.email])

  useEffect(() => {
    const fetchUserPapers = async () => {
      if (!user) return

      const { data, error } = await supabase
        .from('user_papers')
        .select('*')
        .eq('user_id', user.id)

      if (!error && data) {
        const userPapersMap: Record<string, any> = {}
        data.forEach((up: any) => {
          userPapersMap[up.paper_id] = up
        })
        setUserPapers(userPapersMap)
      }
    }

    fetchUserPapers()
  }, [user, supabase])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00') // Ensure consistent timezone
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time for accurate comparison
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Compare dates without time
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today'
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const formatAuthors = (authors: string[]) => {
    if (authors.length <= 3) {
      return authors.join(', ')
    }
    return `${authors.slice(0, 3).join(', ')} et al.`
  }

  const toggleBookmark = async (paperId: string) => {
    if (!user) return

    const isBookmarked = userPapers[paperId]?.bookmarked || false
    
    if (isBookmarked) {
      // Remove bookmark
      const { error } = await supabase
        .from('user_papers')
        .delete()
        .eq('user_id', user.id)
        .eq('paper_id', paperId)
      
      if (!error) {
        const newUserPapers = { ...userPapers }
        delete newUserPapers[paperId]
        setUserPapers(newUserPapers)
      }
    } else {
      // Add bookmark
      const { error } = await supabase
        .from('user_papers')
        .upsert({
          user_id: user.id,
          paper_id: paperId,
          bookmarked: true
        })
      
      if (!error) {
        setUserPapers({
          ...userPapers,
          [paperId]: { ...userPapers[paperId], bookmarked: true }
        })
      }
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your research dashboard...</p>
        </div>
      </div>
    )
  }

  const selectedDigest = digests[selectedDate]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-gray-800/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <span className="text-lg font-bold">PaperPulse</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Your Research Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Your personalized research papers, delivered to your inbox
          </p>
        </div>

        {/* Daily Digest Navigation - Vertical Style */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Navigation */}
          <div className="lg:w-80 space-y-3">
            {last7Days.map(date => {
              const isSelected = selectedDate === date
              const paperCount = digests[date]?.papers.length || 0
              const dateObj = new Date(date + 'T00:00:00')
              const dayName = formatDate(date)
              
              // Only show separate date if it's not Today/Yesterday
              const showSeparateDate = !['Today', 'Yesterday'].includes(dayName)
              const formattedDate = showSeparateDate ? dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              }) : null
              
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    isSelected 
                      ? 'bg-purple-50 border-purple-200 shadow-md dark:bg-purple-900/20 dark:border-purple-700' 
                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold ${isSelected ? 'text-purple-900 dark:text-purple-200' : 'text-gray-900 dark:text-gray-100'}`}>
                        {dayName}
                      </div>
                      {formattedDate && (
                        <div className={`text-sm ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {formattedDate}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {paperCount > 0 ? (
                        <Badge 
                          variant={isSelected ? "default" : "secondary"}
                          className={isSelected ? 'bg-purple-600 text-white' : ''}
                        >
                          {paperCount}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">No papers</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right Content Area */}
          <div className="flex-1">
            <Tabs value={selectedDate} onValueChange={setSelectedDate} className="w-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {formatDate(selectedDate)} Papers
                </h2>
                <p className="text-muted-foreground">
                  {digests[selectedDate] 
                    ? `${digests[selectedDate].papers.length} papers sent to you` 
                    : 'No personalized digest for this date'
                  }
                </p>
              </div>

          {/* Paper Grid Content */}
          {last7Days.map(date => (
            <TabsContent key={date} value={date} className="space-y-6">
              {digests[date] ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {digests[date].papers.map((paper) => {
                    const isBookmarked = userPapers[paper.id]?.bookmarked || false
                    
                    return (
                      <Card key={paper.id} className="group hover:shadow-xl transition-all cursor-pointer">
                        {/* Paper Preview/Thumbnail */}
                        <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                          {/* Real PDF Preview */}
                          <PDFPreview 
                            pdfUrl={paper.pdf_url || paper.url.replace('/abs/', '/pdf/') + '.pdf'}
                            title={paper.title}
                            className="w-full h-full"
                          />
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white/90 backdrop-blur z-20"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleBookmark(paper.id)
                            }}
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-tight">
                            {paper.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            {formatAuthors(paper.authors)}
                          </p>
                          
                          {/* Categories */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {paper.categories.slice(0, 2).map(cat => (
                              <Badge 
                                key={cat} 
                                variant="outline" 
                                className="text-xs px-1 py-0"
                              >
                                {cat.split('.')[0]}
                              </Badge>
                            ))}
                          </div>

                          {/* Summary */}
                          {paper.summary && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                              {paper.summary}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => router.push(`/paper/${paper.id}`)}
                            >
                              Read More
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(paper.url, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Personalized Papers</h3>
                  <p className="text-muted-foreground">
                    No personalized digest was sent to you on {formatDate(date)}
                  </p>
                </div>
              )}
              </TabsContent>
            ))}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
} 