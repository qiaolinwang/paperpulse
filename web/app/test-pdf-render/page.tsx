'use client'

import { PDFCanvasRenderer } from '@/components/ui/pdf-canvas-renderer'

export default function TestPDFRender() {
  const testPdfs = [
    {
      url: 'https://arxiv.org/pdf/2506.17218v1.pdf',
      title: 'Test Paper 1'
    },
    {
      url: 'https://arxiv.org/pdf/2311.05740.pdf', 
      title: 'Test Paper 2'
    },
    {
      url: 'https://arxiv.org/pdf/2310.11511.pdf',
      title: 'Test Paper 3'
    }
  ]

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">PDF Rendering Test</h1>
      <p className="text-gray-600 mb-8">
        Testing client-side PDF rendering using PDF.js. This should generate actual PDF page screenshots.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testPdfs.map((pdf, index) => (
          <div key={index} className="border p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{pdf.title}</h3>
            <p className="text-sm text-gray-500 mb-4 break-all">{pdf.url}</p>
            
            <PDFCanvasRenderer 
              pdfUrl={pdf.url}
              title={pdf.title}
              className="w-full h-64"
              onImageGenerated={(imageDataUrl) => {
                console.log(`Generated image for ${pdf.title}:`, imageDataUrl.substring(0, 100) + '...')
              }}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>This page renders PDFs client-side using PDF.js</li>
          <li>Each PDF should show an actual screenshot of the first page</li>
          <li>Check browser console for rendering progress</li>
          <li>If successful, this method can replace SVG placeholders</li>
          <li>Click on any rendered PDF to open the full document</li>
        </ol>
      </div>
    </div>
  )
}