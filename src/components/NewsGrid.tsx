'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import type { Article, TopicId } from '@/lib/types'
import { NewsCard } from './NewsCard'
import { search } from '@/lib/search'

interface NewsGridProps {
  articles: Article[]
}

export function NewsGrid({ articles }: NewsGridProps) {
  const searchParams = useSearchParams()
  const activeTopic = searchParams.get('topic') as TopicId | null
  const query = searchParams.get('q') ?? ''

  const filtered = useMemo(() => {
    let result = articles
    if (activeTopic) result = result.filter((a) => a.topics.includes(activeTopic))
    if (query.length >= 2) result = search(query, result)
    return result
  }, [articles, activeTopic, query])

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <img
          src="/icons/circle-exclamation.svg"
          alt=""
          width={40}
          height={40}
          style={{ opacity: 0.2 }}
        />
        <p className="text-[14px] text-[rgba(55,56,60,0.40)] tracking-wide">
          검색 결과가 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filtered.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  )
}
