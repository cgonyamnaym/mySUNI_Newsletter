'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Archive, ArrowLeft, CheckCircle, Eye, Trash2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { NewsletterContent } from '@/components/NewsletterContent'
import { getArchiveEntries, getArchiveEntry, deleteArchiveEntry } from '@/lib/newsletter-archive'
import type { NewsletterArchiveEntry } from '@/lib/newsletter-archive'
import type { NewsletterMeta } from '@/app/api/newsletter/publish/route'

function formatDate(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

// ── 상세 뷰 ──────────────────────────────────────────────────
function DetailView({ id }: { id: string }) {
  const router = useRouter()
  const [entry, setEntry] = useState<NewsletterArchiveEntry | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [publishedUrl, setPublishedUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    getArchiveEntry(id).then((found) => {
      if (cancelled) return
      if (!found) {
        router.replace('/newsletter-archive')
        return
      }
      setEntry(found)
    })
    return () => { cancelled = true }
  }, [id, router])

  async function handlePublish() {
    if (!entry) return
    const url = `${window.location.origin}/n/${entry.id}`
    if (publishedUrl) {
      await navigator.clipboard.writeText(publishedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }
    // 아카이브 항목은 확정 시점에 이미 공유 가능한 상태로 저장되어 있으므로 재요청 없이 URL만 조립
    setPublishedUrl(url)
  }

  async function handleCopyUrl() {
    if (!publishedUrl) return
    await navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadHtml() {
    if (!contentRef.current || !entry) return
    const dateStr = entry.confirmedAt.slice(0, 10)
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

  if (!entry) return (
    <div className="h-full flex items-center justify-center text-[14px] text-wds-gray-500">
      불러오는 중...
    </div>
  )

  const { date, time } = formatDate(entry.confirmedAt)
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
              <h1 className="text-[15px] font-bold text-wds-gray-950 truncate">{date}</h1>
              <p className="text-[11px] text-wds-gray-400">{time} 확정 · {entry.articleCount}건</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePublish}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
                publishedUrl
                  ? 'bg-green-500 text-white'
                  : 'bg-wds-gray-100 text-wds-gray-700 hover:bg-wds-gray-200'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {publishedUrl ? 'URL 생성됨' : 'URL 공유'}
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
        <NewsletterContent ref={contentRef} articles={entry.articles} dateLabel={dateLabel} />
      </main>
    </div>
  )
}

// ── 목록 뷰 ──────────────────────────────────────────────────
function ListView() {
  const [entries, setEntries] = useState<NewsletterMeta[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let cancelled = false
    getArchiveEntries().then((data) => {
      if (cancelled) return
      setEntries(data)
      setMounted(true)
    })
    return () => { cancelled = true }
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('이 뉴스레터를 아카이브에서 삭제할까요?')) return
    await deleteArchiveEntry(id)
    setEntries(await getArchiveEntries())
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-full bg-wds-gray-50">
      <Header lastUpdated="" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Archive size={22} className="text-wds-blue-500" />
          <h1 className="text-2xl font-bold text-wds-gray-950">뉴스레터 아카이브</h1>
        </div>

        {entries.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-wds-gray-200 shadow-sm">
            <Archive size={36} className="text-wds-gray-300 mx-auto mb-4" />
            <p className="text-[15px] font-semibold text-wds-gray-500 mb-1">저장된 뉴스레터가 없습니다.</p>
            <p className="text-[13px] text-wds-gray-400 mb-6">
              뉴스레터 미리보기에서 <strong>확정</strong> 버튼을 눌러 저장하세요.
            </p>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-wds-blue-500 text-white font-bold rounded-xl hover:bg-wds-blue-600 transition-colors shadow-sm text-[13px]"
            >
              뉴스레터 생성하기
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry, idx) => {
              const { date, time } = formatDate(entry.confirmedAt)
              return (
                <li
                  key={entry.id}
                  className="bg-white rounded-2xl border border-wds-gray-200 shadow-sm px-6 py-5 flex items-center justify-between gap-4 hover:border-wds-gray-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-[13px] font-bold text-wds-gray-300 tabular-nums shrink-0 w-6 text-right">
                      #{entries.length - idx}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-wds-gray-950 truncate">{date}</p>
                      <p className="text-[12px] text-wds-gray-400 mt-0.5">
                        {time} 확정&nbsp;·&nbsp;
                        <span className="font-semibold text-wds-blue-500">{entry.articleCount}건</span> 기사 포함
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/newsletter-archive?view=${entry.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold bg-wds-gray-100 text-wds-gray-700 hover:bg-wds-gray-200 transition-colors"
                    >
                      <Eye size={14} />
                      보기
                    </Link>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold text-wds-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

// ── 라우터 (목록 vs 상세) ─────────────────────────────────────
function ArchiveRouter() {
  const searchParams = useSearchParams()
  const viewId = searchParams.get('view')
  if (viewId) return <DetailView id={viewId} />
  return <ListView />
}

export default function NewsletterArchivePage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center text-[14px] text-wds-gray-500">
        불러오는 중...
      </div>
    }>
      <ArchiveRouter />
    </Suspense>
  )
}
