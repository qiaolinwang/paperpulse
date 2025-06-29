'use client'

import { useEffect, useRef, useState } from 'react'

interface PDFCanvasRendererProps {
  pdfUrl: string
  title: string
  className?: string
  onImageGenerated?: (imageDataUrl: string) => void
}

export function PDFCanvasRenderer({ pdfUrl, title, className = '', onImageGenerated }: PDFCanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [error, setError] = useState(false)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const renderPDF = async () => {
      try {
        setIsRendering(true)
        setError(false)

        // Dynamically import PDF.js to avoid SSR issues
        const pdfjsLib = await import('pdfjs-dist')
        
        // Set worker path - use a more reliable CDN or disable worker for simplicity
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
        } catch (error) {
          console.log('Worker setup failed, continuing without worker:', error)
        }

        console.log('Loading PDF:', pdfUrl)
        
        // Configure loading parameters to handle CORS
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@' + pdfjsLib.version + '/cmaps/',
          cMapPacked: true
        })
        
        const pdf = await loadingTask.promise

        if (!mounted) return

        console.log('PDF loaded, rendering first page')
        const page = await pdf.getPage(1)

        if (!mounted) return

        const canvas = canvasRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        if (!context) return

        // Set desired dimensions for thumbnail
        const desiredWidth = 400
        const viewport = page.getViewport({ scale: 1 })
        const scale = desiredWidth / viewport.width
        const scaledViewport = page.getViewport({ scale })

        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height)
        
        // Set white background
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvas.width, canvas.height)

        console.log('Rendering PDF page to canvas')
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise

        if (!mounted) return

        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png', 0.8)
        setImageDataUrl(dataUrl)
        setIsRendering(false)
        
        // Callback with generated image
        if (onImageGenerated) {
          onImageGenerated(dataUrl)
        }

        console.log('PDF rendered successfully to canvas')

      } catch (error) {
        console.error('PDF rendering failed:', error)
        if (mounted) {
          setError(true)
          setIsRendering(false)
        }
      }
    }

    renderPDF()

    return () => {
      mounted = false
    }
  }, [pdfUrl, onImageGenerated])

  if (isRendering) {
    return (
      <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <div className="animate-pulse">
          <div className="w-28 h-36 bg-gray-200 rounded flex items-center justify-center">
            <div className="text-xs text-gray-500">渲染PDF中...</div>
          </div>
        </div>
        <canvas 
          ref={canvasRef} 
          style={{ display: 'none' }}
          aria-label={`Rendering ${title}`}
        />
      </div>
    )
  }

  if (error || !imageDataUrl) {
    return (
      <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-xs text-gray-500">PDF渲染失败</div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    )
  }

  return (
    <div 
      className={`bg-white border border-gray-300 shadow-lg rounded-lg group cursor-pointer hover:shadow-xl transition-shadow overflow-hidden relative ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        window.open(pdfUrl, '_blank')
      }}
    >
      {/* Rendered PDF page */}
      <div className="w-full h-full overflow-hidden rounded-lg relative">
        <img
          src={imageDataUrl}
          alt={`PDF preview of ${title}`}
          className="w-full h-full object-cover"
          style={{ 
            objectFit: 'cover',
            objectPosition: 'center top',
            display: 'block'
          }}
        />
      </div>
      
      {/* PDF icon indicator */}
      <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center group-hover:bg-red-600 transition-colors z-20 pointer-events-none">
        <span className="text-white text-xs font-bold">P</span>
      </div>
      
      {/* Hover tooltip */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
        <div className="bg-white rounded px-2 py-1 text-xs shadow-lg">
          点击查看PDF
        </div>
      </div>

      {/* Hidden canvas for PDF rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}