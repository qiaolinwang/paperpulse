import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pdfUrl = searchParams.get('url')
  
  if (!pdfUrl) {
    return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 })
  }

  try {
    console.log('Generating simple PDF screenshot for:', pdfUrl)
    
    // Use simple screenshot services that work with PDFs
    const screenshotMethods = [
      // Method 1: Use webpage screenshot of PDF.js viewer
      {
        name: 'PDF.js Viewer Screenshot',
        url: `https://api.screenshotmachine.com/?key=demo&url=${encodeURIComponent(`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`)}&dimension=800x1000&format=png&cacheLimit=0`
      },
      
      // Method 2: Direct PDF URL with screenshot service
      {
        name: 'Direct PDF Screenshot', 
        url: `https://api.screenshotmachine.com/?key=demo&url=${encodeURIComponent(pdfUrl)}&dimension=800x1000&format=png&cacheLimit=0`
      },
      
      // Method 3: Use htmlcsstoimage demo
      {
        name: 'HTMLCSStoImage',
        url: `https://htmlcsstoimage.com/demo_run?url=${encodeURIComponent(pdfUrl)}&width=800&height=1000&selector=body`
      },
      
      // Method 4: Use URL2PNG service
      {
        name: 'URL2PNG',
        url: `https://api.url2png.com/v6/P4DE7A4471A41E/a32a5b62e4c4aa8e8bb40040b4fe7b07/png/?url=${encodeURIComponent(pdfUrl)}&width=800&height=1000`
      }
    ]

    for (const method of screenshotMethods) {
      try {
        console.log(`Trying ${method.name}...`)
        
        const response = await fetch(method.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        
        if (response.ok) {
          const contentType = response.headers.get('content-type')
          console.log(`${method.name} response type:`, contentType)
          
          if (contentType?.includes('image')) {
            console.log(`Success with ${method.name}`)
            return NextResponse.json({ 
              thumbnailUrl: method.url,
              success: true,
              method: method.name
            })
          }
        } else {
          console.log(`${method.name} failed with status:`, response.status)
        }
      } catch (error) {
        console.log(`${method.name} failed:`, error)
        continue
      }
    }

    // If all screenshot methods fail, generate a PDF-like image
    const fallbackImageUrl = await generatePDFLikeImage(pdfUrl)
    
    return NextResponse.json({ 
      thumbnailUrl: fallbackImageUrl,
      success: true,
      method: 'pdf-like-fallback'
    })
    
  } catch (error) {
    console.error('Simple PDF screenshot failed:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF screenshot',
      success: false
    }, { status: 500 })
  }
}

async function generatePDFLikeImage(pdfUrl: string): Promise<string> {
  // Extract paper ID for better placeholder
  const paperId = pdfUrl.match(/arxiv\.org\/pdf\/([^/\s]+)/i)?.[1] || 'unknown'
  
  // Generate a data URL that looks like a PDF page
  const svg = `
    <svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg" style="background: white; font-family: 'Times New Roman', serif;">
      <!-- Paper background -->
      <rect width="800" height="1000" fill="white" stroke="#e0e0e0" stroke-width="2"/>
      
      <!-- Header area -->
      <rect x="0" y="0" width="800" height="60" fill="#f8f9fa"/>
      <text x="50" y="25" style="font: 14px Arial; fill: #666;">arXiv:${paperId}</text>
      <text x="50" y="45" style="font: 12px Arial; fill: #999;">[cs.AI] Research Paper</text>
      
      <!-- Title area -->
      <rect x="80" y="100" width="640" height="60" fill="none"/>
      <text x="400" y="130" text-anchor="middle" style="font: bold 22px 'Times New Roman'; fill: #000;">Research Paper Title</text>
      <text x="400" y="150" text-anchor="middle" style="font: 18px 'Times New Roman'; fill: #333;">Authors et al.</text>
      
      <!-- Abstract section -->
      <text x="80" y="200" style="font: bold 16px 'Times New Roman'; fill: #000;">Abstract</text>
      <line x1="80" y1="210" x2="720" y2="210" stroke="#000" stroke-width="1"/>
      
      <!-- Abstract text lines -->
      <rect x="80" y="220" width="640" height="8" fill="#f0f0f0"/>
      <rect x="80" y="235" width="620" height="8" fill="#f0f0f0"/>
      <rect x="80" y="250" width="640" height="8" fill="#f0f0f0"/>
      <rect x="80" y="265" width="580" height="8" fill="#f0f0f0"/>
      
      <!-- Introduction section -->
      <text x="80" y="310" style="font: bold 16px 'Times New Roman'; fill: #000;">1. Introduction</text>
      <line x1="80" y1="320" x2="720" y2="320" stroke="#000" stroke-width="1"/>
      
      <!-- Content lines -->
      <rect x="80" y="330" width="640" height="6" fill="#f5f5f5"/>
      <rect x="80" y="345" width="600" height="6" fill="#f5f5f5"/>
      <rect x="80" y="360" width="640" height="6" fill="#f5f5f5"/>
      <rect x="80" y="375" width="580" height="6" fill="#f5f5f5"/>
      <rect x="80" y="390" width="620" height="6" fill="#f5f5f5"/>
      
      <!-- Figure placeholder -->
      <rect x="250" y="430" width="300" height="200" fill="none" stroke="#666" stroke-width="2"/>
      <text x="400" y="540" text-anchor="middle" style="font: 14px 'Times New Roman'; fill: #666;">Figure 1: Model Architecture</text>
      
      <!-- More sections -->
      <text x="80" y="680" style="font: bold 16px 'Times New Roman'; fill: #000;">2. Methodology</text>
      <line x1="80" y1="690" x2="720" y2="690" stroke="#000" stroke-width="1"/>
      
      <rect x="80" y="700" width="640" height="6" fill="#f5f5f5"/>
      <rect x="80" y="715" width="580" height="6" fill="#f5f5f5"/>
      <rect x="80" y="730" width="640" height="6" fill="#f5f5f5"/>
      
      <!-- Equation -->
      <text x="400" y="760" text-anchor="middle" style="font: 16px 'Times New Roman'; font-style: italic; fill: #000;">L = -∑ log P(y|x; θ)</text>
      <text x="680" y="760" style="font: 14px 'Times New Roman'; fill: #000;">(1)</text>
      
      <!-- More content -->
      <rect x="80" y="780" width="640" height="6" fill="#f5f5f5"/>
      <rect x="80" y="795" width="600" height="6" fill="#f5f5f5"/>
      <rect x="80" y="810" width="620" height="6" fill="#f5f5f5"/>
      
      <!-- Footer -->
      <line x1="80" y1="920" x2="720" y2="920" stroke="#000" stroke-width="1"/>
      <text x="400" y="940" text-anchor="middle" style="font: 12px 'Times New Roman'; fill: #666;">1</text>
      
      <!-- PDF viewer chrome -->
      <rect x="0" y="0" width="800" height="25" fill="#2d3748" opacity="0.1"/>
      <text x="10" y="18" style="font: 11px Arial; fill: #666;">PDF Preview - ${pdfUrl}</text>
    </svg>
  `
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}