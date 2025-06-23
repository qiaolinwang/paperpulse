import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const paperId = formData.get('paperId') as string
    
    if (!file || !paperId) {
      return NextResponse.json({ error: 'File and paperId are required' }, { status: 400 })
    }

    const supabase = createClient()

    // 生成唯一的文件名
    const fileExt = file.name.split('.').pop()
    const fileName = `${paperId}.${fileExt}`
    const filePath = `thumbnails/${fileName}`

    // 上传到Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('paper-thumbnails')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload thumbnail' }, { status: 500 })
    }

    // 获取公共URL
    const { data: urlData } = supabase.storage
      .from('paper-thumbnails')
      .getPublicUrl(filePath)

    const thumbnailUrl = urlData.publicUrl

    // 更新数据库中的缩略图URL
    const { error: updateError } = await supabase
      .from('papers')
      .upsert({
        id: paperId,
        thumbnail_url: thumbnailUrl,
        thumbnail_generated_at: new Date().toISOString(),
        thumbnail_failed: false
      }, {
        onConflict: 'id'
      })

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 })
    }

    return NextResponse.json({ 
      thumbnailUrl,
      success: true
    })

  } catch (error) {
    console.error('Upload thumbnail error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload thumbnail',
      success: false
    }, { status: 500 })
  }
} 