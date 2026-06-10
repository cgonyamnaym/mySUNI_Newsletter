'use client'

import { forwardRef, useState, useEffect } from 'react'
import type { Article, TopicId } from '@/lib/types'

// 뉴스레터 전용 카테고리 색상 (목업 기준)
type CatStyle = {
  accent: string
  accentEnd: string
  chipBg: string
  chipText: string
  dot: string
}

const CAT: Record<TopicId, CatStyle> = {
  '전력 인프라':    { accent: '#0066FF', accentEnd: '#4D9FFF', chipBg: 'rgba(0,102,255,0.08)',   chipText: '#0066FF', dot: '#0066FF' },
  '에너지원':       { accent: '#D97706', accentEnd: '#F59E0B', chipBg: 'rgba(217,119,6,0.08)',    chipText: '#D97706', dot: '#D97706' },
  '운영 최적화':    { accent: '#059669', accentEnd: '#10B981', chipBg: 'rgba(5,150,105,0.08)',    chipText: '#059669', dot: '#059669' },
  '정책·규제':      { accent: '#7C3AED', accentEnd: '#A78BFA', chipBg: 'rgba(124,58,237,0.08)',   chipText: '#7C3AED', dot: '#7C3AED' },
  'ESG·탄소중립':   { accent: '#0891B2', accentEnd: '#22D3EE', chipBg: 'rgba(8,145,178,0.08)',    chipText: '#0891B2', dot: '#0891B2' },
  '시장·가격 동향': { accent: '#DC2626', accentEnd: '#F87171', chipBg: 'rgba(220,38,38,0.08)',    chipText: '#DC2626', dot: '#DC2626' },
}

const FALLBACK_CAT: CatStyle = {
  accent: '#6B7280', accentEnd: '#9CA3AF',
  chipBg: 'rgba(107,114,128,0.08)', chipText: '#6B7280', dot: '#6B7280',
}

const TOPIC_ORDER: TopicId[] = [
  '전력 인프라', '에너지원', '운영 최적화', '정책·규제', 'ESG·탄소중립', '시장·가격 동향',
]

type EmojiEntry = { type: 'text'; value: string } | { type: 'img'; src: string }
const TOPIC_EMOJI: Partial<Record<TopicId, EmojiEntry>> = {
  '전력 인프라':    { type: 'text', value: '⚡' },
  '에너지원':       { type: 'text', value: '🔋' },
  '운영 최적화':    { type: 'text', value: '⚙️' },
  '정책·규제':      { type: 'text', value: '🏛️' },
  'ESG·탄소중립':   { type: 'text', value: '🌿' },
  '시장·가격 동향': { type: 'text', value: '📈' },
}
function TopicEmoji({ id, size }: { id: TopicId; size: number }) {
  const e = TOPIC_EMOJI[id]
  if (!e) return null
  return e.type === 'text'
    ? <span style={{ fontSize: size, lineHeight: 1 }}>{e.value}</span>
    : <img src={e.src} alt="" style={{ width: size, height: size, objectFit: 'contain', verticalAlign: 'middle' }} />
}

interface Props {
  articles: Article[]
  dateLabel?: string
}

