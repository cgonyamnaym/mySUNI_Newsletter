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
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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

      // 0. screening에서 직접 전달된 요약 우선 적용 (저장 경로 무관하게 신뢰도 최고)
      try {
        const generated = JSON.parse(
          localStorage.getItem('nl-generated-summaries') ?? '{}'
        ) as Record<string, Article['newsletterSummary']>
        for (const article of selected) {
          if (!article.newsletterSummary && generated[article.id]) {
            article.newsletterSummary = generated[article.id]
          }
        }
        localStorage.removeItem('nl-generated-summaries')
      } catch { /* 무시 */ }

      // 1. /api/summaries (Redis 캐시 → 로컬 draft 병합) — Step 0 미적용 항목만
      const afterStep0Missing = selected.some((a) => !a.newsletterSummary)
      if (afterStep0Missing) {
        try {
          const summaryRes = await fetch(`/api/summaries?ids=${selectedIds.join(',')}`)
          if (summaryRes.ok) {
            const summaryMap: Record<string, Article['newsletterSummary']> = await summaryRes.json()
            for (const article of selected) {
              if (!article.newsletterSummary && summaryMap[article.id]) {
                article.newsletterSummary = summaryMap[article.id]
              }
            }
          }
        } catch { /* API 없는 환경 */ }
      }

      // 2. 여전히 미채워진 항목 → newsletter-draft.json fallback (로컬 서버)
      const stillMissing = selected.some((a) => !a.newsletterSummary)
      if (stillMissing) {
        const draft = await fetchJson<{ articles: Article[] }>('/data/newsletter-draft.json')
        if (draft?.articles) {
          const fileMap = new Map(
            draft.articles
              .filter((a) => a.newsletterSummary)
              .map((a) => [a.id, a.newsletterSummary])
          )
          for (const article of selected) {
            if (!article.newsletterSummary && fileMap.has(article.id)) {
              article.newsletterSummary = fileMap.get(article.id)
            }
          }
        }
      }

      setArticles(selected)
      setLoading(false)
    }
    load()
  }, [])

  async function handleRetrySummary(articleId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [articleId] }),
      })
      if (!res.ok) return false
      const data = await res.json() as Record<string, Article['newsletterSummary']>
      const summary = data[articleId]
      if (!summary?.what) return false
      setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, newsletterSummary: summary } : a)))
      return true
    } catch {
      return false
    }
  }

  function handleDownloadHtml() {
    if (!contentRef.current) return
    const dateStr = new Date().toISOString().slice(0, 10)
    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>에너지 인사이트 뉴스레터 · ${dateStr}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #F0F2F5;
      font-family: "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", "Noto Sans KR", "나눔고딕", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; }
  </style>
</head>
<body>
  ${contentRef.current.innerHTML}
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

  async function handlePublish() {
    if (publishing || !articles.length) return
    setPublishing(true)
    try {
      const res = await fetch('/api/newsletter/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles }),
      })
      if (!res.ok) throw new Error('failed')
      const { url } = await res.json() as { url: string }
      setPublishedUrl(`${window.location.origin}${url}`)
    } catch {
      alert('URL 생성에 실패했습니다. Redis 설정을 확인하세요.')
    } finally {
      setPublishing(false)
    }
  }

  async function handleCopyUrl() {
    if (!publishedUrl) return
    await navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold bg-wds-gray-100 text-wds-gray-700 hover:bg-wds-gray-200 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              HTML 저장
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || !!publishedUrl}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
                publishedUrl
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : publishing
                  ? 'bg-wds-gray-200 text-wds-gray-500 cursor-wait'
                  : 'bg-wds-gray-800 text-white hover:bg-wds-gray-950'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {publishedUrl ? 'URL 생성됨' : publishing ? '생성 중...' : 'URL 공유'}
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

      {/* 공유 URL 배너 */}
      {publishedUrl && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <CheckCircle size={14} className="text-green-600 shrink-0" />
            <span className="text-[12px] font-semibold text-green-700 shrink-0">공유 URL:</span>
            <span className="text-[12px] font-mono text-green-800 bg-green-100 px-2 py-0.5 rounded flex-1 truncate">
              {publishedUrl}
            </span>
            <button
              onClick={handleCopyUrl}
              className="text-[12px] font-bold text-green-700 hover:text-green-900 shrink-0 transition-colors"
            >
              {copied ? '복사됨!' : 'URL 복사'}
            </button>
          </div>
        </div>
      )}

      {/* 뉴스레터 본문 */}
      <main className="flex-1 py-8 px-4">
        <NewsletterContent ref={contentRef} articles={articles} onRetrySummary={handleRetrySummary} />
      </main>
    </div>
  )
}
