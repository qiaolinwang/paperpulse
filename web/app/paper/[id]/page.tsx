'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  ArrowLeft,
  Share2,
  Download,
  Twitter,
  Linkedin,
  Mail
} from 'lucide-react'
import { Paper, User } from '@/lib/auth'
import PaperFigures from '@/components/paper/PaperFigures'

interface ExtendedPaper extends Paper {
  detailed_analysis?: {
    executive_summary: string
    key_contributions: string[]
    methodology: string
    results: string
    technical_approach: string
    significance: string
    limitations: string
    technical_difficulty: number
    target_audience: string
  }
}

export default function PaperDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [paper, setPaper] = useState<ExtendedPaper | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [parseLoading, setParseLoading] = useState(false)
  const [paperStructure, setPaperStructure] = useState<any>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [userRating, setUserRating] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user as any)
    }

    checkUser()
  }, [supabase.auth])

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        // First try to get from database
        const { data: dbPaper, error } = await supabase
          .from('papers')
          .select('*')
          .eq('id', params.id)
          .single()

        if (dbPaper && !error) {
          console.log('Paper found in database:', dbPaper.id)
          setPaper(dbPaper)
          // Generate detailed analysis
          generateDetailedAnalysis(dbPaper)
          // Parse paper structure
          parsePaperStructure(dbPaper)
        } else {
          // Fallback to digest files - try multiple days
          const last7Days = []
          for (let i = 0; i < 7; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            last7Days.push(date.toISOString().split('T')[0])
          }

          let foundPaper = null
          
          for (const date of last7Days) {
            try {
              const response = await fetch(`/static/digests/${date}.json`)
              if (response.ok) {
                const digestData = await response.json()
                foundPaper = digestData.papers.find((p: any) => p.id === params.id)
                if (foundPaper) break
              }
            } catch (e) {
              console.log(`No digest found for ${date}`)
              continue
            }
          }
          
          if (foundPaper) {
            console.log('Paper found in digest files:', foundPaper.id)
            setPaper(foundPaper)
            // Generate detailed analysis
            generateDetailedAnalysis(foundPaper)
            // Parse paper structure
            parsePaperStructure(foundPaper)
          } else {
            console.error(`Paper with ID ${params.id} not found in any digest`)
          }
        }
      } catch (error) {
        console.error('Error fetching paper:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPaper()
  }, [params.id, supabase])

  const generateDetailedAnalysis = async (paperData: Paper) => {
    try {
      setAnalysisLoading(true)
      const response = await fetch('/api/paper/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: paperData.title,
          abstract: paperData.abstract,
          authors: paperData.authors,
          categories: paperData.categories,
          paperId: paperData.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPaper(prev => prev ? {
          ...prev,
          detailed_analysis: data.detailed_analysis
        } : null)
      }
    } catch (error) {
      console.error('Error generating detailed analysis:', error)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const parsePaperStructure = async (paperData: Paper) => {
    try {
      console.log('Starting PDF parsing for paper:', paperData.id)
      setParseLoading(true)
      const response = await fetch('/api/paper/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperId: paperData.id,
          pdfUrl: paperData.pdf_url
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Paper structure parsed:', data)
        setPaperStructure(data)
      } else {
        console.error('Paper parsing failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error parsing paper structure:', error)
    } finally {
      setParseLoading(false)
    }
  }

  useEffect(() => {
    const fetchUserInteraction = async () => {
      if (!user || !paper) return

      const { data, error } = await supabase
        .from('user_papers')
        .select('*')
        .eq('user_id', user.id)
        .eq('paper_id', paper.id)
        .single()

      if (data && !error) {
        setIsBookmarked(data.bookmarked)
        setUserRating(data.rating)
      }
    }

    fetchUserInteraction()
  }, [user, paper, supabase])

  const toggleBookmark = async () => {
    if (!user || !paper) return

    try {
      if (isBookmarked) {
        // Remove bookmark by setting bookmarked to false
        const { error } = await supabase
          .from('user_papers')
          .upsert({
            user_id: user.id,
            paper_id: paper.id,
            bookmarked: false,
            rating: userRating
          }, {
            onConflict: 'user_id,paper_id'
          })

        if (!error) {
          setIsBookmarked(false)
        } else {
          console.error('Error removing bookmark:', error)
        }
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('user_papers')
          .upsert({
            user_id: user.id,
            paper_id: paper.id,
            bookmarked: true,
            rating: userRating
          }, {
            onConflict: 'user_id,paper_id'
          })

        if (!error) {
          setIsBookmarked(true)
        } else {
          console.error('Error adding bookmark:', error)
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
    }
  }

  const setRating = async (rating: number) => {
    if (!user || !paper) return

    try {
      const { error } = await supabase
        .from('user_papers')
        .upsert({
          user_id: user.id,
          paper_id: paper.id,
          bookmarked: isBookmarked,
          rating: rating
        }, {
          onConflict: 'user_id,paper_id'
        })

      if (!error) {
        setUserRating(rating)
      } else {
        console.error('Error setting rating:', error)
      }
    } catch (error) {
      console.error('Error setting rating:', error)
    }
  }

  const formatAuthors = (authors: string[]) => {
    return authors.join(', ')
  }

  const shareOnTwitter = () => {
    const text = `Check out this research paper: ${paper?.title}`
    const url = window.location.href
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
  }

  const shareOnLinkedIn = () => {
    const url = window.location.href
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)
  }

  const shareViaEmail = () => {
    const subject = `Research Paper: ${paper?.title}`
    const body = `I thought you might be interested in this research paper:\n\n${paper?.title}\n\n${window.location.href}`
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading paper details...</p>
        </div>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Paper Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested paper could not be found.
            </p>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-gray-800/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-600" />
                <span className="text-lg font-bold">PaperPulse</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {user && (
                <>
                  <Button variant="ghost" size="sm" onClick={toggleBookmark}>
                    {isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </Button>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setRating(rating)}
                        className="p-1"
                      >
                        <Star 
                          className={`w-4 h-4 ${
                            userRating && rating <= userRating 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
              
              {/* Share dropdown */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={shareOnTwitter}>
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={shareOnLinkedIn}>
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={shareViaEmail}>
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Paper Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            {paper.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{formatAuthors(paper.authors)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(paper.published).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span>{paper.id}</span>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-6">
            {paper.categories.map(category => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => window.open(paper.url, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View on arXiv
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open(paper.pdf_url, '_blank')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* AI Analysis Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${analysisLoading ? 'bg-purple-600 animate-pulse' : 'bg-green-600'}`}></div>
              AI-Powered Paper Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive analysis generated by Llama 3.1 via Groq API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysisLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-4"></div>
                <span className="text-muted-foreground">Generating detailed analysis...</span>
              </div>
            ) : paper.detailed_analysis ? (
              <>
              {/* Executive Summary */}
              <div>
                <h3 className="font-semibold mb-2">Executive Summary</h3>
                <p className="text-muted-foreground">
                  {paper.detailed_analysis.executive_summary}
                </p>
              </div>

              {/* Key Contributions */}
              <div>
                <h3 className="font-semibold mb-2">Key Contributions</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {paper.detailed_analysis.key_contributions.map((contribution, index) => (
                    <li key={index}>{contribution}</li>
                  ))}
                </ul>
              </div>

              {/* Methodology */}
              <div>
                <h3 className="font-semibold mb-2">Methodology</h3>
                <p className="text-muted-foreground">
                  {paper.detailed_analysis.methodology}
                </p>
              </div>

              {/* Results */}
              <div>
                <h3 className="font-semibold mb-2">Results & Findings</h3>
                <p className="text-muted-foreground">
                  {paper.detailed_analysis.results}
                </p>
              </div>

              {/* Technical Approach */}
              <div>
                <h3 className="font-semibold mb-2">Technical Approach</h3>
                <p className="text-muted-foreground">
                  {paper.detailed_analysis.technical_approach}
                </p>
              </div>

              {/* Significance */}
              <div>
                <h3 className="font-semibold mb-2">Significance & Impact</h3>
                <p className="text-muted-foreground">
                  {paper.detailed_analysis.significance}
                </p>
              </div>

              {/* Limitations */}
              <div>
                <h3 className="font-semibold mb-2">Limitations & Future Work</h3>
                <p className="text-muted-foreground">
                  {paper.detailed_analysis.limitations}
                </p>
              </div>

              {/* Technical Difficulty */}
              <div>
                <h3 className="font-semibold mb-2">Technical Difficulty</h3>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-3 h-3 rounded-full ${
                          level <= paper.detailed_analysis!.technical_difficulty
                            ? 'bg-purple-600'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {paper.detailed_analysis.technical_difficulty}/5
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {paper.detailed_analysis.technical_difficulty <= 2 ? 'Beginner' :
                     paper.detailed_analysis.technical_difficulty <= 3 ? 'Intermediate' :
                     paper.detailed_analysis.technical_difficulty <= 4 ? 'Advanced' : 'Expert'}
                  </span>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <h3 className="font-semibold mb-2">Target Audience</h3>
                <p className="text-muted-foreground">
                  {paper.detailed_analysis.target_audience}
                </p>
              </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Detailed analysis not available.</p>
                <Button 
                  onClick={() => generateDetailedAnalysis(paper)}
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  Generate Analysis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abstract Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Abstract</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground">
              {paper.abstract}
            </p>
          </CardContent>
        </Card>

        {/* Figures & Tables */}
        <div className="mb-8">
          <PaperFigures 
            paperId={paper.id} 
            figures={paperStructure?.figures}
            loading={parseLoading}
          />
        </div>

        {/* Quick Summary */}
        {paper.summary && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
              <CardDescription>
                AI-generated summary for quick reading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted-foreground">
                {paper.summary}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 