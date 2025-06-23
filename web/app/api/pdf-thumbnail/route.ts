import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const pdfUrl = searchParams.get('url')
  
  if (!pdfUrl) {
    return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 })
  }

  try {
    // 清理PDF URL，从中提取paper ID
    let cleanPdfUrl = pdfUrl
    if (cleanPdfUrl.endsWith('.pdf')) {
      cleanPdfUrl = cleanPdfUrl.slice(0, -4)
    }
    
    // 从URL中提取arXiv ID
    const paperId = extractPaperIdFromUrl(cleanPdfUrl)
    if (!paperId) {
      throw new Error('Cannot extract paper ID from URL')
    }

    const supabase = createClient()

    // 首先检查数据库中是否已有缩略图
    const { data: paper, error: fetchError } = await supabase
      .from('papers')
      .select('thumbnail_url, thumbnail_generated_at, thumbnail_failed')
      .eq('id', paperId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      if (fetchError.code === '42703') {
        // Column doesn't exist yet - skip database caching for now
        console.log('Thumbnail columns not yet created in database, proceeding without caching')
      } else {
        console.error('Database fetch error:', fetchError)
      }
    }

    // 如果已有缩略图且不超过7天，直接返回 (只有在没有数据库错误时才检查)
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

    // 如果缩略图生成失败过且在24小时内，不重试 (只有在没有数据库错误时才检查)
    if (!fetchError && paper?.thumbnail_failed && paper.thumbnail_generated_at) {
      const generatedAt = new Date(paper.thumbnail_generated_at)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      if (generatedAt > dayAgo) {
        return NextResponse.json({ 
          error: 'Thumbnail generation failed recently',
          fallback: true,
          success: false
        }, { status: 500 })
      }
    }

    // 生成新的缩略图
    const thumbnailUrl = await generatePDFThumbnail(cleanPdfUrl)
    
    if (thumbnailUrl) {
      // 保存缩略图URL到数据库 (只有在数据库字段存在时才保存)
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
          console.log('Failed to save thumbnail to database, but continuing:', dbError)
        }
      }

      return NextResponse.json({ 
        thumbnailUrl,
        success: true,
        generated: true
      })
    } else {
      // 标记缩略图生成失败 (只有在数据库字段存在时才标记)
      if (!fetchError || fetchError.code !== '42703') {
        try {
          await supabase
            .from('papers')
            .upsert({
              id: paperId,
              thumbnail_failed: true,
              thumbnail_generated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
        } catch (dbError) {
          console.log('Failed to save failure status to database:', dbError)
        }
      }

      throw new Error('Failed to generate thumbnail')
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

// 从PDF URL中提取paper ID
function extractPaperIdFromUrl(url: string): string | null {
  // 匹配ArXiv URL格式: http://arxiv.org/pdf/2506.17219v1
  const arxivMatch = url.match(/arxiv\.org\/pdf\/([^/\s]+)/i)
  if (arxivMatch) {
    return arxivMatch[1]
  }
  
  // 其他格式可以在这里添加
  return null
}

// 生成PDF缩略图
async function generatePDFThumbnail(pdfUrl: string): Promise<string | null> {
  try {
    console.log('Generating thumbnail for:', pdfUrl)
    
    // 先尝试ArXiv的原生资源（如果存在）
    const arxivId = pdfUrl.match(/arxiv\.org\/pdf\/([^/]+)/)?.[1]
    if (arxivId) {
      // 检查ArXiv是否有预览图片
      const possibleThumbnails = [
        `https://arxiv.org/pdf/${arxivId}.png`,
        `https://arxiv.org/abs/${arxivId.replace('v1', '')}.png`,
      ]
      
      for (const thumbUrl of possibleThumbnails) {
        try {
          const response = await fetch(thumbUrl, { method: 'HEAD' })
          if (response.ok && response.headers.get('content-type')?.includes('image')) {
            console.log('Found ArXiv thumbnail:', thumbUrl)
            return thumbUrl
          }
        } catch (error) {
          continue
        }
      }
    }

    // 使用Screenshot Machine API (免费版本)
    // 这个服务可以对PDF URL进行截图
    const screenshotServices = [
      // 方案1: 使用更大的截图尺寸，然后裁剪掉工具栏部分
      `https://mini.s-shot.ru/1200x900/PNG/1200/PNG/?${encodeURIComponent(pdfUrl)}`,
      
      // 方案2: 使用Google Docs嵌入式查看器，去掉工具栏
      `https://mini.s-shot.ru/1024x768/PNG/1024/PNG/?${encodeURIComponent(`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`)}`,
      
      // 方案3: 使用延迟截图，等待PDF加载
      `https://image.thum.io/get/width/600/crop/800/wait/3000/${encodeURIComponent(pdfUrl)}`,
      
      // 方案4: 使用PDF.js查看器，更干净的显示
      `https://mini.s-shot.ru/800x1000/PNG/800/PNG/?${encodeURIComponent(`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`)}`,
    ]

    // 尝试不同的截图策略
    for (const serviceUrl of screenshotServices) {
      try {
        console.log('Trying screenshot service:', serviceUrl)
        
        // 对于screenshot服务，我们直接返回URL
        // 优先使用Google Docs嵌入式查看器，因为它没有工具栏
        if (serviceUrl.includes('docs.google.com/viewer') && serviceUrl.includes('embedded=true')) {
          console.log('Using Google Docs embedded viewer:', serviceUrl)
          return serviceUrl
        }
        
        // 其次使用带延迟的截图服务
        if (serviceUrl.includes('wait/3000')) {
          console.log('Using delayed screenshot service:', serviceUrl)
          return serviceUrl
        }
        
        // 最后使用直接PDF截图
        if (serviceUrl.includes('mini.s-shot.ru') || serviceUrl.includes('thum.io')) {
          console.log('Using direct screenshot service:', serviceUrl)
          return serviceUrl
        }
        
        const response = await fetch(serviceUrl, { 
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        
        if (response.ok) {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('image')) {
            console.log('Successfully generated thumbnail with service:', serviceUrl)
            return serviceUrl
          }
        }
      } catch (error) {
        console.log(`Screenshot service failed: ${serviceUrl}`, error)
        continue
      }
    }

    // 最后的fallback: 使用一个简单的占位符图片服务
    // 这会生成一个显示PDF信息的图片
    const fallbackUrl = `https://via.placeholder.com/400x500/f3f4f6/374151?text=${encodeURIComponent('PDF Preview')}`
    
    console.log('Using fallback placeholder image')
    return fallbackUrl

  } catch (error) {
    console.error('All thumbnail services failed:', error)
    return null
  }
} 