import { NextRequest, NextResponse } from 'next/server'

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

    // Try different PDF-to-image conversion services
    const thumbnailUrl = await generatePDFScreenshot(pdfUrl, paperId)
    
    if (thumbnailUrl) {
      return NextResponse.json({ 
        thumbnailUrl,
        success: true,
        method: 'pdf-screenshot'
      })
    } else {
      throw new Error('PDF screenshot generation failed')
    }
    
  } catch (error) {
    console.error('PDF to image conversion failed:', error)
    return NextResponse.json({ 
      error: 'Failed to convert PDF to image',
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

async function generatePDFScreenshot(pdfUrl: string, paperId: string): Promise<string | null> {
  try {
    console.log('Generating PDF screenshot for:', pdfUrl)
    
    // Method 1: Use PDFtoPNG service
    try {
      const pdftopngUrl = `https://api.pdftopng.com/v1/convert?url=${encodeURIComponent(pdfUrl)}&page=1&width=800`
      const response = await fetch(pdftopngUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.image_url) {
          console.log('Success with PDFtoPNG service')
          return data.image_url
        }
      }
    } catch (error) {
      console.log('PDFtoPNG service failed:', error)
    }

    // Method 2: Use PDF.co API (requires API key but has free tier)
    try {
      const pdfcoUrl = `https://api.pdf.co/v1/pdf/convert/to/png`
      const response = await fetch(pdfcoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.PDFCO_API_KEY || 'demo'
        },
        body: JSON.stringify({
          url: pdfUrl,
          pages: '0',
          inline: true,
          async: false
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.urls && data.urls[0]) {
          console.log('Success with PDF.co service')
          return data.urls[0]
        }
      }
    } catch (error) {
      console.log('PDF.co service failed:', error)
    }

    // Method 3: Use ConvertAPI (has free tier)
    try {
      const convertApiUrl = `https://v2.convertapi.com/convert/pdf/to/png?Secret=${process.env.CONVERTAPI_SECRET || 'demo'}&Url=${encodeURIComponent(pdfUrl)}&PageRange=1&ImageResolution=150`
      const response = await fetch(convertApiUrl, {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.Files && data.Files[0] && data.Files[0].Url) {
          console.log('Success with ConvertAPI')
          return data.Files[0].Url
        }
      }
    } catch (error) {
      console.log('ConvertAPI failed:', error)
    }

    // Method 4: Use CloudConvert API
    try {
      // CloudConvert requires more complex authentication, but has a generous free tier
      const cloudConvertUrl = 'https://api.cloudconvert.com/v2/jobs'
      const apiKey = process.env.CLOUDCONVERT_API_KEY
      
      if (apiKey) {
        const jobResponse = await fetch(cloudConvertUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tasks: {
              'import-pdf': {
                operation: 'import/url',
                url: pdfUrl
              },
              'convert-to-png': {
                operation: 'convert',
                input: 'import-pdf',
                output_format: 'png',
                pages: '1',
                width: 800
              },
              'export-png': {
                operation: 'export/url',
                input: 'convert-to-png'
              }
            }
          })
        })
        
        if (jobResponse.ok) {
          const jobData = await jobResponse.json()
          // Wait for job completion and get export URL
          // This is simplified - in production you'd poll the job status
          if (jobData.data && jobData.data.tasks) {
            const exportTask = jobData.data.tasks.find((t: any) => t.name === 'export-png')
            if (exportTask && exportTask.result && exportTask.result.files && exportTask.result.files[0]) {
              console.log('Success with CloudConvert')
              return exportTask.result.files[0].url
            }
          }
        }
      }
    } catch (error) {
      console.log('CloudConvert failed:', error)
    }

    // Method 5: Use Documind API (PDF processing service)
    try {
      const documindUrl = 'https://api.documind.com/v1/pdf/screenshot'
      const response = await fetch(documindUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DOCUMIND_API_KEY || 'demo'}`
        },
        body: JSON.stringify({
          pdf_url: pdfUrl,
          page: 1,
          width: 800,
          format: 'png'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.screenshot_url) {
          console.log('Success with Documind')
          return data.screenshot_url
        }
      }
    } catch (error) {
      console.log('Documind failed:', error)
    }

    // Method 6: Use a proxy service that renders PDFs
    try {
      // This uses a public PDF viewer that can render pages
      const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`
      const screenshotUrl = `https://image.thum.io/get/width/800/crop/1000/pdf/${encodeURIComponent(viewerUrl)}`
      
      // Test if this works
      const testResponse = await fetch(screenshotUrl, { method: 'HEAD' })
      if (testResponse.ok) {
        console.log('Success with PDF.js viewer screenshot')
        return screenshotUrl
      }
    } catch (error) {
      console.log('PDF.js viewer screenshot failed:', error)
    }

    // If all methods fail, return null
    console.log('All PDF screenshot methods failed')
    return null

  } catch (error) {
    console.error('PDF screenshot generation error:', error)
    return null
  }
}