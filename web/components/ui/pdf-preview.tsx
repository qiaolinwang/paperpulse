'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PDFPreviewProps {
  pdfUrl: string
  title: string
  className?: string
}

export function PDFPreview({ pdfUrl, title, className = '' }: PDFPreviewProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // 清理并获取正确的PDF URL
  const cleanPdfUrl = pdfUrl.endsWith('.pdf') ? pdfUrl.slice(0, -4) : pdfUrl

  useEffect(() => {
    const generateThumbnail = async () => {
      try {
        console.log('Generating thumbnail for:', cleanPdfUrl)
        
        // 调用我们的API来生成PDF缩略图
        const response = await fetch(`/api/pdf-thumbnail?url=${encodeURIComponent(cleanPdfUrl)}`)
        const data = await response.json()
        
        if (data.success && data.thumbnailUrl) {
          // 对于screenshot服务，直接使用URL，因为验证可能会因为CORS或延迟失败
          console.log('Using thumbnail URL:', data.thumbnailUrl)
          setThumbnailUrl(data.thumbnailUrl)
          setLoading(false)
          return
        }
        
        // 如果API失败，回退到智能占位符
        setError(true)
        setLoading(false)
        
      } catch (err) {
        console.error('Failed to generate thumbnail:', err)
        setError(true)
        setLoading(false)
      }
    }

    generateThumbnail()
  }, [cleanPdfUrl])

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <div className="animate-pulse">
          <div className="w-28 h-36 bg-gray-200 rounded">
            <div className="flex items-center justify-center h-full">
              <div className="text-xs text-gray-500">生成预览中...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !thumbnailUrl) {
    return (
      <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden ${className}`}>
        <SmartPDFPlaceholder 
          title={title} 
          pdfUrl={cleanPdfUrl}
          className={className} 
        />
      </div>
    )
  }

  // 显示真实的PDF缩略图
  return (
    <div 
      className={`bg-white border border-gray-300 shadow-lg rounded-lg group cursor-pointer hover:shadow-xl transition-shadow overflow-hidden relative ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        window.open(cleanPdfUrl, '_blank')
      }}
    >
      {/* 真实的PDF第一页截图 */}
      <div className="w-full h-full overflow-hidden rounded-lg relative">
        <img
          src={thumbnailUrl}
          alt={`Preview of ${title}`}
          className="w-full h-full object-cover"
          style={{ 
            objectFit: 'cover',
            objectPosition: 'center top',
            transform: 'scale(1.4)',
            transformOrigin: 'center top',
            width: '110%',
            height: '110%',
            marginTop: '-8%',
            marginLeft: '-18%',
            display: 'block'
          }}
          onError={(e) => {
            console.log('Thumbnail image failed to load, using fallback')
            // 延迟一下再fallback，给图片加载更多时间
            setTimeout(() => {
              setError(true)
            }, 8000)
          }}
          onLoad={() => {
            console.log('Thumbnail loaded successfully')
          }}
          loading="lazy"
        />
      </div>
      
      {/* PDF图标标识 */}
      <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center group-hover:bg-red-600 transition-colors z-20 pointer-events-none">
        <span className="text-white text-xs font-bold">P</span>
      </div>
      
      {/* 鼠标悬停时显示PDF链接提示 */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
        <div className="bg-white rounded px-2 py-1 text-xs shadow-lg">
          点击查看PDF
        </div>
      </div>
    </div>
  )
}

