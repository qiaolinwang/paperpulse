import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { limit = 10 } = await request.json()
    
    const supabase = createClient()

    // 获取没有缩略图或缩略图过期的论文
    const { data: papers, error: fetchError } = await supabase
      .from('papers')
      .select('id, pdf_url, title')
      .or(`thumbnail_url.is.null,thumbnail_generated_at.lt.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`)
      .limit(limit)

    if (fetchError) {
      console.error('Database fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch papers' }, { status: 500 })
    }

    console.log(`Processing ${papers?.length || 0} papers for thumbnail generation`)

    const results = []
    
    for (const paper of papers || []) {
      try {
        // 为每篇论文生成缩略图
        const response = await fetch(`${request.nextUrl.origin}/api/pdf-thumbnail?url=${encodeURIComponent(paper.pdf_url)}`, {
          method: 'GET'
        })
        
        const result = await response.json()
        
        results.push({
          paperId: paper.id,
          title: paper.title,
          success: result.success,
          thumbnailUrl: result.thumbnailUrl,
          cached: result.cached,
          generated: result.generated
        })
        
        console.log(`Processed paper ${paper.id}: ${result.success ? 'SUCCESS' : 'FAILED'}`)
        
        // 添加小延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`Failed to process paper ${paper.id}:`, error)
        results.push({
          paperId: paper.id,
          title: paper.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({ 
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results
    })

  } catch (error) {
    console.error('Batch thumbnail generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate thumbnails',
      success: false
    }, { status: 500 })
  }
} 