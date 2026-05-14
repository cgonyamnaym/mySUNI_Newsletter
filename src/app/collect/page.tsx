'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { TranslationBadge } from '@/components/TranslationBadge'
import { TOPICS } from '@/lib/constants'
import type { Article, MetaIndex } from '@/lib/types'

// ── 스토리지 ─────────────────────────────────────────────
const STORAGE_KEY = 'newsletter-selection'

interface StoredSelection {
  reportId: string // Used as a 'period' key now
  selectedIds: string[]
  updatedAt: string
}

function loadSelection(): StoredSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSelection(reportId: string, ids: string[]) {
  const v: StoredSelection = { reportId, selectedIds: ids, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
}

// ── 데이터 fetch ──────────────────────────────────────────
async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default function SelectPage() {
  const [index, setIndex] = useState<MetaIndex | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeTopic, setActiveTopic] = useState<string>('전체')
  const [loading, setLoading] = useState(true)

  // index 로드
  useEffect(() => {
    fetchJson<MetaIndex>('/data/index.json').then((idx) => {
      setIndex(idx)
    })
  }, [])

  // 최근 2주 데이터 로드
  useEffect(() => {
    if (!index) return

    async function loadRecent14Days() {
      setLoading(true)
      // Get the last 14 available dates
      const recentDates = index!.availableDates.slice(0, 14)

      const dailyResults = await Promise.all(
        recentDates.map((d) => fetchJson<{ articles: Article[] }>(`/data/daily/${d}.json`))
      )

      const all: Article[] = []
      const seen = new Set<string>()
      for (const r of dailyResults) {
        for (const a of r?.articles ?? []) {
          if (!seen.has(a.id)) {
            seen.add(a.id)
            all.push(a)
          }
        }
      }
      all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

      setArticles(all)

      const stored = loadSelection()
      if (stored && stored.reportId === 'recent-14-days') {
        setSelectedIds(new Set(stored.selectedIds))
      }
      setLoading(false)
    }

    loadRecent14Days()
  }, [index])

  // 토픽 필터
  const filtered = useMemo(() => {
    if (activeTopic === '전체') return articles
    return articles.filter((a) => a.topics.includes(activeTopic as Article['topics'][0]))
  }, [articles, activeTopic])

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = { '전체': articles.length }
    TOPICS.forEach(t => counts[t.id] = 0)
    articles.forEach(a => {
      a.topics.forEach(tId => {
        if (counts[tId] !== undefined) counts[tId]++
      })
    })
    return counts
  }, [articles])

  function toggleArticle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveSelection('recent-14-days', Array.from(next))
      return next
    })
  }

  function toggleAll() {
    const allFiltered = new Set(filtered.map((a) => a.id))
    const allSelected = filtered.every((a) => selectedIds.has(a.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) allFiltered.forEach((id) => next.delete(id))
      else allFiltered.forEach((id) => next.add(id))
      saveSelection('recent-14-days', Array.from(next))
      return next
    })
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id))

  if (!index && !loading) return null

  return (
    <div className="flex flex-col h-full bg-wds-gray-50 relative">
      <Header lastUpdated={index?.lastUpdated ?? ''} latestReportId={index?.availableReports[0]} />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24">
        <h1 className="text-2xl font-bold text-wds-gray-950 mb-6">기사 선택 및 수집</h1>
        
        <div className="mb-4 text-sm text-wds-gray-600 bg-white p-4 rounded-xl border border-wds-gray-200 shadow-wds-xs">
          <strong>안내:</strong> 최근 2주(14일) 동안 수집된 기사 목록입니다. 뉴스레터에 포함할 기사를 개별 선택하거나 전체 선택할 수 있습니다.
        </div>

        {/* 토픽 필터 + 전체 선택/해제 */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {['전체', ...TOPICS.map((t) => t.id)].map((topic) => (
              <button
                key={topic}
                onClick={() => setActiveTopic(topic)}
                className={`px-4 py-1.5 text-[13px] font-semibold rounded-full border transition-all duration-200 hover:-translate-y-0.5 ${
                  activeTopic === topic
                    ? 'bg-wds-gray-900 text-white border-wds-gray-900 shadow-md'
                    : 'bg-white text-wds-gray-600 border-wds-gray-300 hover:border-wds-gray-500 hover:text-wds-gray-950 shadow-sm hover:shadow-md'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="px-4 py-1.5 rounded-full border border-wds-gray-300 bg-white text-[13px] font-bold text-wds-gray-800 shadow-sm flex items-center gap-1">
              뉴스 총 개수: <span className="text-wds-blue-600">{filtered.length}</span>
            </div>
            <button
              onClick={toggleAll}
              className="shrink-0 text-[13px] font-semibold px-4 py-1.5 rounded-md border border-wds-gray-300 bg-white text-wds-gray-700 hover:bg-wds-gray-50 hover:text-wds-gray-950 transition-colors shadow-sm"
            >
              {allFilteredSelected ? '현재 토픽 전체 해제' : '현재 토픽 전체 선택'}
            </button>
          </div>
        </div>

        {/* 기사 목록 */}
        {loading ? (
          <div className="py-20 text-center text-[14px] text-wds-gray-500 font-medium">데이터를 불러오는 중입니다...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-wds-gray-500 bg-white rounded-xl border border-wds-gray-200 shadow-sm">
            {articles.length === 0 ? '수집된 기사가 없습니다.' : '해당 토픽의 기사가 없습니다.'}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((article) => {
              const checked = selectedIds.has(article.id)
              return (
                <li
                  key={article.id}
                  onClick={() => toggleArticle(article.id)}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all select-none shadow-sm ${
                    checked
                      ? 'border-wds-blue-500 bg-wds-blue-50'
                      : 'border-wds-gray-200 bg-white hover:border-wds-gray-400 hover:shadow-wds-md'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* 명시적 체크박스 */}
                    <div className="mt-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="w-5 h-5 rounded border-wds-gray-400 text-wds-blue-500 focus:ring-wds-blue-500 cursor-pointer pointer-events-none"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 메타: 소스명 + 날짜 + 뱃지 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-wds-gray-600">{article.source}</span>
                        <span className="text-wds-gray-300 text-[10px]">|</span>
                        <span className="text-[12px] text-wds-gray-500 tabular-nums">
                          {article.publishedAt.slice(0, 10)}
                        </span>
                        {article.isTranslated && <TranslationBadge />}
                        {article.topics.map(topic => {
                          const topicCfg = TOPICS.find((t) => t.id === topic)
                          if (!topicCfg) return null
                          return (
                            <span
                              key={topic}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"
                              style={{ background: topicCfg.chipBg, color: topicCfg.chipText }}
                            >
                              {topicCfg.label}
                            </span>
                          )
                        })}
                      </div>

                      {/* 제목 */}
                      <p className="text-[16px] font-bold text-wds-gray-950 leading-snug mb-1">
                        {article.title}
                      </p>
                      {article.titleOriginal && (
                        <p className="text-[13px] text-wds-gray-500 mb-2 truncate">{article.titleOriginal}</p>
                      )}

                      {/* 요약 */}
                      {article.summary && (
                        <p className="text-[14px] text-wds-gray-700 leading-relaxed line-clamp-2 mb-3">
                          {article.summary}
                        </p>
                      )}

                      {/* 원문 링크 버튼 */}
                      <div className="flex justify-end border-t border-wds-gray-100 pt-3 mt-1">
                        <a
                          href={article.originalUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent row click
                            if (!article.originalUrl) {
                              e.preventDefault()
                              alert('원문 링크가 존재하지 않습니다.')
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[13px] font-bold text-wds-blue-500 hover:text-wds-blue-600 hover:bg-wds-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          원문 보기 
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {/* Sticky bottom CTA 바 */}
      <div className="fixed bottom-0 left-64 right-0 z-20 bg-white border-t border-wds-gray-200 shadow-[0_-4px_16px_rgba(23,23,23,0.06)] px-6 py-4 flex items-center justify-between">
        <span className="text-[14px] text-wds-gray-950 font-semibold">
          <span className="text-wds-blue-500 font-bold text-[16px]">{selectedIds.size}개</span> 기사 선택됨
        </span>
          <Link
            href="/generate"
            className={`px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
              selectedIds.size > 0
                ? 'bg-wds-blue-500 text-white hover:bg-wds-blue-600 shadow-md hover:shadow-lg'
                : 'bg-wds-gray-100 text-wds-gray-400 pointer-events-none'
            }`}
          >
            뉴스레터 생성하기 →
          </Link>
      </div>
    </div>
  )
}
