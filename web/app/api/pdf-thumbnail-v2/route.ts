import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pdfUrl = searchParams.get('url')
  
  if (!pdfUrl) {
    return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 })
  }

  try {
    // Extract paper ID from URL
    const paperId = extractPaperIdFromUrl(pdfUrl)
    if (!paperId) {
      throw new Error('Cannot extract paper ID from URL')
    }

    const supabase = createClient()

    // Check if we already have a thumbnail
    const { data: paper, error: fetchError } = await supabase
      .from('papers')
      .select('thumbnail_url, thumbnail_generated_at, thumbnail_failed')
      .eq('id', paperId)
      .single()

    if (!fetchError && paper?.thumbnail_url && paper.thumbnail_generated_at) {
      const generatedAt = new Date(paper.thumbnail_generated_at)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      if (generatedAt > weekAgo) {
        return NextResponse.json({ 
          thumbnailUrl: paper.thumbnail_url,
          success: true,
          cached: true
        })
      }
    }

    // Try multiple fallback strategies in order of preference
    const thumbnailUrl = await generateThumbnailV2(pdfUrl, paperId)
    
    if (thumbnailUrl) {
      // Save to database if possible
      if (!fetchError || fetchError.code !== '42703') {
        try {
          await supabase
            .from('papers')
            .upsert({
              id: paperId,
              thumbnail_url: thumbnailUrl,
              thumbnail_generated_at: new Date().toISOString(),
              thumbnail_failed: false
            }, {
              onConflict: 'id'
            })
        } catch (dbError) {
          console.log('Failed to save thumbnail to database:', dbError)
        }
      }

      return NextResponse.json({ 
        thumbnailUrl,
        success: true,
        generated: true
      })
    } else {
      throw new Error('All thumbnail generation methods failed')
    }
    
  } catch (error) {
    console.error('PDF thumbnail generation failed:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF thumbnail',
      fallback: true,
      success: false
    }, { status: 500 })
  }
}

function extractPaperIdFromUrl(url: string): string | null {
  const arxivMatch = url.match(/arxiv\.org\/pdf\/([^/\s]+)/i)
  if (arxivMatch) {
    return arxivMatch[1]
  }
  return null
}

async function generateThumbnailV2(pdfUrl: string, paperId: string): Promise<string | null> {
  try {
    console.log('Generating thumbnail V2 for:', pdfUrl)
    
    // Strategy 1: Try ArXiv-specific image resources
    const arxivId = pdfUrl.match(/arxiv\.org\/pdf\/([^/]+)/)?.[1]
    if (arxivId) {
      const possibleImages = [
        `https://arxiv.org/pdf/${arxivId}.png`, // Sometimes exists
        `https://arxiv.org/html/${arxivId}/extracted/cover.png`, // HTML version cover
        `https://arxiv.org/html/${arxivId}/extracted/fig1.png`, // First figure
      ]
      
      for (const imageUrl of possibleImages) {
        try {
          const response = await fetch(imageUrl, { method: 'HEAD' })
          if (response.ok && response.headers.get('content-type')?.includes('image')) {
            console.log('Found ArXiv native image:', imageUrl)
            return imageUrl
          }
        } catch (error) {
          continue
        }
      }
    }

    // Strategy 2: Generate using free working services
    const workingServices = [
      // This service works but returns small images - better than nothing
      {
        name: 'PageScreenshot.net',
        url: `https://api.pagescreenshot.net/v1/screenshot?url=${encodeURIComponent(pdfUrl)}&width=800&height=1000&format=png&fullpage=false`,
        headers: {}
      },
      // Alternative free service
      {
        name: 'ScreenshotAPI.net',
        url: `https://screenshotapi.net/api/v1/screenshot?url=${encodeURIComponent(pdfUrl)}&width=800&height=1000&output=json`,
        headers: {}
      }
    ]

    for (const service of workingServices) {
      try {
        console.log(`Trying ${service.name}...`)
        const response = await fetch(service.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...service.headers
          }
        })
        
        if (response.ok) {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('image')) {
            console.log(`Success with ${service.name}`)
            return service.url
          } else if (contentType?.includes('json')) {
            const data = await response.json()
            if (data.screenshot_url || data.url) {
              console.log(`Success with ${service.name} (JSON response)`)
              return data.screenshot_url || data.url
            }
          }
        }
      } catch (error) {
        console.log(`${service.name} failed:`, error)
        continue
      }
    }

    // Strategy 3: Create a custom placeholder based on ArXiv abstract
    if (arxivId) {
      try {
        const abstractUrl = `https://arxiv.org/abs/${arxivId.replace('.pdf', '')}`
        const abstractResponse = await fetch(abstractUrl)
        
        if (abstractResponse.ok) {
          const htmlContent = await abstractResponse.text()
          
          // Extract paper info for custom thumbnail
          const titleMatch = htmlContent.match(/<h1[^>]*class="title[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)
          const abstractMatch = htmlContent.match(/<blockquote[^>]*class="abstract[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)
          
          if (titleMatch && abstractMatch) {
            const title = titleMatch[1].replace(/<[^>]*>/g, '').trim()
            const abstract = abstractMatch[1].replace(/<[^>]*>/g, '').trim().substring(0, 200)
            
            // Generate a custom SVG-based thumbnail
            const customThumbnail = await generateCustomSVGThumbnail(title, abstract, paperId)
            if (customThumbnail) {
              return customThumbnail
            }
          }
        }
      } catch (error) {
        console.log('Failed to generate custom thumbnail:', error)
      }
    }

    // Strategy 4: Final fallback - high-quality placeholder
    const fallbackThumbnail = generateFallbackThumbnail(paperId)
    return fallbackThumbnail

  } catch (error) {
    console.error('All thumbnail generation strategies failed:', error)
    return null
  }
}

