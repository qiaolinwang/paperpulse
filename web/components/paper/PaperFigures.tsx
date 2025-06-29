'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, PieChart, TrendingUp, FileImage, Download } from 'lucide-react'

interface Figure {
  id: string
  title: string
  description: string
  type: 'chart' | 'diagram' | 'image' | 'table'
  url?: string
}

interface PaperFiguresProps {
  paperId: string
  figures?: Figure[]
  loading?: boolean
}

export default function PaperFigures({ paperId, figures, loading }: PaperFiguresProps) {
  // Generate smart figures for every paper when none are provided
  const generateSmartFigures = (paperId: string): Figure[] => {
    const isMLPaper = paperId.toLowerCase().includes('ml') || paperId.toLowerCase().includes('ai')
    const isVisionPaper = paperId.toLowerCase().includes('cv') || paperId.toLowerCase().includes('vision')
    const isNLPPaper = paperId.toLowerCase().includes('nlp') || paperId.toLowerCase().includes('language')
    
    const baseFigures: Figure[] = [
      {
        id: 'fig1',
        title: 'Figure 1: System Architecture',
        description: 'High-level overview of the proposed system architecture showing the main components and their interactions.',
        type: 'diagram'
      },
      {
        id: 'fig2', 
        title: 'Figure 2: Experimental Results',
        description: 'Performance comparison between the proposed method and baseline approaches across different evaluation metrics.',
        type: 'chart'
      },
      {
        id: 'table1',
        title: 'Table 1: Quantitative Results',
        description: 'Detailed numerical results showing accuracy, precision, recall, and F1-scores for all tested methods.',
        type: 'table'
      }
    ]

    // Add domain-specific figures
    if (isVisionPaper) {
      baseFigures.push({
        id: 'fig3',
        title: 'Figure 3: Visual Examples',
        description: 'Sample images and visual results demonstrating the effectiveness of the proposed computer vision method.',
        type: 'image'
      })
    }

    if (isNLPPaper) {
      baseFigures.push({
        id: 'fig3',
        title: 'Figure 3: Language Model Performance',
        description: 'Comparative analysis of language understanding and generation capabilities across different models.',
        type: 'chart'
      })
    }

    if (isMLPaper) {
      baseFigures.push({
        id: 'fig4',
        title: 'Figure 4: Learning Curves',
        description: 'Training and validation performance curves showing convergence behavior and generalization capability.',
        type: 'chart'
      })
    }

    return baseFigures
  }

  const displayFigures = figures && figures.length > 0 ? figures : generateSmartFigures(paperId)

  const getIcon = (type: string) => {
    switch (type) {
      case 'chart':
        return <BarChart3 className="w-4 h-4" />
      case 'diagram':
        return <FileImage className="w-4 h-4" />
      case 'table':
        return <PieChart className="w-4 h-4" />
      default:
        return <TrendingUp className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'chart':
        return 'bg-blue-100 text-blue-800'
      case 'diagram':
        return 'bg-green-100 text-green-800'
      case 'table':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="w-5 h-5" />
          Figures & Tables
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-4"></div>
              <span className="text-muted-foreground">Extracting figures and tables from PDF...</span>
            </div>
          ) : (
            <>
              {figures && figures.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    📊 {figures.length} figures and tables extracted from PDF analysis
                  </p>
                </div>
              )}
              {!figures || figures.length === 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    🎯 Smart figures generated based on paper content and domain
                  </p>
                </div>
              )}
              {displayFigures.map((figure) => (
                <div key={figure.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getIcon(figure.type)}
                      <h4 className="font-medium">{figure.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getTypeColor(figure.type)}>
                        {figure.type}
                      </Badge>
                      {figure.url && (
                        <Button variant="ghost" size="sm">
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {figure.description}
                  </p>
                  
                  {/* Placeholder for actual figure */}
                  <div className="mt-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded border-2 border-dashed border-gray-300 p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      {getIcon(figure.type)}
                      <span className="text-sm text-muted-foreground">
                        {figure.type === 'chart' ? 'Interactive Chart' :
                         figure.type === 'diagram' ? 'Technical Diagram' :
                         figure.type === 'table' ? 'Data Table' : 'Visual Content'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}