'use client'

import { forwardRef } from 'react'
import { TOPICS } from '@/lib/constants'
import type { Article } from '@/lib/types'

const HEADER_BG = '#1B1C1E'

interface Props {
  articles: Article[]
  dateLabel?: string
}

const NewsletterContent = forwardRef<HTMLDivElement, Props>(
  ({ articles, dateLabel }, ref) => {
    const grouped = TOPICS.map((t) => ({
      topic: t,
      items: articles.filter((a) => a.topics.includes(t.id)),
    })).filter((g) => g.items.length > 0)

    const unclassified = articles.filter((a) => !a.topics.length)

    const displayDate =
      dateLabel ??
      new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

    return (
      <div
        ref={ref}
        style={{
          fontFamily: '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
          maxWidth: '680px',
          margin: '0 auto',
          backgroundColor: '#F7F7F8',
          padding: '0 0 32px 0',
        }}
      >
        {/* 마스트헤드 */}
        <div style={{
          backgroundColor: HEADER_BG,
          padding: '32px 32px 28px 32px',
          marginBottom: '24px',
          borderRadius: '12px 12px 0 0',
        }}>
          <span style={{ fontSize: '29px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.02em', display: 'block', marginBottom: '8px' }}>
            Energy Insight Newsletter
          </span>
          <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'rgba(255,255,255,0.72)', fontWeight: '500' }}>
            전력·에너지 솔루션 최신 동향 큐레이션&nbsp;·&nbsp;{displayDate}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {grouped.map(({ topic }) => (
              <a key={topic.id} href={`#${topic.id}`} style={{
                backgroundColor: '#FFFFFF', color: '#4B5563',
                padding: '6px 16px', borderRadius: '20px',
                fontSize: '13px', fontWeight: '700', textDecoration: 'none',
                border: '1px solid #D1D5DB', display: 'inline-block',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4)',
              }}>
                {topic.label}
              </a>
            ))}
            {unclassified.length > 0 && (
              <a href="#기타" style={{
                backgroundColor: '#FFFFFF', color: '#4B5563',
                padding: '6px 16px', borderRadius: '20px',
                fontSize: '13px', fontWeight: '700', textDecoration: 'none',
                border: '1px solid #D1D5DB', display: 'inline-block',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4)',
              }}>
                기타
              </a>
            )}
          </div>
        </div>

        {/* 토픽 섹션 */}
        {grouped.map(({ topic, items }) => (
          <div key={topic.id} id={topic.id} style={{ marginBottom: '32px', padding: '0 8px' }}>
            <h2 style={{
              fontSize: '28px', fontWeight: '900', color: '#000000',
              marginBottom: '20px', letterSpacing: '-0.03em',
              textTransform: 'uppercase', borderBottom: '2px solid #000000',
              paddingBottom: '8px',
            }}>
              {topic.label}
            </h2>
            <div style={{ columnCount: 2, columnGap: '16px' }}>
              {items.map((article) => (
                <div key={article.id} style={{ breakInside: 'avoid', marginBottom: '16px' }}>
                  <ArticleCard article={article} topicLabel={topic.label} />
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
              marginBottom: '20px', letterSpacing: '-0.03em',
              textTransform: 'uppercase', borderBottom: '2px solid #000000',
              paddingBottom: '8px',
            }}>
              기타
            </h2>
            <div style={{ columnCount: 2, columnGap: '16px' }}>
              {unclassified.map((article) => (
                <div key={article.id} style={{ breakInside: 'avoid', marginBottom: '16px' }}>
                  <ArticleCard article={article} topicLabel="기타" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div style={{
          backgroundColor: '#FFFFFF', padding: '24px 32px',
          marginTop: '24px', textAlign: 'center',
          borderRadius: '0 0 12px 12px', boxShadow: '0 -2px 10px rgba(0,0,0,0.02)',
        }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>
            본 뉴스레터는 에너지 인사이트 시스템에 의해 자동 생성되었습니다.
          </p>
        </div>
      </div>
    )
  }
)

NewsletterContent.displayName = 'NewsletterContent'
export { NewsletterContent }

// ── 기사 카드 ──────────────────────────────────────────────
function ArticleCard({ article, topicLabel }: { article: Article; topicLabel: string }) {
  return (
    <a
      href={article.originalUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', textDecoration: 'none',
        cursor: article.originalUrl ? 'pointer' : 'default',
        backgroundColor: '#FFFFFF', borderRadius: '12px',
        boxShadow: '4px 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden', border: '1px solid #F3F4F6',
      }}
    >
      <div style={{ backgroundColor: '#F4F4F5', padding: '16px 20px 14px 20px', borderBottom: '1px solid #E5E7EB' }}>
        <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {topicLabel}
        </p>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#000000', lineHeight: '1.45', letterSpacing: '-0.02em' }}>
          {article.title}
        </h3>
      </div>
      <div style={{ padding: '16px 20px 18px 20px' }}>
        {article.summary && (
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#374151', lineHeight: '1.7', wordBreak: 'keep-all' }}>
            {article.summary}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600' }}>
            {article.source}&nbsp;·&nbsp;{article.publishedAt.slice(0, 10)}
          </span>
          {article.originalUrl && (
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#000000', whiteSpace: 'nowrap' }}>
              원문 보기 →
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
