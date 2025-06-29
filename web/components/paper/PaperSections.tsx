'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, ChevronRight, Clock, Users } from 'lucide-react'
import { useState } from 'react'

interface Section {
  id: string
  title: string
  content: string
  subsections?: Section[]
  readingTime?: number
  reading_time?: number // Support both formats
}

interface PaperSectionsProps {
  paperId: string
  sections?: Section[]
  loading?: boolean
}

export default function PaperSections({ paperId, sections, loading }: PaperSectionsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['intro']))
  
  // Debug logging
  console.log('PaperSections received:', { paperId, sections, loading })
  
  // Generate sections dynamically based on paper content
  const generateSectionsFromPaper = (paperId: string) => {
    // This should be replaced with actual section extraction logic
    // For now, return generic academic paper structure
    return [
      {
        id: 'intro',
        title: '1. Introduction',
        content: 'This section introduces the research problem, motivation, and contributions of the work. The authors establish the context and significance of their study.',
        readingTime: 3
      },
    {
      id: 'related',
      title: '2. Related Work',
      content: 'This section reviews relevant literature and positions the current work within the broader research context. The authors discuss existing approaches and identify gaps that their work addresses.',
      readingTime: 5
    },
    {
      id: 'method',
      title: '3. Methodology',
      content: 'The authors describe their experimental design, data collection procedures, and analytical methods. This section details the technical approach used to address the research questions.',
      readingTime: 8
    },
    {
      id: 'experiments',
      title: '4. Experiments',
      content: 'This section presents the experimental setup, evaluation metrics, and baseline comparisons. The authors describe how they validate their approach and measure performance.',
      readingTime: 6
    },
    {
      id: 'results',
      title: '5. Results',
      content: 'The key findings are presented with statistical analysis and performance metrics. The authors discuss the effectiveness of their approach compared to existing methods.',
      readingTime: 4
    },
    {
      id: 'conclusion',
      title: '6. Conclusion',
      content: 'The authors summarize their contributions, discuss limitations, and suggest directions for future work. Key insights and practical implications are highlighted.',
      readingTime: 2
    }
  ]
  }

  const displaySections = sections && sections.length > 0 ? sections : generateSectionsFromPaper(paperId)
  
  // Debug which sections we're using
  console.log('Using sections:', displaySections.length > 0 && sections ? 'API parsed' : 'fallback generated')

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const getTotalReadingTime = () => {
    return displaySections.reduce((total, section) => {
      const readingTime = 'readingTime' in section ? section.readingTime : section.reading_time
      return total + (readingTime || 0)
    }, 0)
  }

  const renderSection = (section: Section, level: number = 0) => {
    const isExpanded = expandedSections.has(section.id)
    const paddingClass = level > 0 ? 'ml-4' : ''
    
    return (
      <div key={section.id} className={paddingClass}>
        <div 
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer border mb-2"
          onClick={() => toggleSection(section.id)}
        >
          <div className="flex items-center gap-3">
            <ChevronRight 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            <div>
              <h4 className="font-medium">{section.title}</h4>
              {(section.readingTime || section.reading_time) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{section.readingTime || section.reading_time} min read</span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {level === 0 ? 'Section' : 'Subsection'}
          </Badge>
        </div>
        
        {isExpanded && (
          <div className="ml-7 mb-4">
            <p className="text-muted-foreground leading-relaxed mb-3">
              {section.content}
            </p>
            
            {section.subsections && section.subsections.map(subsection => 
              renderSection(subsection, level + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Paper Sections
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>~{getTotalReadingTime()} min total read</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{displaySections.length} main sections</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-4"></div>
              <span className="text-muted-foreground">Extracting paper sections from PDF...</span>
            </div>
          ) : (
            <>
              {displaySections.map(section => renderSection(section))}
              
              <div className="text-center text-sm text-muted-foreground pt-6 border-t">
                <p>📖 {sections ? 'Extracted' : 'Generic'} section-by-section breakdown</p>
                <p className="text-xs mt-1">
                  {sections 
                    ? 'Sections extracted from PDF analysis' 
                    : 'Click on any section to expand and read the summary'
                  }
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Read Full Paper
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}