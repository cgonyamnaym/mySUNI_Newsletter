'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Article } from '@/lib/types'
import { getPeriodStart } from '@/lib/biweek'

interface Props {
  availableDates: string[]   // 최근 N일 날짜 목록 (desc)
  initialDate: string
  initialArticles: Article[]
  initialCount: number
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

function fmtBtn(dateStr: string) {
  const [, m, d] = dateStr.split('-').map(Number)
  const dow = DOW[new Date(dateStr).getDay()]
  return `${m}/${d} (${dow})`
}

export function DailyArticlesFeed({ availableDates, initialDate, initialArticles, initialCount }: Props) {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [articles, setArticles] = useState(initialArticles)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function selectDate(date: string) {
    if (date === selectedDate) return
    setSelectedDate(date)
    setLoading(true)
    try {
      const res = await fetch(`/data/daily/${date}.json`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.articles?.slice(0, 5) ?? [])
        setCount(data.articleCount ?? data.articles?.length ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }

  const archiveHref = `/archive/${getPeriodStart(selectedDate)}`

  return (
    <div className="bg-white rounded-2xl p-6 border border-wds-gray-200 shadow-wds-xs">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold text-wds-gray-950">수집 기사</h2>
          <span className="text-[12px] font-bold text-wds-blue-500 bg-wds-blue-50 px-2 py-0.5 rounded-full tabular-nums">
            {count}건
          </span>
        </div>
        <Link
          href={archiveHref}
          className="text-[12px] font-bold text-wds-blue-500 hover:text-wds-blue-600 transition-colors"
        >
          모두 보기 →
        </Link>
      </div>

      {/* 날짜 필터 버튼 */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {availableDates.map(date => (
          <button
            key={date}
            onClick={() => selectDate(date)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
              date === selectedDate
                ? 'bg-wds-blue-500 text-white shadow-sm'
                : 'bg-wds-gray-100 text-wds-gray-600 hover:bg-wds-gray-200'
            }`}
          >
            {fmtBtn(date)}
          </button>
        ))}
      </div>

      {/* 기사 목록 */}
      <div className="flex flex-col gap-4 min-h-[120px]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-wds-blue-200 border-t-wds-blue-500 rounded-full animate-spin" />
          </div>
        ) : articles.length > 0 ? (
          articles.map(article => (
            <a
              key={article.id}
              href={article.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-wds-gray-50 border border-wds-gray-100 flex items-center justify-center shrink-0">
                <span className="text-wds-gray-950 font-black text-[12px]">{article.source.charAt(0)}</span>
              </div>
              <div className="min-w-0 flex-1 border-b border-wds-gray-100 pb-4 group-last:border-0 group-last:pb-0">
                <h4 className="text-[14px] font-bold text-wds-gray-950 truncate leading-snug mb-1 group-hover:text-wds-blue-500 transition-colors">
                  {article.title}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-wds-gray-500">{article.source}</span>
                  <span className="text-wds-gray-300 text-[10px]">|</span>
                  <span className="text-[11px] text-wds-gray-400 tabular-nums">
                    {article.publishedAt.slice(11, 16) || article.publishedAt.slice(0, 10)}
                  </span>
                </div>
              </div>
            </a>
          ))
        ) : (
          <p className="text-[13px] text-wds-gray-400 py-4 text-center">수집된 기사가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
