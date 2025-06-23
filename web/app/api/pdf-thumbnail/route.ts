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
      `https://api.s-shot.ru/1200x900/PNG/1200/PNG/?${encodeURIComponent(pdfUrl)}`,
      
    ]

    // 直接使用截图服务，不验证（避免IP被封）
    const primaryService = screenshotServices[0]
    console.log('Using screenshot service without verification:', primaryService)
    
    // 添加随机参数避免缓存和检测
    const timestamp = Date.now()
    const randomParam = Math.random().toString(36).substring(7)
    const finalUrl = `${primaryService}&t=${timestamp}&r=${randomParam}`
    
    return finalUrl

  } catch (error) {
    console.error('All thumbnail services failed:', error)
    return null
  }
} 