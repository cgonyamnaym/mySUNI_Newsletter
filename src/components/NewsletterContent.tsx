'use client'

import { forwardRef, useState, useEffect, type MouseEvent } from 'react'
import type { Article, TopicId } from '@/lib/types'
import styles from './NewsletterContent.module.css'

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
  /** 요약 생성 실패한 기사의 재시도 요청. 성공 시 true, 실패 시 false를 반환해야 함 */
  onRetrySummary?: (articleId: string) => Promise<boolean>
  /** true면 반응형 폭(min 820 / max 1200px, 모바일 1열)을 적용. 기본값은 고정 800px(내부 페이지용) */
  responsive?: boolean
}

const NewsletterContent = forwardRef<HTMLDivElement, Props>(
  ({ articles, dateLabel, onRetrySummary, responsive }, ref) => {
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

    const rc = (base: string) => responsive ? `${base} ${styles.responsive}` : base

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
          <div className={`${rc(styles.container)} ${rc(styles.headerInner)}`}>
            {/* Date at top right */}
            <div className={rc(styles.dateBadge)}>
              [발행일자 : {isoDate}]
            </div>

            {/* Title */}
            <div className={rc(styles.title)}>
              Electrification & Energy Solution<br />
              <span style={{ color: '#2563EB' }}>Bi-Weekly AI Newsletter</span>
            </div>

            {/* Stats row */}
            <div className={styles.statsRow}>
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
            <div className={`${rc(styles.container)} ${rc(styles.navInner)}`}>
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
        <div className={`${rc(styles.container)} ${rc(styles.body)}`}>
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
                    <span className={rc(styles.sectionTitle)} style={{ color: c.accent }}>
                      {topicId}
                    </span>
                  </div>
                </div>

                {/* 2-column card grid (모바일 1열) */}
                <div className={rc(styles.grid)}>
                  {items.map((article) => (
                    <ArticleCard key={article.id} article={article} catStyle={c} topicLabel={topicId} onRetrySummary={onRetrySummary} />
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
                <span className={rc(styles.sectionTitle)} style={{ color: '#111827' }}>
                  기타
                </span>
              </div>
              <div className={rc(styles.grid)}>
                {unclassified.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    catStyle={FALLBACK_CAT}
                    topicLabel="기타"
                    onRetrySummary={onRetrySummary}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── SUBSCRIBE ── */}
        <div className={rc(styles.subscribeWrap)} style={{ background: '#F0F2F5' }}>
          <div className={`${rc(styles.container)} ${styles.subscribeInner}`}>
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
        <div className={rc(styles.footer)} style={{ background: '#0A1628', textAlign: 'center' }}>
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
  onRetrySummary,
}: {
  article: Article
  catStyle: CatStyle
  topicLabel: string
  onRetrySummary?: (articleId: string) => Promise<boolean>
}) {
  const ns = article.newsletterSummary
  const [retrying, setRetrying] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)

  async function handleRetryClick(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!onRetrySummary || retrying) return
    setRetrying(true)
    setRetryFailed(false)
    try {
      const ok = await onRetrySummary(article.id)
      if (!ok) setRetryFailed(true)
    } catch {
      setRetryFailed(true)
    } finally {
      setRetrying(false)
    }
  }

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

        {/* 3줄 구조 요약 or 요약 준비중 상태 */}
        <div style={{ marginBottom: '14px' }}>
          {ns?.what ? (
            <>
              <div style={{
                fontSize: '14px', fontWeight: 700, color: '#0891B2',
                letterSpacing: '0.5px', marginBottom: '6px',
              }}>
                📝 요약
              </div>
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
            </>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', borderRadius: '8px',
              background: '#F9FAFB', border: '1px dashed #E5E7EB',
            }}>
              <span style={{ fontSize: '13px', color: '#9CA3AF', flex: 1 }}>
                {retrying ? '⏳ 요약 생성 중...' : retryFailed ? '⚠️ 요약 생성에 실패했습니다.' : '⚠️ AI 요약이 아직 생성되지 않았습니다.'}
              </span>
              {onRetrySummary && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleRetryClick}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRetryClick(e as unknown as MouseEvent) }}
                  style={{
                    fontSize: '12px', fontWeight: 700,
                    color: retrying ? '#D1D5DB' : '#0066FF',
                    cursor: retrying ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {retrying ? '처리중...' : '재시도'}
                </span>
              )}
            </div>
          )}
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('nl_subscribed_emails') ?? '[]') as string[]
    setCount(saved.length)
  }, [])

  const handleSubmit = async () => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@') || submitting) return

    setSubmitting(true)
    setError(false)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (!res.ok) throw new Error('failed')

      const saved = JSON.parse(localStorage.getItem('nl_subscribed_emails') ?? '[]') as string[]
      if (!saved.includes(trimmed)) {
        saved.push(trimmed)
        localStorage.setItem('nl_subscribed_emails', JSON.stringify(saved))
      }
      setCount(saved.length)
      setSubmitted(true)
      setEmail('')
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {submitted ? (
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#059669', marginBottom: '12px' }}>
          ✅ 신청이 완료되었습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '480px', marginBottom: '12px', margin: '0 auto 12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="✉ 이메일 주소를 입력해주세요"
              style={{
                flex: 1, padding: '10px 14px',
                border: '1.5px solid #D1D5DB', borderRadius: '8px',
                fontSize: '14px', outline: 'none',
                background: '#fff',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '10px 20px',
                background: submitting ? '#93B4EE' : '#2563EB', color: '#fff',
                border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: 700,
                cursor: submitting ? 'default' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {submitting ? '전송 중...' : '신청하기'}
            </button>
          </div>
          {error && (
            <div style={{ fontSize: '12px', color: '#DC2626', textAlign: 'left' }}>
              전송에 실패했습니다. 잠시 후 다시 시도해주세요.
            </div>
          )}
        </div>
      )}
      <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
        ☺ 현재까지 누적 신청 인원 :{' '}
        <strong style={{ color: '#2563EB' }}>{count}명</strong>
      </div>
    </div>
  )
}
