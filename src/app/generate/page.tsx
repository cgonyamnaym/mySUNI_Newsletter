'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import type { Article, MetaIndex } from '@/lib/types'
import { TOPICS } from '@/lib/constants'

const STORAGE_KEY = 'newsletter-selection'

// 잡지 스타일 헤더 색상 (세련된 다크 그레이 톤 - Wanted Design System --c-gray-900)
const HEADER_BG = '#1B1C1E'


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
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
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
      setArticles(selected)
      setLoading(false)
    }
    load()
  }, [])

  const grouped = TOPICS.map((t) => ({
    topic: t,
    items: articles.filter((a) => a.topics.includes(t.id)),
  })).filter((g) => g.items.length > 0)

  const unclassified = articles.filter((a) => !a.topics.length)

  async function handleCopyHtml() {
    if (!contentRef.current) return
    try {
      const html = contentRef.current.innerHTML
      const blob = new Blob([html], { type: 'text/html' })
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('HTML 복사에 실패했습니다.')
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
    .wrapper {
      max-width: 680px;
      margin: 40px auto;
      background: #F7F7F8;
      padding: 0 0 32px 0;
    }
    a { color: inherit; }
    @media (max-width: 720px) {
      .wrapper { margin: 0; }
    }
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

  const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="flex flex-col h-full bg-wds-gray-100">

      {/* ── 상단 컨트롤 바 ─────────────────────────────────── */}
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
            <span className="shrink-0 text-[12px] font-semibold text-wds-blue-500 bg-wds-blue-50 px-2.5 py-1 rounded-full">
              {articles.length}건
            </span>
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
              onClick={handleCopyHtml}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold bg-wds-blue-500 text-white hover:bg-wds-blue-600 transition-all shadow-md hover:shadow-lg"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? '복사 완료!' : 'HTML 복사'}
            </button>
          </div>
        </div>
      </div>

      {/* ── 뉴스레터 본문 ───────────────────────────────────── */}
      <main className="flex-1 py-8 px-4">
        <div
          ref={contentRef}
          style={{
            fontFamily: '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
            maxWidth: '680px',
            margin: '0 auto',
            backgroundColor: '#F7F7F8', // Wanted Design System --c-gray-50
            padding: '0 0 32px 0',
          }}
        >

          {/* ── 뉴스레터 마스트헤드 ── */}
          <div style={{
            backgroundColor: HEADER_BG,
            padding: '32px 32px 28px 32px',
            marginBottom: '24px',
            borderRadius: '12px 12px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '29px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Energy Insight Newsletter
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.72)', fontWeight: '500', marginBottom: '24px' }}>
              전력·에너지 솔루션 최신 동향 큐레이션&nbsp;·&nbsp;{todayStr}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {grouped.map(({ topic }) => (
                <a key={topic.id} href={`#${topic.id}`} style={{
                  backgroundColor: '#FFFFFF',
                  color: '#4B5563',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  border: '1px solid #D1D5DB',
                  display: 'inline-block',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.4)'
                }}>
                  {topic.label}
                </a>
              ))}
              {unclassified.length > 0 && (
                <a href="#기타" style={{
                  backgroundColor: '#FFFFFF',
                  color: '#4B5563',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  border: '1px solid #D1D5DB',
                  display: 'inline-block',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.4)'
                }}>
                  기타
                </a>
              )}
            </div>
          </div>

          {/* ── 토픽 섹션 모자이크 그리드 (카드 형식 적용) ── */}
          {grouped.map(({ topic, items }) => (
            <div key={topic.id} id={topic.id} style={{ marginBottom: '32px', padding: '0 8px' }}>
              <h2 style={{
                fontSize: '28px', fontWeight: '900', color: '#000000',
                marginBottom: '20px', paddingLeft: '0',
                borderLeft: 'none',
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                borderBottom: '2px solid #000000',
                paddingBottom: '8px',
                display: 'block'
              }}>
                {topic.label}
              </h2>
              <div style={{ columnCount: 2, columnGap: '16px' }}>
                {items.map((article) => (
                  <div key={article.id} style={{ breakInside: 'avoid', marginBottom: '16px' }}>
                    <ContentCard article={article} topicLabel={topic.label} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 미분류 */}
          {unclassified.length > 0 && (
            <div id="기타" style={{ marginBottom: '32px', padding: '0 8px' }}>
              <h2 style={{
                fontSize: '28px', fontWeight: '900', color: '#000000',
                marginBottom: '20px', paddingLeft: '0',
                borderLeft: 'none',
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                borderBottom: '2px solid #000000',
                paddingBottom: '8px',
                display: 'block'
              }}>
                기타
              </h2>
              <div style={{ columnCount: 2, columnGap: '16px' }}>
                {unclassified.map((article) => (
                  <div key={article.id} style={{ breakInside: 'avoid', marginBottom: '16px' }}>
                    <ContentCard article={article} topicLabel="기타" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 푸터 */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '24px 32px',
            marginTop: '24px',
            textAlign: 'center',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.02)'
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>
              본 뉴스레터는 에너지 인사이트 시스템에 의해 자동 생성되었습니다.
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}

// ── 콘텐츠 카드 (기사 본문) ─────────────────────────────
interface ContentCardProps {
  article: Article
  topicLabel: string
}

function ContentCard({ article, topicLabel }: ContentCardProps) {
  return (
    <a
      href={article.originalUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        cursor: article.originalUrl ? 'pointer' : 'default',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '4px 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        border: '1px solid #F3F4F6',
      }}
    >
      <div style={{ height: '100%' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#F4F4F5',
          padding: '16px 20px 14px 20px',
          borderBottom: '1px solid #E5E7EB',
        }}>
          <p style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: '800',
            color: '#6B7280',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            {topicLabel}
          </p>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '900',
            color: '#000000',
            lineHeight: '1.45',
            letterSpacing: '-0.02em',
          }}>
            {article.title}
          </h3>
        </div>

        {/* 본문 */}
        <div style={{ padding: '16px 20px 18px 20px' }}>
          {article.summary && (
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              color: '#374151',
              lineHeight: '1.7',
              wordBreak: 'keep-all',
            }}>
              {article.summary}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600' }}>
              {article.source}&nbsp;·&nbsp;{article.publishedAt.slice(0, 10)}
            </span>
            {article.originalUrl && (
              <span style={{
                fontSize: '12px',
                fontWeight: '800',
                color: '#000000',
                whiteSpace: 'nowrap',
              }}>
                원문 보기 →
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}
