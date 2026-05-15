'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Header } from '@/components/Header'
import { TranslationBadge } from '@/components/TranslationBadge'
import { TOPICS } from '@/lib/constants'
import { screenArticles, getScoreLabel } from '@/lib/screening'
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

export default function ScreeningPage() {
  const [index, setIndex] = useState<MetaIndex | null>(null)
  const [allArticles, setAllArticles] = useState<Article[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeTopic, setActiveTopic] = useState<string>('전체')
  const [loading, setLoading] = useState(true)

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

  const screened = useMemo(() => screenArticles(allArticles, 50), [allArticles])

  // id → 전체 순위(1-based) 맵 — 토픽 필터 후에도 원래 순위 표시용
  const rankMap = useMemo(
    () => new Map(screened.map((a, i) => [a.id, i + 1])),
    [screened]
  )

  const filteredScreened = useMemo(() => {
    if (activeTopic === '전체') return screened
    return screened.filter((a) => a.topics.includes(activeTopic as Article['topics'][0]))
  }, [screened, activeTopic])

  function toggleArticle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveSelection(Array.from(next))
      return next
    })
  }

  function toggleAll() {
    const allFilteredIds = new Set(filteredScreened.map((a) => a.id))
    const allSelected = filteredScreened.length > 0 && filteredScreened.every((a) => selectedIds.has(a.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) allFilteredIds.forEach((id) => next.delete(id))
      else allFilteredIds.forEach((id) => next.add(id))
      saveSelection(Array.from(next))
      return next
    })
  }

  const allFilteredSelected = filteredScreened.length > 0 && filteredScreened.every((a) => selectedIds.has(a.id))

  return (
    <div className="flex flex-col h-full bg-wds-gray-50 relative">
      <Header lastUpdated={index?.lastUpdated ?? ''} latestReportId={index?.availableReports[0]} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/collect"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-wds-gray-500 hover:text-wds-gray-900 transition-colors"
          >
            <ArrowLeft size={15} />
            기사 선택으로 돌아가기
          </Link>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Sparkles size={20} className="text-wds-blue-500" />
            <h1 className="text-2xl font-bold text-wds-gray-950">키워드 연관성 스크리닝</h1>
          </div>
        </div>

        <div className="mb-5 text-sm text-wds-gray-600 bg-white p-4 rounded-xl border border-wds-gray-200 shadow-wds-xs">
          <strong>안내:</strong> 최근 14일 기사 중 토픽 키워드(계통·ESS·탄소중립 등)와 연관성이 높은 순으로 상위 50개를 표시합니다.
          뉴스레터에 포함할 기사를 선택한 후 하단의 <strong>뉴스레터 생성하기</strong>를 누르세요.
          기사 선택 페이지의 선택 항목과 통합됩니다.
        </div>

        {/* 토픽 필터 + 전체 선택/해제 */}
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
              뉴스 총 개수: <span className="text-wds-blue-600">{filteredScreened.length}</span>
            </div>
            <button
              onClick={toggleAll}
              className="shrink-0 text-[13px] font-semibold px-4 py-1.5 rounded-md border border-wds-gray-300 bg-white text-wds-gray-700 hover:bg-wds-gray-50 hover:text-wds-gray-950 transition-colors shadow-sm"
            >
              {allFilteredSelected ? '현재 토픽 전체 해제' : '현재 토픽 전체 선택'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[14px] text-wds-gray-500 font-medium">
            연관성 분석 중입니다...
          </div>
        ) : filteredScreened.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-wds-gray-500 bg-white rounded-xl border border-wds-gray-200 shadow-sm">
            해당 토픽의 기사가 없습니다.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredScreened.map((article) => {
              const rank = rankMap.get(article.id) ?? 0
              const checked = selectedIds.has(article.id)
              const scoreInfo = getScoreLabel(article.relevanceScore)
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
                    {/* 체크박스 */}
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
                        {/* 순위 */}
                        <span className="text-[11px] font-bold text-wds-gray-400 tabular-nums w-6">#{rank}</span>
                        {/* 연관성 점수 배지 */}
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

                      {/* 매칭 키워드 */}
                      {article.matchedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="text-[11px] text-wds-gray-400 font-medium mt-0.5">매칭:</span>
                          {article.matchedKeywords.slice(0, 6).map((kw) => (
                            <span
                              key={kw}
                              className="inline-block px-2 py-0.5 bg-wds-gray-100 text-wds-gray-600 rounded text-[11px] font-medium"
                            >
                              {kw}
                            </span>
                          ))}
                          {article.matchedKeywords.length > 6 && (
                            <span className="text-[11px] text-wds-gray-400 mt-0.5">
                              +{article.matchedKeywords.length - 6}개
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
        <span className="text-[14px] text-wds-gray-950 font-semibold">
          <span className="text-wds-blue-500 font-bold text-[16px]">{selectedIds.size}개</span> 기사 선택됨
          <span className="text-[12px] text-wds-gray-400 ml-2 font-normal">(기사 선택 페이지 포함)</span>
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
