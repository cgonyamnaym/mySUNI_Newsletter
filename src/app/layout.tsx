import type { Metadata } from 'next'
import './globals.css'
import './colors_and_type.css'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: '에너지 인사이트 | 전력·에너지 솔루션 뉴스레터',
  description: 'AI가 큐레이션하는 전력·에너지 산업 최신 뉴스 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-wds-gray-50 font-sans antialiased text-wds-gray-950 flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  )
}
