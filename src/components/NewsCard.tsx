import type { Article } from '@/lib/types'
import { TopicBadge } from './TopicBadge'
import { TranslationBadge } from './TranslationBadge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface NewsCardProps {
  article: Article
}

function SourceInitial({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-[6px] bg-wds-gray-950 text-white text-[10px] font-black shrink-0">
      {source.charAt(0)}
    </span>
  )
}

export function NewsCard({ article }: NewsCardProps) {
  const publishedDate = format(new Date(article.publishedAt), 'MM. dd.', { locale: ko })

  return (
    <article className="bg-white rounded-lg border border-[rgba(112,115,124,0.16)] p-5 flex flex-col gap-3.5 hover:shadow-wds-lg transition-shadow duration-200">
      {/* Source row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <SourceInitial source={article.source} />
          <span className="text-[12px] font-semibold text-[rgba(55,56,60,0.61)] tracking-[0.025em] truncate">
            {article.source}
          </span>
          {article.isTranslated && <TranslationBadge />}
        </div>
        <time
          dateTime={article.publishedAt}
          className="text-[11px] text-[rgba(55,56,60,0.40)] tracking-[0.031em] shrink-0"
        >
          {publishedDate}
        </time>
      </div>

      {/* Title */}
      <h2 className="text-[17px] font-bold leading-[1.3] tracking-[-0.010em] text-[#000] line-clamp-2">
        {article.title}
      </h2>

      {/* Summary */}
      <p className="text-[13px] font-[500] text-[rgba(55,56,60,0.61)] leading-[1.54] tracking-[0.019em] line-clamp-3 flex-1">
        {article.summary || '요약 정보가 없습니다.'}
      </p>

      {/* Footer: topics + link */}
      <div className="flex items-end justify-between gap-2 pt-0.5 border-t border-[rgba(112,115,124,0.08)] mt-auto">
        <div className="flex flex-wrap gap-1">
          {article.topics.map((topic) => (
            <TopicBadge key={topic} topic={topic} small />
          ))}
        </div>
        <a
          href={article.originalUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`shrink-0 text-[12px] font-bold whitespace-nowrap transition-colors ${
            article.originalUrl ? 'text-[#0066FF] hover:text-[#005EEB]' : 'text-[rgba(112,115,124,0.40)] cursor-not-allowed'
          }`}
          onClick={(e) => {
            if (!article.originalUrl) {
              e.preventDefault()
              alert('원문 링크가 존재하지 않습니다.')
            }
          }}
        >
          원문 →
        </a>
      </div>
    </article>
  )
}
