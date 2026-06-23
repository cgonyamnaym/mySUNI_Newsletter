'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { TranslationBadge } from '@/components/TranslationBadge'
import { TOPICS } from '@/lib/constants'
import { screenArticles, computeDemandKeywords, getScoreLabel } from '@/lib/screening'
import { getArchiveEntries } from '@/lib/newsletter-archive'
import type { Article, MetaIndex } from '@/lib/types'

const STORAGE_KEY = 'newsletter-selection'

interface StoredSelection {
  reportId: string
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

function saveSelection(ids: string[]) {
  const v: StoredSelection = { reportId: 'recent-14-days', selectedIds: ids, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function CollectPageInner() {
  const [index, setIndex] = useState<MetaIndex | null>(null)
  const [allArticles, setAllArticles] = useState<Article[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeTopic, setActiveTopic] = useState<string>('전체')
  const [loading, setLoading] = useState(true)

  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('q') ?? ''

  useEffect(() => {
    fetchJson<MetaIndex>('/data/index.json').then(setIndex)
  }, [])

  useEffect(() => {
    if (!index) return
    async function load() {
      setLoading(true)
      const recentDates = index!.availableDates.slice(0, 14)
      const results = await Promise.all(
        recentDates.map((d) => fetchJson<{ articles: Article[] }>(`/data/daily/${d}.json`))
      )
      const all: Article[] = []
      const seen = new Set<string>()
      for (const r of results) {
        for (const a of r?.articles ?? []) {
          if (!seen.has(a.id)) {
            seen.add(a.id)
            all.push(a)
          }
        }
      }
      setAllArticles(all)
      const stored = loadSelection()
      if (stored && stored.reportId === 'recent-14-days') {
        setSelectedIds(new Set(stored.selectedIds))
      }
      setLoading(false)
    }
    load()
  }, [index])

  // 아카이브 기반 수요 키워드
  const { demandKeywords } = useMemo(() => {
    const entries = getArchiveEntries()
    const articles = entries.flatMap((e) => e.articles)
    return { demandKeywords: computeDemandKeywords(articles), archiveArticleCount: articles.length }
  }, [])

  const screened = useMemo(() => {
    let base =
      activeTopic === '전체'
        ? allArticles
        : allArticles.filter((a) => a.topics.includes(activeTopic as Article['topics'][0]))

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      base = base.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        (a.titleOriginal && a.titleOriginal.toLowerCase().includes(q)) ||
        (a.summary && a.summary.toLowerCase().includes(q))
      )
    }

    return screenArticles(base, { limit: 9999, categoryMax: 999, sourceMax: 999 }, demandKeywords)
  }, [allArticles, activeTopic, demandKeywords, searchQuery])

  const rankMap = useMemo(
    () => new Map(screened.map((a, i) => [a.id, i + 1])),
    [screened]
  )

  const [scoreMin, scoreMax] = useMemo(() => {
    if (screened.length === 0) return [0, 0]
    const scores = screened.map((a) => a.relevanceScore)
    return [Math.min(...scores), Math.max(...scores)]
  }, [screened])

  const anyScreenedSelected = screened.some((a) => selectedIds.has(a.id))

  function toggleArticle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveSelection(Array.from(next))
      return next
    })
  }

  function clearAll() {
    setSelectedIds(new Set())
    saveSelection([])
  }

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      screened.forEach((a) => next.add(a.id))
      saveSelection(Array.from(next))
      return next
    })
  }

  function deselectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      screened.forEach((a) => next.delete(a.id))
      saveSelection(Array.from(next))
      return next
    })
  }

  return (
    <div className="flex flex-col h-full bg-wds-gray-50 relative">
      <Header lastUpdated={index?.lastUpdated ?? ''} latestReportId={index?.availableReports[0]} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24">
        {/* 페이지 제목 */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-wds-gray-950">기사 수집</h1>
        </div>

        {/* 안내 배너 */}
        <div className="mb-4 text-sm text-wds-gray-600 bg-white p-4 rounded-xl border border-wds-gray-200 shadow-wds-xs">
          <span>
            <strong>최근 14일 수집 기사</strong>를 토픽별로 확인합니다.
            기사 선별 및 스크리닝은 <strong>스크리닝</strong> 메뉴를 이용하세요.
          </span>
        </div>

        {/* 중간 토픽 필터 + 뉴스 총 개수 + 전체 선택/해제 */}
        <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
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
              뉴스 총 개수: <span className="text-wds-blue-600">{screened.length}</span>
            </div>
            <button
              onClick={selectAllVisible}
              className="shrink-0 text-[13px] font-semibold px-4 py-1.5 rounded-md border border-wds-gray-300 bg-white text-wds-gray-700 hover:bg-wds-gray-50 hover:text-wds-gray-950 transition-colors shadow-sm"
            >
              현재 표시 전체 선택
            </button>
            <button
              onClick={deselectAllVisible}
              disabled={!anyScreenedSelected}
              className="shrink-0 text-[13px] font-semibold px-4 py-1.5 rounded-md border border-wds-gray-300 bg-white text-wds-gray-700 hover:bg-wds-gray-50 hover:text-wds-gray-950 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              현재 표시 전체 해제
            </button>
          </div>
        </div>

        {/* 기사 목록 */}
        {loading ? (
          <div className="py-20 text-center text-[14px] text-wds-gray-500 font-medium">연관성 분석 중입니다...</div>
        ) : screened.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-wds-gray-500 bg-white rounded-xl border border-wds-gray-200 shadow-sm">
            {allArticles.length === 0 ? '수집된 기사가 없습니다.' : '해당 토픽의 기사가 없습니다.'}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {screened.map((article) => {
              const rank = rankMap.get(article.id) ?? 0
              const checked = selectedIds.has(article.id)
              const scoreInfo = getScoreLabel(article.relevanceScore, scoreMin, scoreMax)
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
                    <div className="mt-1 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="w-5 h-5 rounded border-wds-gray-400 text-wds-blue-500 focus:ring-wds-blue-500 cursor-pointer pointer-events-none"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 메타 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[11px] font-bold text-wds-gray-400 tabular-nums w-6">#{rank}</span>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ background: scoreInfo.bg, color: scoreInfo.text }}
                        >
                          {scoreInfo.label} {article.relevanceScore}점
                        </span>
                        <span className="text-wds-gray-300 text-[10px]">|</span>
                        <span className="text-[12px] font-semibold text-wds-gray-600">{article.source}</span>
                        <span className="text-wds-gray-300 text-[10px]">|</span>
                        <span className="text-[12px] text-wds-gray-500 tabular-nums">
                          {article.publishedAt.slice(0, 10)}
                        </span>
                        {article.isTranslated && <TranslationBadge />}
                        {article.topics.map((topic) => {
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
                        <p className="text-[14px] text-wds-gray-700 leading-relaxed line-clamp-2 mb-2">
                          {article.summary}
                        </p>
                      )}

                      {/* 전략 중요도 신호 + SK 연관성 + 중복 감점 */}
                      {(article.strategicSignals.length > 0 || article.skRelevance || article.isDuplicate) && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {article.strategicSignals.map((sig) => (
                            <span
                              key={sig}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold"
                              style={{ background: 'rgba(99,102,241,0.12)', color: '#4F46E5' }}
                            >
                              ⚡ {sig}
                            </span>
                          ))}
                          {article.skRelevance && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold"
                              style={{ background: 'rgba(239,68,68,0.10)', color: '#DC2626' }}
                            >
                              SK 연관
                            </span>
                          )}
                          {article.isDuplicate && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold"
                              style={{ background: 'rgba(112,115,124,0.10)', color: '#70737C' }}
                            >
                              중복 감점
                            </span>
                          )}
                        </div>
                      )}

                      {/* 원문 링크 */}
                      <div className="flex justify-end border-t border-wds-gray-100 pt-3 mt-1">
                        <a
                          href={article.originalUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation()
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

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-64 right-0 z-20 bg-white border-t border-wds-gray-200 shadow-[0_-4px_16px_rgba(23,23,23,0.06)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-wds-gray-950 font-semibold">
            <span className="text-wds-blue-500 font-bold text-[16px]">{selectedIds.size}개</span> 기사 선택됨
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={clearAll}
              className="text-[12px] font-semibold text-wds-gray-400 hover:text-red-500 transition-colors"
            >
              선택 초기화
            </button>
          )}
        </div>
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

export default function CollectPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center text-[14px] text-wds-gray-500 py-20">
        불러오는 중...
      </div>
    }>
      <CollectPageInner />
    </Suspense>
  )
}