const NewsletterContent = forwardRef<HTMLDivElement, Props>(
  ({ articles, dateLabel }, ref) => {
    // primaryTopic 우선, 없으면 첫 번째 topic, 없으면 uncategorized
    const groupMap = new Map<TopicId, Article[]>()
    const unclassified: Article[] = []

    for (const article of articles) {
      const topic = article.primaryTopic ?? article.topics[0] ?? null
      if (topic) {
        if (!groupMap.has(topic)) groupMap.set(topic, [])
        groupMap.get(topic)!.push(article)
      } else {
        unclassified.push(article)
      }
    }

    const groups = TOPIC_ORDER
      .filter((t) => groupMap.has(t))
      .map((t) => ({ topicId: t, items: groupMap.get(t)! }))

    const isoDate = dateLabel && /^\d{4}-\d{2}-\d{2}$/.test(dateLabel)
      ? dateLabel
      : new Date().toISOString().slice(0, 10)

    const sourceCount = new Set(articles.map((a) => a.sourceId)).size
    const topicCount = groups.length + (unclassified.length > 0 ? 1 : 0)

    return (
      <div
        ref={ref}
        style={{
          fontFamily: '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
          backgroundColor: '#F0F2F5',
          color: '#1A1D23',
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          background: '#FFFFFF',
          position: 'relative',
        }}>
          {/* Header inner */}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 32px', position: 'relative' }}>
            {/* Date at top right */}
            <div style={{
              position: 'absolute', top: '40px', right: '24px',
              fontSize: '12px', color: '#9CA3AF', fontWeight: 500,
            }}>
              [발행일자 : {isoDate}]
            </div>

            {/* Title */}
            <div style={{
              fontSize: '32px', fontWeight: 900,
              color: '#111827', letterSpacing: '-0.5px',
              lineHeight: 1.2, marginBottom: '24px',
            }}>
              Electrification & Energy Solution<br />
              <span style={{ color: '#2563EB' }}>Bi-Weekly AI Newsletter</span>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                  {articles.length}
                </div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px', letterSpacing: '0.5px' }}>
                  ARTICLES
                </div>
              </div>
              <div style={{ width: '1px', background: '#E5E7EB', alignSelf: 'stretch' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                  {topicCount}
                </div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px', letterSpacing: '0.5px' }}>
                  TOPICS
                </div>
              </div>
              <div style={{ width: '1px', background: '#E5E7EB', alignSelf: 'stretch' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                  {sourceCount}
                </div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px', letterSpacing: '0.5px' }}>
                  SOURCES
                </div>
              </div>
            </div>
          </div>

          {/* Category tab nav */}
          <div style={{
            background: '#EFF6FF',
            borderTop: '1px solid #DBEAFE',
          }}>
            <div style={{
              maxWidth: '800px', margin: '0 auto', padding: '0 24px',
              display: 'flex', overflowX: 'auto',
            }}>
              {groups.map(({ topicId }, idx) => {
                const c = CAT[topicId] ?? FALLBACK_CAT
                return (
                  <a
                    key={topicId}
                    href={`#nl-${topicId}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '12px 16px',
                      fontSize: '12px', fontWeight: 700,
                      color: idx === 0 ? c.dot : `${c.dot}99`,
                      whiteSpace: 'nowrap',
                      borderBottom: idx === 0 ? `2px solid ${c.dot}` : '2px solid transparent',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: c.dot, display: 'inline-block', flexShrink: 0,
                    }} />
                    <TopicEmoji id={topicId} size={13} />
                    {topicId}
                    <span style={{
                      fontSize: '10px',
                      background: 'rgba(0,0,0,0.06)',
                      color: '#6B7280',
                      padding: '1px 5px', borderRadius: '10px',
                    }}>
                      {groupMap.get(topicId)!.length}
                    </span>
                  </a>
                )
              })}
              {unclassified.length > 0 && (
                <a
                  href="#nl-기타"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '12px 16px',
                    fontSize: '12px', fontWeight: 700,
                    color: '#9CA3AF',
                    whiteSpace: 'nowrap',
                    borderBottom: '2px solid transparent',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#6B7280', display: 'inline-block', flexShrink: 0,
                  }} />
                  기타
                  <span style={{
                    fontSize: '10px',
                    background: 'rgba(0,0,0,0.06)',
                    color: '#6B7280',
                    padding: '1px 5px', borderRadius: '10px',
                  }}>
                    {unclassified.length}
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* Bottom accent gradient bar */}
          <div style={{
            height: '3px',
            background: 'linear-gradient(90deg, #0066FF 0%, #00B4D8 40%, #06D6A0 100%)',
          }} />
        </div>

        {/* ── BODY ── */}
        <div style={{
          maxWidth: '800px', margin: '0 auto',
          padding: '32px 24px',
          display: 'flex', flexDirection: 'column', gap: '48px',
        }}>
          {groups.map(({ topicId, items }) => {
            const c = CAT[topicId] ?? FALLBACK_CAT
            return (
              <section key={topicId} id={`nl-${topicId}`}>
                {/* Section header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '16px', paddingBottom: '10px',
                  borderBottom: '2px solid #E5E7EB',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TopicEmoji id={topicId} size={26} />
                    <span style={{
                      fontSize: '22px', fontWeight: 800,
                      color: c.accent, letterSpacing: '-0.3px',
                    }}>
                      {topicId}
                    </span>
                  </div>
                </div>

                {/* 2-column card grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  alignItems: 'stretch',
                }}>
                  {items.map((article) => (
                    <ArticleCard key={article.id} article={article} catStyle={c} topicLabel={topicId} />
                  ))}
                </div>
              </section>
            )
          })}

          {/* 미분류 */}
          {unclassified.length > 0 && (
            <section id="nl-기타">
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '16px', paddingBottom: '10px',
                borderBottom: '2px solid #E5E7EB',
              }}>
                <span style={{
                  fontSize: '22px', fontWeight: 800,
                  color: '#111827', letterSpacing: '-0.3px',
                }}>
                  기타
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                alignItems: 'stretch',
              }}>
                {unclassified.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    catStyle={FALLBACK_CAT}
                    topicLabel="기타"
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── SUBSCRIBE ── */}
        <div style={{
          background: '#F0F2F5',
          padding: '48px 24px',
        }}>
          <div style={{
            maxWidth: '800px', margin: '0 auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '10px' }}>
              무료 구독 신청
            </div>
            <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.8, margin: '0 0 20px 0' }}>
              대시보드에서는 더 많은 기사를 직접 선택하고, 뉴스레터를 생성할 수 있어요.<br />
              아래 이메일 주소를 입력해주시면, 대시보드 권한 부여해드려요.
            </p>
            <SubscribeForm />
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          background: '#0A1628', padding: '32px 24px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '14px', color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.8, margin: 0,
          }}>
            최근 2주간의 AI 뉴스 큐레이션 결과를 바탕으로 자동 생성된 뉴스레터 입니다.<br />
            문의 : SKI mySUNI 경영관리역량 조혜경RF
          </p>
        </div>
      </div>
    )
  }
)

NewsletterContent.displayName = 'NewsletterContent'
export { NewsletterContent }

// ── 기사 카드 ──────────────────────────────────────────────────
function ArticleCard({
  article,
  catStyle,
  topicLabel,
}: {
  article: Article
  catStyle: CatStyle
  topicLabel: string
}) {
  const ns = article.newsletterSummary

  return (
    <a
      href={article.originalUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', flexDirection: 'column',
        textDecoration: 'none', color: 'inherit',
        background: '#fff', borderRadius: '16px',
        border: '1px solid #E9ECEF',
        boxShadow: '4px 6px 16px rgba(0,0,0,0.10), 1px 2px 4px rgba(0,0,0,0.06)',
        cursor: article.originalUrl ? 'pointer' : 'default',
      }}
    >
      {/* 카테고리 색상 accent bar */}
      <div style={{
        height: '3px', flexShrink: 0,
        borderRadius: '16px 16px 0 0',
        background: `linear-gradient(90deg, ${catStyle.accent}, ${catStyle.accentEnd})`,
      }} />

      {/* Card body */}
      <div style={{
        padding: '18px 20px 16px', flex: 1,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Source badge + date */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '10px', flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, color: '#111827',
            background: '#E9ECEF', padding: '2px 7px', borderRadius: '4px',
          }}>
            {article.source}
          </span>
          <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: 'auto' }}>
            {article.publishedAt.slice(0, 10)}
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: '18px', fontWeight: 800, color: '#111827',
          lineHeight: 1.45, letterSpacing: '-0.3px', marginBottom: '10px',
        }}>
          {article.title}
        </div>

        {/* 3줄 구조 요약 or 일반 요약 */}
        <div style={{ marginBottom: '14px' }}>
          {(ns?.what || article.summary) && (
            <div style={{
              fontSize: '14px', fontWeight: 700, color: '#0891B2',
              letterSpacing: '0.5px', marginBottom: '6px',
            }}>
              📝 요약
            </div>
          )}
          {ns?.what ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '15px', color: '#111827', lineHeight: 1.65, fontWeight: 500 }}>
                {ns.what}
              </div>
              {ns.why && (
                <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.65 }}>
                  {ns.why}
                </div>
              )}
              {ns.sowhat && (
                <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.65 }}>
                  {ns.sowhat}
                </div>
              )}
            </div>
          ) : article.summary ? (
            <div style={{ fontSize: '15px', color: '#374151', lineHeight: 1.72 }}>
              {article.summary}
            </div>
          ) : null}
        </div>

        {/* Footer: topic chip + 원문 링크 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: '12px', borderTop: '1px solid #F3F4F6', marginTop: 'auto',
        }}>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            padding: '3px 8px', borderRadius: '20px',
            background: catStyle.chipBg, color: catStyle.chipText,
          }}>
            {topicLabel}
          </span>
          {article.originalUrl && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', fontWeight: 700, color: '#0066FF',
            }}>
              기사 보기
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

// ── 구독 신청 폼 ──────────────────────────────────────────────────
function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('nl_subscribed_emails') ?? '[]') as string[]
    setCount(saved.length)
  }, [])

  const handleSubmit = () => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) return

    const saved = JSON.parse(localStorage.getItem('nl_subscribed_emails') ?? '[]') as string[]
    if (!saved.includes(trimmed)) {
      saved.push(trimmed)
      localStorage.setItem('nl_subscribed_emails', JSON.stringify(saved))
    }
    setCount(saved.length)

    const subject = encodeURIComponent('AI 뉴스레터 대시보드 구독 신청')
    const body = encodeURIComponent(`구독 신청 이메일: ${trimmed}`)
    window.open(`mailto:haileycho@sk.com?subject=${subject}&body=${body}`)

    setSubmitted(true)
    setEmail('')
  }

  return (
    <div>
      {submitted ? (
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#059669', marginBottom: '12px' }}>
          ✅ 신청이 완료되었습니다. 이메일 클라이언트에서 발송을 확인해주세요.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', maxWidth: '480px', marginBottom: '12px', margin: '0 auto 12px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="📧 이메일 주소를 입력해주세요"
            style={{
              flex: 1, padding: '10px 14px',
              border: '1.5px solid #D1D5DB', borderRadius: '8px',
              fontSize: '14px', outline: 'none',
              background: '#fff',
            }}
          />
          <button
            onClick={handleSubmit}
            style={{
              padding: '10px 20px',
              background: '#2563EB', color: '#fff',
              border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            신청하기
          </button>
        </div>
      )}
      <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
        🙋 현재까지 누적 신청 인원 :{' '}
        <strong style={{ color: '#2563EB' }}>{count}명</strong>
      </div>
    </div>
  )
}
