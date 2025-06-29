import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pdfUrl = searchParams.get('url')
  
  if (!pdfUrl) {
    return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 })
  }

  try {
    // Return a special response that triggers client-side PDF rendering
    return NextResponse.json({ 
      renderClientSide: true,
      pdfUrl: pdfUrl,
      success: true,
      method: 'client-side-pdf-render'
    })
    
  } catch (error) {
    console.error('PDF canvas render setup failed:', error)
    return NextResponse.json({ 
      error: 'Failed to setup PDF canvas rendering',
      success: false
    }, { status: 500 })
  }
}