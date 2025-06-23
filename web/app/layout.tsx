import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PaperPulse - Your Daily AI Paper Digest',
  description: 'Curated research papers delivered to your inbox daily. Stay updated with the latest AI and ML research.',
  keywords: ['AI research', 'machine learning', 'arXiv', 'research papers', 'daily digest'],
  authors: [{ name: 'PaperPulse Team' }],
  openGraph: {
    title: 'PaperPulse - Your Daily AI Paper Digest',
    description: 'Curated research papers delivered to your inbox daily',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, 'min-h-screen bg-background font-sans antialiased')}>
        {children}
      </body>
    </html>
  )
}