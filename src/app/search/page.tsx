'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { TranslationBadge } from '@/components/TranslationBadge'
import { TOPICS } from '@/lib/constants'
import type { TopicId, MetaIndex } from '@/lib/types'

interface SearchArticle {
  id: string
  title: string
  summary: string
  source: string
  sourceOrigin: 'domestic' | 'global'
  topics: TopicId[]
  publishedAt: string
  originalUrl: string
  isTranslated: boolean
}

interface SearchIndex {
  generatedAt: string
  totalCount: number
  articles: SearchArticle[]
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

const PAGE_SIZE = 30

const DATE_OPTIONS = [
  { label: '전체', days: 0 },
  { label: '최근 30일', days: 30 },
  { label: '최근 90일', days: 90 },
  { label: '최근 180일', days: 180 },
]

function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length || !text) return <>{text}</>
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        tokens.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-yellow-100 text-yellow-900 rounded-sm not-italic">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

export default function SearchPage() {
  const [index, setIndex] = useState<MetaIndex | null>(null)
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeTopics, setActiveTopics] = useState<Set<string>>(new Set())
  const [activeDays, setActiveDays] = useState(0)
  const [activeOrigin, setActiveOrigin] = useState<'전체' | 'domestic' | 'global'>('전체')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [daysOpen, setDaysOpen] = useState(false)
  const [originOpen, setOriginOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const daysRef = useRef<HTMLDivElement>(null)
  const originRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (daysRef.current && !daysRef.current.contains(e.target as Node)) setDaysOpen(false)
      if (originRef.current && !originRef.current.contains(e.target as Node)) setOriginOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    Promise.all([
      fetchJson<MetaIndex>('/data/index.json'),
      fetchJson<SearchIndex>('/data/search-index.json'),
    ]).then(([idx, si]) => {
      setIndex(idx)
      if (!si) setError(true)
      else setSearchIndex(si)
      setLoading(false)
    })
  }, [])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(value)
      setVisibleCount(PAGE_SIZE)
    }, 200)
  }, [])

  const tokens = useMemo(
    () => debouncedQuery.trim().split(/\s+/).filter((t) => t.length >= 1),
    [debouncedQuery],
  )

  const cutoffDate = useMemo(() => {
    if (activeDays === 0) return null
    const d = new Date()
    d.setDate(d.getDate() - activeDays)
    return d.toISOString().split('T')[0]
  }, [activeDays])

  const results = useMemo(() => {
    if (!searchIndex) return []

    let items = searchIndex.articles

    // 기간 필터
    if (cutoffDate) {
      items = items.filter((a) => a.publishedAt.slice(0, 10) >= cutoffDate)
    }

    // 출처 필터
    if (activeOrigin !== '전체') {
      items = items.filter((a) => a.sourceOrigin === activeOrigin)
    }

    // 토픽 필터 (선택된 토픽 중 하나라도 포함하면 통과)
    if (activeTopics.size > 0) {
      items = items.filter((a) => a.topics.some((t) => activeTopics.has(t)))
    }

    // 키워드 검색 (AND)
    if (tokens.length > 0) {
      items = items.filter((a) => {
        const haystack = `${a.title} ${a.summary} ${a.source}`.toLowerCase()
        return tokens.every((t) => haystack.includes(t.toLowerCase()))
      })
    }

    return items
  }, [searchIndex, tokens, activeTopics, cutoffDate, activeOrigin])

  const visible = results.slice(0, visibleCount)
  const hasMore = visibleCount < results.length

  const isSearching = debouncedQuery.trim().length > 0 || activeTopics.size > 0 || activeDays !== 0 || activeOrigin !== '전체'

  function clearAll() {
    setQuery('')
    setDebouncedQuery('')
    setActiveTopics(new Set())
    setActiveDays(0)
    setActiveOrigin('전체')
    setVisibleCount(PAGE_SIZE)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full bg-wds-gray-50">
      <Header lastUpdated={index?.lastUpdated ?? ''} latestReportId={index?.availableReports?.[0]} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* 제목 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-wds-gray-950">뉴스 검색</h1>
          {!loading && searchIndex && (
            <p className="mt-1 text-[13px] text-wds-gray-500">
              누적 기사 {searchIndex.totalCount.toLocaleString()}개 전체 검색
            </p>
          )}
        </div>

        {/* 검색 입력 */}
        <div className="mb-4 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-wds-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="키워드로 검색 (예: 태양광 정책, SMR, 탄소중립)"
            className="w-full rounded-xl pl-11 pr-10 py-3 text-[15px] bg-white border border-wds-gray-200 text-wds-gray-950 placeholder:text-wds-gray-400 focus:outline-none focus:border-wds-blue-500 focus:ring-2 focus:ring-[rgba(0,102,255,0.12)] shadow-wds-xs transition-all"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-wds-gray-400 hover:text-wds-gray-700 transition-colors"
              aria-label="검색어 지우기"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* 필터 영역 */}
        <div className="mb-5">
          {/* 카테고리 chips (다중 선택) */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {/* 전체: 아무것도 선택 안 됐을 때 활성 / 클릭 시 전체 해제 */}
            <button
              onClick={() => { setActiveTopics(new Set()); setVisibleCount(PAGE_SIZE) }}
              className="px-3 py-1 text-[12px] font-semibold rounded-full border transition-all"
              style={
                activeTopics.size === 0
                  ? { background: '#4A4B52', color: '#fff', borderColor: '#4A4B52' }
                  : { background: '#fff', color: '#70737C', borderColor: 'rgba(112,115,124,0.24)' }
              }
            >
              전체
            </button>
            {TOPICS.map((t) => {
              const active = activeTopics.has(t.id)
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTopics((prev) => {
                      const next = new Set(prev)
                      if (next.has(t.id)) next.delete(t.id)
                      else next.add(t.id)
                      return next
                    })
                    setVisibleCount(PAGE_SIZE)
                  }}
                  className="px-3 py-1 text-[12px] font-semibold rounded-full border transition-all"
                  style={
                    active
                      ? { background: '#4A4B52', color: '#fff', borderColor: '#4A4B52' }
                      : { background: '#fff', color: '#70737C', borderColor: 'rgba(112,115,124,0.24)' }
                  }
                >
                  {t.id}
                </button>
              )
            })}
          </div>

          {/* 드롭다운 행 */}
          <div className="mt-3 flex items-center gap-2">
            {/* 발행 기간 드롭다운 */}
            <div ref={daysRef} className="relative">
              <button
                onClick={() => { setDaysOpen((o) => !o); setOriginOpen(false) }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border transition-all ${
                  activeDays !== 0
                    ? 'bg-[#4A4B52] text-white border-[#4A4B52]'
                    : 'bg-white text-wds-gray-600 border-wds-gray-200 hover:border-wds-gray-400 hover:text-wds-gray-950'
                }`}
              >
                발행 기간: {DATE_OPTIONS.find((o) => o.days === activeDays)?.label}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${daysOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {daysOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-wds-gray-200 shadow-[0_8px_24px_rgba(0,0,0,0.10)] z-30 min-w-[148px] py-1.5 overflow-hidden">
                  {DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      onClick={() => { setActiveDays(opt.days); setDaysOpen(false); setVisibleCount(PAGE_SIZE) }}
                      className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between gap-4 transition-colors ${
                        activeDays === opt.days
                          ? 'text-[#0066FF] font-semibold bg-[rgba(0,102,255,0.05)]'
                          : 'text-wds-gray-700 font-medium hover:bg-wds-gray-50'
                      }`}
                    >
                      {opt.label}
                      {activeDays === opt.days && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 영역 드롭다운 */}
            <div ref={originRef} className="relative">
              <button
                onClick={() => { setOriginOpen((o) => !o); setDaysOpen(false) }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border transition-all ${
                  activeOrigin !== '전체'
                    ? 'bg-[#4A4B52] text-white border-[#4A4B52]'
                    : 'bg-white text-wds-gray-600 border-wds-gray-200 hover:border-wds-gray-400 hover:text-wds-gray-950'
                }`}
              >
                영역: {activeOrigin === '전체' ? '전체' : activeOrigin === 'domestic' ? '국내' : '글로벌'}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${originOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {originOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-wds-gray-200 shadow-[0_8px_24px_rgba(0,0,0,0.10)] z-30 min-w-[120px] py-1.5 overflow-hidden">
                  {(['전체', 'domestic', 'global'] as const).map((o) => {
                    const label = o === '전체' ? '전체' : o === 'domestic' ? '국내' : '글로벌'
                    return (
                      <button
                        key={o}
                        onClick={() => { setActiveOrigin(o); setOriginOpen(false); setVisibleCount(PAGE_SIZE) }}
                        className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between gap-4 transition-colors ${
                          activeOrigin === o
                            ? 'text-[#0066FF] font-semibold bg-[rgba(0,102,255,0.05)]'
                            : 'text-wds-gray-700 font-medium hover:bg-wds-gray-50'
                        }`}
                      >
                        {label}
                        {activeOrigin === o && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 초기화 */}
            {isSearching && (
              <button
                onClick={clearAll}
                className="ml-auto text-[12px] text-wds-gray-400 hover:text-wds-gray-950 transition-colors flex items-center gap-1"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 결과 영역 */}
        {loading ? (
          <div className="py-20 text-center text-[14px] text-wds-gray-500">검색 인덱스 로딩 중...</div>
        ) : error ? (
          <div className="py-20 text-center bg-white rounded-xl border border-wds-gray-200 shadow-wds-xs">
            <p className="text-[14px] text-wds-gray-600 font-medium mb-1">검색 인덱스가 없습니다.</p>
            <p className="text-[13px] text-wds-gray-400">
              <code className="bg-wds-gray-100 px-1.5 py-0.5 rounded text-[12px]">npm run build-search-index</code>를 실행해 주세요.
            </p>
          </div>
        ) : !isSearching ? (
          <div className="py-24 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-wds-gray-100 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#70737C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-wds-gray-700">키워드를 입력하세요</p>
            <p className="mt-1 text-[13px] text-wds-gray-400">에너지·전력 분야 누적 기사를 전체 검색합니다</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-xl border border-wds-gray-200 shadow-wds-xs">
            <p className="text-[14px] font-semibold text-wds-gray-700 mb-1">검색 결과가 없습니다</p>
            <p className="text-[13px] text-wds-gray-400">다른 키워드나 필터를 시도해 보세요</p>
          </div>
        ) : (
          <>
            {/* 결과 수 */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[13px] text-wds-gray-500">
                <span className="font-bold text-wds-gray-950">{results.length.toLocaleString()}</span>건
                {tokens.length > 0 && (
                  <span className="ml-1">
                    — &ldquo;{tokens.join(' ')}&rdquo;
                  </span>
                )}
              </span>
            </div>

            {/* 기사 목록 */}
            <ul className="flex flex-col gap-3">
              {visible.map((article) => {
                const dateStr = article.publishedAt.slice(0, 10)
                return (
                  <li
                    key={article.id}
                    className="bg-white rounded-2xl border border-wds-gray-200 p-5 shadow-wds-xs hover:border-wds-gray-400 hover:shadow-wds-md transition-all"
                  >
                    {/* 메타 */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-wds-gray-600">{article.source}</span>
                      <span className="text-wds-gray-200 text-[10px]">|</span>
                      <time className="text-[12px] text-wds-gray-400 tabular-nums">{dateStr}</time>
                      {article.isTranslated && <TranslationBadge />}
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-wds-gray-200 text-wds-gray-400">
                        {article.sourceOrigin === 'domestic' ? '국내' : '글로벌'}
                      </span>
                      {article.topics.map((topic) => {
                        const cfg = TOPICS.find((t) => t.id === topic)
                        if (!cfg) return null
                        return (
                          <span
                            key={topic}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold"
                            style={{ background: cfg.chipBg, color: cfg.chipText }}
                          >
                            {cfg.label}
                          </span>
                        )
                      })}
                    </div>

                    {/* 제목 */}
                    <p className="text-[15px] font-bold text-wds-gray-950 leading-snug mb-1.5">
                      <Highlight text={article.title} tokens={tokens} />
                    </p>

                    {/* 요약 */}
                    {article.summary && (
                      <p className="text-[13px] text-wds-gray-600 leading-relaxed line-clamp-2 mb-3">
                        <Highlight text={article.summary} tokens={tokens} />
                      </p>
                    )}

                    {/* 원문 링크 */}
                    <Link
                      href={article.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-wds-blue-600 hover:text-wds-blue-700 transition-colors"
                    >
                      원문 보기
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* 더 보기 */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="px-6 py-2.5 text-[13px] font-semibold rounded-lg border border-wds-gray-300 bg-white text-wds-gray-700 hover:bg-wds-gray-50 hover:border-wds-gray-400 shadow-wds-xs transition-all"
                >
                  더 보기 ({results.length - visibleCount}건 남음)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
