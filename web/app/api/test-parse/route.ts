import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { paperId } = await request.json()
    
    console.log(`Test parsing for ${paperId}`)
    
    const sections = [
      {
        id: 'abstract',
        title: 'Abstract',
        content: 'This paper presents a comprehensive study addressing key challenges in the field.',
        reading_time: 1
      },
      {
        id: 'introduction',
        title: '1. Introduction',
        content: 'The introduction establishes the research context and motivation.',
        reading_time: 3
      }
    ]
    
    const figures = [
      {
        id: 'fig1',
        title: 'Figure 1: System Overview',
        description: 'High-level architecture diagram.',
        type: 'diagram'
      }
    ]
    
    return NextResponse.json({
      success: true,
      sections,
      figures,
      extraction_method: 'test-generation',
      total_pages: 10
    })
    
  } catch (error) {
    console.error('Error in test parser:', error)
    return NextResponse.json(
      { error: 'Failed to parse paper' },
      { status: 500 }
    )
  }
}