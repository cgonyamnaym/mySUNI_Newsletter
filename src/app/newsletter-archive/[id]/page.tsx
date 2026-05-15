'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NewsletterContent } from '@/components/NewsletterContent'
import { getArchiveEntry } from '@/lib/newsletter-archive'
import type { NewsletterArchiveEntry } from '@/lib/newsletter-archive'

export default function NewsletterArchiveDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [entry, setEntry] = useState<NewsletterArchiveEntry | null>(null)
  const [mounted, setMounted] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const found = getArchiveEntry(id)
    if (!found) {
      router.replace('/newsletter-archive')
      return
    }
    setEntry(found)
    setMounted(true)
  }, [id, router])

  function handleDownloadHtml() {
    if (!contentRef.current || !entry) return
    const dateStr = entry.confirmedAt.slice(0, 10)
    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Energy Insight Newsletter · ${dateStr}</title>
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F7F7F8; font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
    .wrapper { max-width: 680px; margin: 40px auto; padding: 0 0 32px 0; }
    a { color: inherit; }
  </style>
</head>
<body>
  <div class="wrapper">${contentRef.current.innerHTML}</div>
</body>
</html>`
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `energy-insight-newsletter-${dateStr}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!mounted || !entry) return null

  const confirmedDate = new Date(entry.confirmedAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
  const confirmedTime = new Date(entry.confirmedAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit',
  })
  const dateLabel = new Date(entry.confirmedAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex flex-col h-full bg-wds-gray-100">

      {/* 상단 바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-wds-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto w-full px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/newsletter-archive"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-wds-gray-500 hover:text-wds-gray-950 transition-colors shrink-0"
            >
              <ArrowLeft size={15} />
              아카이브 목록
            </Link>
            <span className="text-wds-gray-200 text-lg select-none">|</span>
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-wds-gray-950 truncate">
                {confirmedDate}
              </h1>
              <p className="text-[11px] text-wds-gray-400">{confirmedTime} 확정 · {entry.articleCount}건</p>
            </div>
          </div>
          <button
            onClick={handleDownloadHtml}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold bg-wds-gray-800 text-white hover:bg-wds-gray-950 transition-all shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            HTML 저장
          </button>
        </div>
      </div>

      {/* 뉴스레터 본문 */}
      <main className="flex-1 py-8 px-4">
        <NewsletterContent ref={contentRef} articles={entry.articles} dateLabel={dateLabel} />
      </main>
    </div>
  )
}
