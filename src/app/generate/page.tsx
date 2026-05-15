'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { NewsletterContent } from '@/components/NewsletterContent'
import { saveArchiveEntry } from '@/lib/newsletter-archive'
import type { Article, MetaIndex } from '@/lib/types'

const STORAGE_KEY = 'newsletter-selection'

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default function GeneratePage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) { setLoading(false); return }

      const stored = JSON.parse(raw) as { reportId: string; selectedIds: string[] }
      const { selectedIds } = stored
      if (!selectedIds?.length) { setLoading(false); return }

      const idSet = new Set(selectedIds)
      const idx = await fetchJson<MetaIndex>('/data/index.json')
      if (!idx) { setLoading(false); return }

      const recentDates = idx.availableDates.slice(0, 14)
      const dailyResults = await Promise.all(
        recentDates.map((d) => fetchJson<{ articles: Article[] }>(`/data/daily/${d}.json`))
      )

      const selected: Article[] = []
      const seen = new Set<string>()
      for (const r of dailyResults) {
        for (const a of r?.articles ?? []) {
          if (idSet.has(a.id) && !seen.has(a.id)) {
            seen.add(a.id)
            selected.push(a)
          }
        }
      }
      selected.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      setArticles(selected)
      setLoading(false)
    }
    load()
  }, [])

  function handleDownloadHtml() {
    if (!contentRef.current) return
    const dateStr = new Date().toISOString().slice(0, 10)
    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Energy Insight Newsletter · ${dateStr}</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" />
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #F7F7F8;
      font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper { max-width: 680px; margin: 40px auto; background: #F7F7F8; padding: 0 0 32px 0; }
    a { color: inherit; }
    @media (max-width: 720px) { .wrapper { margin: 0; } }
  </style>
</head>
<body>
  <div class="wrapper">
    ${contentRef.current.innerHTML}
  </div>
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

  async function handleConfirm() {
    if (confirming || confirmed) return
    setConfirming(true)
    try {
      saveArchiveEntry(articles)
      localStorage.removeItem(STORAGE_KEY)  // 확정 후 선택 항목 초기화
      setConfirmed(true)
      setTimeout(() => {
        router.push('/newsletter-archive')
      }, 1000)
    } catch {
      alert('아카이브 저장에 실패했습니다.')
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[14px] text-wds-gray-500 font-medium">
        뉴스레터 생성 중...
      </div>
    )
  }

  if (!articles.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-wds-gray-100 rounded-full flex items-center justify-center mb-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-wds-gray-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <p className="text-[16px] font-bold text-wds-gray-700">선택된 기사가 없습니다.</p>
        <Link
          href="/collect"
          className="mt-2 px-6 py-2.5 bg-wds-blue-500 text-white font-bold rounded-xl hover:bg-wds-blue-600 transition-colors shadow-sm"
        >
          기사 선택하러 가기
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-wds-gray-100">

      {/* 상단 컨트롤 바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-wds-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto w-full px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/collect"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-wds-gray-500 hover:text-wds-gray-950 transition-colors shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              기사 선택
            </Link>
            <span className="text-wds-gray-200 text-lg select-none">|</span>
            <h1 className="text-[16px] font-bold text-wds-gray-950 truncate">뉴스레터 미리보기</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold bg-wds-gray-100 text-wds-gray-700 hover:bg-wds-gray-200 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              인쇄
            </button>
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold bg-wds-gray-800 text-white hover:bg-wds-gray-950 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              HTML 저장
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming || confirmed}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all shadow-md ${
                confirmed
                  ? 'bg-green-500 text-white cursor-default'
                  : confirming
                  ? 'bg-wds-blue-300 text-white cursor-wait'
                  : 'bg-wds-blue-500 text-white hover:bg-wds-blue-600 hover:shadow-lg'
              }`}
            >
              <CheckCircle size={14} />
              {confirmed ? '저장 완료!' : confirming ? '저장 중...' : '확정'}
            </button>
          </div>
        </div>
      </div>

      {/* 뉴스레터 본문 */}
      <main className="flex-1 py-8 px-4">
        <NewsletterContent ref={contentRef} articles={articles} />
      </main>
    </div>
  )
}
