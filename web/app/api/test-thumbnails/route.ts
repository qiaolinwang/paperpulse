import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const testPaper = {
    id: '2506.17218v1',
    pdf_url: 'https://arxiv.org/pdf/2506.17218v1.pdf'
  }

  try {
    const results = []
    
    // Test all our thumbnail methods
    const methods = [
      { name: 'V2 Method', endpoint: '/api/pdf-thumbnail-v2' },
      { name: 'Server Method', endpoint: '/api/pdf-thumbnail-server' },
      { name: 'Original Method', endpoint: '/api/pdf-thumbnail' }
    ]
    
    for (const method of methods) {
      try {
        console.log(`Testing ${method.name}...`)
        
        const url = `${request.nextUrl.origin}${method.endpoint}?url=${encodeURIComponent(testPaper.pdf_url)}`
        const response = await fetch(url)
        const data = await response.json()
        
        results.push({
          method: method.name,
          endpoint: method.endpoint,
          success: data.success || false,
          thumbnailUrl: data.thumbnailUrl || null,
          error: data.error || null,
          cached: data.cached || false,
          generated: data.generated || false
        })
        
        console.log(`${method.name} result:`, data.success ? 'SUCCESS' : 'FAILED')
        
      } catch (error) {
        results.push({
          method: method.name,
          endpoint: method.endpoint,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      testPaper,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })
    
  } catch (error) {
    console.error('Thumbnail testing error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}