// 智能PDF占位符 - 根据论文标题生成更相关的预览
function SmartPDFPlaceholder({ title, pdfUrl, className }: { title: string; pdfUrl: string; className: string }) {
  // 根据标题关键词生成不同的视觉元素
  const isMLPaper = /machine learning|neural|deep|AI|model|training/i.test(title)
  const isMathPaper = /theorem|proof|algorithm|optimization|equation/i.test(title)
  const isVisionPaper = /vision|image|video|visual|detection|recognition/i.test(title)
  const isNLPPaper = /language|text|NLP|linguistic|translation|dialogue/i.test(title)

  return (
    <div className="relative w-28 h-36 bg-white border border-gray-300 shadow-lg rounded-sm group cursor-pointer hover:shadow-xl transition-shadow">
      {/* PDF Header */}
      <div className="p-2 border-b border-gray-200">
        <div className="h-2 bg-gray-800 rounded w-full mb-1"></div>
        <div className="h-1 bg-gray-600 rounded w-3/4"></div>
      </div>
      
      {/* Abstract section */}
      <div className="p-2 space-y-1">
        <div className="h-1 bg-gray-400 rounded w-1/3 mb-1"></div>
        <div className="h-0.5 bg-gray-300 rounded w-full"></div>
        <div className="h-0.5 bg-gray-300 rounded w-5/6"></div>
        <div className="h-0.5 bg-gray-300 rounded w-full"></div>
        <div className="h-0.5 bg-gray-300 rounded w-4/5"></div>
      </div>
      
      {/* 根据论文类型显示不同的内容区域 */}
      <div className="p-2 space-y-1">
        <div className={`h-1 rounded w-2/3 mb-1 ${
          isMLPaper ? 'bg-blue-500' : 
          isMathPaper ? 'bg-green-500' : 
          isVisionPaper ? 'bg-purple-500' : 
          isNLPPaper ? 'bg-orange-500' : 'bg-gray-500'
        }`}></div>
        <div className="space-y-0.5">
          <div className="h-0.5 bg-gray-300 rounded w-full"></div>
          <div className="h-0.5 bg-gray-300 rounded w-full"></div>
          <div className="h-0.5 bg-gray-300 rounded w-3/4"></div>
          <div className="h-0.5 bg-gray-300 rounded w-full"></div>
          <div className="h-0.5 bg-gray-300 rounded w-5/6"></div>
        </div>
      </div>
      
      {/* 领域特定的元素 */}
      <div className="px-2 py-1">
        <div className="h-3 bg-gray-100 border border-gray-300 rounded text-center flex items-center justify-center">
          <div className="text-xs text-gray-500 font-mono">
            {isMLPaper ? 'f(x;θ)' : 
             isMathPaper ? '∫f(x)dx' : 
             isVisionPaper ? '🖼️CNN' : 
             isNLPPaper ? 'W₁W₂' : '∑f(x)'}
          </div>
        </div>
      </div>
      
      {/* 更多内容 */}
      <div className="p-2 space-y-0.5">
        <div className="h-0.5 bg-gray-300 rounded w-full"></div>
        <div className="h-0.5 bg-gray-300 rounded w-4/5"></div>
        <div className="h-0.5 bg-gray-300 rounded w-full"></div>
      </div>
      
      {/* Page number */}
      <div className="absolute bottom-1 right-2 text-xs text-gray-400 font-mono">1</div>
      
      {/* PDF icon with hover effect */}
      <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-sm flex items-center justify-center group-hover:bg-red-600 transition-colors">
        <span className="text-white text-xs font-bold">P</span>
      </div>
      
      {/* 鼠标悬停时显示PDF链接提示 */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="bg-white rounded px-2 py-1 text-xs shadow-lg">
          点击查看PDF
        </div>
      </div>
      
      {/* 阴影效果 */}
      <div className="absolute -right-1 -bottom-1 w-28 h-36 bg-gray-100 border border-gray-300 shadow-md rounded-sm -z-10 group-hover:shadow-lg transition-shadow"></div>
      <div className="absolute -right-2 -bottom-2 w-28 h-36 bg-gray-200 border border-gray-300 shadow-sm rounded-sm -z-20"></div>
      
      {/* 添加点击事件来打开PDF */}
      <div 
        className="absolute inset-0 cursor-pointer z-10"
        onClick={(e) => {
          e.stopPropagation()
          window.open(pdfUrl, '_blank')
        }}
      />
         </div>
   )
 }

 // Fallback组件 - 如果PDF无法加载则显示
function PDFPlaceholder({ title, className }: { title: string; className: string }) {
  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden ${className}`}>
      {/* 模拟的PDF预览 */}
      <div className="relative w-28 h-36 bg-white border border-gray-300 shadow-lg rounded-sm">
        {/* PDF Header */}
        <div className="p-2 border-b border-gray-200">
          <div className="h-2 bg-gray-800 rounded w-full mb-1"></div>
          <div className="h-1 bg-gray-600 rounded w-3/4"></div>
        </div>
        
        {/* Abstract section */}
        <div className="p-2 space-y-1">
          <div className="h-1 bg-gray-400 rounded w-1/3 mb-1"></div>
          <div className="h-0.5 bg-gray-300 rounded w-full"></div>
          <div className="h-0.5 bg-gray-300 rounded w-5/6"></div>
          <div className="h-0.5 bg-gray-300 rounded w-full"></div>
          <div className="h-0.5 bg-gray-300 rounded w-4/5"></div>
        </div>
        
        {/* Main content */}
        <div className="p-2 space-y-1">
          <div className="h-1 bg-gray-500 rounded w-2/3 mb-1"></div>
          <div className="space-y-0.5">
            <div className="h-0.5 bg-gray-300 rounded w-full"></div>
            <div className="h-0.5 bg-gray-300 rounded w-full"></div>
            <div className="h-0.5 bg-gray-300 rounded w-3/4"></div>
            <div className="h-0.5 bg-gray-300 rounded w-full"></div>
            <div className="h-0.5 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
        
        {/* Equations */}
        <div className="px-2 py-1">
          <div className="h-3 bg-gray-100 border border-gray-300 rounded text-center flex items-center justify-center">
            <div className="text-xs text-gray-500 font-mono">∑f(x)</div>
          </div>
        </div>
        
        {/* More content */}
        <div className="p-2 space-y-0.5">
          <div className="h-0.5 bg-gray-300 rounded w-full"></div>
          <div className="h-0.5 bg-gray-300 rounded w-4/5"></div>
          <div className="h-0.5 bg-gray-300 rounded w-full"></div>
        </div>
        
        {/* Page number */}
        <div className="absolute bottom-1 right-2 text-xs text-gray-400 font-mono">1</div>
        
        {/* PDF icon */}
        <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
      </div>
      
      {/* 阴影效果 */}
      <div className="absolute -right-1 -bottom-1 w-28 h-36 bg-gray-100 border border-gray-300 shadow-md rounded-sm -z-10"></div>
      <div className="absolute -right-2 -bottom-2 w-28 h-36 bg-gray-200 border border-gray-300 shadow-sm rounded-sm -z-20"></div>
    </div>
  )
} 