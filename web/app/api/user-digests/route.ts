import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const days = parseInt(searchParams.get('days') || '7')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get user's digest history
    const { data: digestHistory, error: digestError } = await supabase
      .from('user_digests')
      .select('*')
      .eq('email', email)
      .gte('date', startDateStr)
      .order('date', { ascending: false })

    if (digestError) {
      console.error('Error fetching user digests:', digestError)
      return NextResponse.json({ error: 'Failed to fetch user digests' }, { status: 500 })
    }

    // Get all unique paper IDs from user's digests
    const allPaperIds = new Set<string>()
    digestHistory.forEach(digest => {
      if (digest.papers && Array.isArray(digest.papers)) {
        digest.papers.forEach((paperId: string) => allPaperIds.add(paperId))
      }
    })

    // Fetch paper details for all paper IDs
    const { data: papers, error: papersError } = await supabase
      .from('papers')
      .select('*')
      .in('id', Array.from(allPaperIds))

    if (papersError) {
      console.error('Error fetching papers:', papersError)
      return NextResponse.json({ error: 'Failed to fetch papers' }, { status: 500 })
    }

    // Create a map of paper ID to paper data
    const paperMap = new Map()
    papers?.forEach(paper => {
      paperMap.set(paper.id, paper)
    })

    // Build response with papers organized by date
    const userDigests = digestHistory.map(digest => ({
      date: digest.date,
      keywords: digest.keywords,
      papers_count: digest.papers_count,
      sent_at: digest.sent_at,
      success: digest.success,
      papers: digest.papers?.map((paperId: string) => paperMap.get(paperId)).filter(Boolean) || []
    }))

    return NextResponse.json({
      success: true,
      data: userDigests
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 