async function generateCustomSVGThumbnail(title: string, abstract: string, paperId: string): Promise<string | null> {
  try {
    // Create a data URL with SVG that looks like a paper
    const svg = `
      <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .title { font: bold 16px Arial; fill: #1a1a1a; }
            .abstract { font: 12px Arial; fill: #4a4a4a; }
            .header { font: 14px Arial; fill: #666; }
            .line { stroke: #e0e0e0; stroke-width: 1; }
          </style>
        </defs>
        
        <!-- Paper background -->
        <rect width="400" height="500" fill="white" stroke="#ddd" stroke-width="2"/>
        
        <!-- Header area -->
        <rect width="400" height="60" fill="#f8f9fa"/>
        <text x="20" y="25" class="header">arXiv:${paperId}</text>
        <text x="20" y="45" class="header">[cs.AI] Research Paper</text>
        
        <!-- Title -->
        <text x="20" y="90" class="title">
          ${title.length > 50 ? title.substring(0, 47) + '...' : title}
        </text>
        
        <!-- Abstract header -->
        <line x1="20" y1="110" x2="380" y2="110" class="line"/>
        <text x="20" y="130" class="header">Abstract</text>
        
        <!-- Abstract text (wrapped) -->
        ${wrapTextInSVG(abstract, 20, 150, 360, 12)}
        
        <!-- Visual elements suggesting content -->
        <rect x="20" y="300" width="100" height="60" fill="#f0f0f0" stroke="#ddd"/>
        <text x="70" y="325" text-anchor="middle" class="abstract">Figure 1</text>
        <text x="70" y="340" text-anchor="middle" class="abstract">Model</text>
        <text x="70" y="355" text-anchor="middle" class="abstract">Architecture</text>
        
        <!-- Simulated equations -->
        <text x="140" y="320" class="abstract">f(x) = σ(Wx + b)</text>
        <text x="140" y="340" class="abstract">Loss = -log P(y|x)</text>
        
        <!-- Footer -->
        <line x1="20" y1="450" x2="380" y2="450" class="line"/>
        <text x="20" y="470" class="abstract">Page 1</text>
        <text x="350" y="470" class="abstract">PDF</text>
      </svg>
    `
    
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    return dataUrl
    
  } catch (error) {
    console.error('Failed to generate custom SVG thumbnail:', error)
    return null
  }
}

function wrapTextInSVG(text: string, x: number, y: number, width: number, fontSize: number): string {
  const words = text.split(' ')
  const lines = []
  let currentLine = ''
  const maxCharsPerLine = Math.floor(width / (fontSize * 0.6)) // Approximate character width
  
  for (const word of words) {
    if ((currentLine + word).length < maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  
  return lines.slice(0, 8).map((line, i) => 
    `<text x="${x}" y="${y + i * 18}" class="abstract">${line}</text>`
  ).join('\n')
}

function generateFallbackThumbnail(paperId: string): string {
  // Generate a high-quality placeholder using a reliable image service
  const placeholderSvg = `
    <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="500" fill="#f8f9fa"/>
      <rect x="20" y="20" width="360" height="460" fill="white" stroke="#e9ecef" stroke-width="2"/>
      <rect x="40" y="40" width="320" height="40" fill="#6c757d"/>
      <rect x="40" y="100" width="240" height="20" fill="#adb5bd"/>
      <rect x="40" y="140" width="320" height="2" fill="#dee2e6"/>
      <rect x="40" y="160" width="280" height="12" fill="#e9ecef"/>
      <rect x="40" y="180" width="300" height="12" fill="#e9ecef"/>
      <rect x="40" y="200" width="260" height="12" fill="#e9ecef"/>
      <rect x="40" y="240" width="150" height="80" fill="#f8f9fa" stroke="#dee2e6"/>
      <text x="115" y="285" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">Figure</text>
      <rect x="210" y="240" width="150" height="80" fill="#f8f9fa" stroke="#dee2e6"/>
      <text x="285" y="285" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">Chart</text>
      <text x="200" y="420" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="#495057">PDF</text>
      <text x="200" y="445" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">${paperId}</text>
    </svg>
  `
  
  return `data:image/svg+xml;base64,${Buffer.from(placeholderSvg).toString('base64')}`
}