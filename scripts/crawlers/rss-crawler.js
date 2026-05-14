/**
 * 2단계: RSS 피드 크롤러
 * 각 소스의 RSS를 읽어 오늘 또는 최근 N일 기사를 수집
 */
const RssParser  = require('rss-parser')
const crypto     = require('crypto')
const { summarize }      = require('./summarizer')
const { classifyTopics } = require('./classifier')
const { filterNew, markSeen, isUrlAccessible } = require('./url-tracker')
const { isBodyLongEnough } = require('./body-fetcher')
const { isEnergyRelevant } = require('./relevance-filter')

const parser = new RssParser({
  timeout: 10000,
  headers: { 'User-Agent': 'EnergyInsightBot/1.0' },
})

/**
 * 기사가 수집 대상 날짜 범위에 있는지 확인
 * @param {string|Date} pubDate
 * @param {number} daysBack  - 며칠 전까지 수집할지 (기본 1일)
 */
function isRecent(pubDate, daysBack = 1, startDateStr, endDateStr) {
  if (!pubDate) return true // 날짜 없으면 일단 수집
  const pub = new Date(pubDate)
  if (isNaN(pub.getTime())) return true

  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDateStr)
    end.setHours(23, 59, 59, 999)
    return pub >= start && pub <= end
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  return pub >= cutoff
}

/**
 * 소스의 키워드 중 하나라도 제목/요약에 포함되는지 확인
 */
function isRelevant(item, source) {
  if (!source.keywords || source.keywords.length === 0) return true
  const text = `${item.title ?? ''} ${item.contentSnippet ?? ''}`.toLowerCase()
  return source.keywords.some(kw => text.includes(kw.toLowerCase()))
}

/**
 * @param {object[]} sources  - sources.js에서 type='rss'인 것들
 * @param {object}   options
 * @param {number}   options.daysBack    - 최근 며칠치 수집 (기본 1)
 * @param {boolean}  options.noSummarize - Claude 요약 생략 (테스트용)
 * @returns {Promise<object[]>}  article 배열
 */
async function crawlRss(sources, { daysBack = 1, noSummarize = false, startDate, endDate, dryRun = false, force = false } = {}) {
  const allArticles = []

  for (const source of sources) {
    if (source.type !== 'rss' && source.type !== 'google-news') continue
    if (source.enabled === false) continue
    const label = source.type === 'google-news' ? 'GNews' : 'RSS'
    console.log(`[${label}] ${source.name} 수집 중...`)

    let feed
    try {
      feed = await parser.parseURL(source.rssUrl)
    } catch (err) {
      console.warn(`  ⚠ RSS 실패 (${source.name}): ${err.message}`)
      continue
    }

    // 최근 기사만 필터
    const recentItems = feed.items.filter(item =>
      isRecent(item.pubDate ?? item.isoDate, daysBack, startDate, endDate) && isRelevant(item, source)
    )

    if (recentItems.length === 0) {
      console.log(`  → 새 기사 없음`)
      continue
    }

    // 이미 수집한 URL 제외
    const urls = recentItems.map(i => i.link)
    const { newUrls, seen } = filterNew(urls, { force })

    if (newUrls.length === 0) {
      console.log(`  → 모두 이미 수집됨`)
      continue
    }

    const newItems = recentItems.filter(i => newUrls.includes(i.link))
    
    // 원문 링크 접속 유효성 검사 (404 등 제외)
    const validItems = []
    for (const item of newItems) {
      const finalUrl = (item.source && item.source.url) ? item.source.url : item.link
      const isValid = await isUrlAccessible(finalUrl)
      if (isValid) {
        validItems.push(item)
      } else {
        console.log(`    ⚠ 접속 불가 (404 등) 제외: ${finalUrl}`)
      }
    }

    if (validItems.length === 0) {
      console.log(`  → 신규 기사 중 유효한 링크 없음`)
      continue
    }

    // 에너지 관련성 필터 (신뢰 소스는 면제, 혼합 소스는 키워드 검사)
    const relevantItems = validItems.filter(item => {
      const relevant = isEnergyRelevant(item.title ?? '', item.contentSnippet ?? '', source.lang, source.id)
      if (!relevant) console.log(`    ⚠ 에너지 무관 제외: ${item.title?.slice(0, 60)}`)
      return relevant
    })

    if (relevantItems.length === 0) {
      console.log(`  → 관련성 필터 후 기사 없음`)
      continue
    }

    // 본문 10문장 이상 필터
    const bodyPassItems = []
    for (const item of relevantItems) {
      const url = (item.source && item.source.url) ? item.source.url : item.link
      const { passes, sentenceCount } = await isBodyLongEnough(url)
      if (passes) {
        bodyPassItems.push(item)
      } else {
        console.log(`    ⚠ 본문 ${sentenceCount}문장 (10 미만) 제외: ${url}`)
      }
    }

    if (bodyPassItems.length === 0) {
      console.log(`  → 본문 길이 필터 후 기사 없음`)
      continue
    }

    const irrelevantSkipped = validItems.length - relevantItems.length
    const shortSkipped = relevantItems.length - bodyPassItems.length
    console.log(`  → ${bodyPassItems.length}건 신규 수집 (접속 불가 ${newItems.length - validItems.length}건, 무관 ${irrelevantSkipped}건, 본문 짧음 ${shortSkipped}건 제외)`)

    const passedUrls = []
    const aiRejectedUrls = []
    for (const item of bodyPassItems) {
      const pubDate    = item.isoDate ?? item.pubDate ?? new Date().toISOString()
      const rawContent = item.content ?? item.contentSnippet ?? item.title ?? ''
      const collectedAt = new Date().toISOString()

      let meta = {
        isEnergyMain:  true,
        titleKo:       item.title,
        titleOriginal: source.lang === 'en' ? item.title : null,
        summary:       item.contentSnippet?.slice(0, 300) ?? '',
        topics:        classifyTopics(item.title, item.contentSnippet ?? '', source.lang),
      }

      if (!noSummarize && process.env.GEMINI_API_KEY) {
        try {
          meta = await summarize({
            title:   item.title,
            content: rawContent,
            lang:    source.lang,
          })
          // 영어 소스는 원제 유지
          if (source.lang === 'en') meta.titleOriginal = item.title
          // Google News 기사는 source 출처명이 제목 끝에 " - 출처명" 형태로 붙음 → 제거
          if (source.type === 'google-news' || source.id.startsWith('google-news')) {
            meta.titleKo = meta.titleKo.replace(/\s*-\s*[^-]+$/, '').trim()
          }
          // AI 토픽이 비어 있으면 키워드 분류로 보완
          if (!meta.topics || meta.topics.length === 0) {
            meta.topics = classifyTopics(item.title, rawContent, source.lang)
          }
        } catch (err) {
          console.warn(`    ⚠ 요약 실패: ${err.message}`)
        }
      }

      // Google News URL은 리다이렉트 래퍼 → 원문 URL 추출 시도
      const finalUrl = (item.source && item.source.url) ? item.source.url : item.link

      // AI 관련성 판별: 에너지가 주요 주제가 아니면 제외 (재수집 방지를 위해 seen 등록)
      if (meta.isEnergyMain === false) {
        console.log(`    ⚠ 에너지 주요 주제 아님 (AI 판별) 제외: ${item.title?.slice(0, 60)}`)
        aiRejectedUrls.push(finalUrl)
        continue
      }

      allArticles.push({
        id:            crypto.randomUUID(),
        source:        source.name,
        sourceId:      source.id,
        sourceOrigin:  source.origin ?? 'global',
        originalLang:  source.lang,
        isTranslated:  source.lang !== 'ko',
        title:         meta.titleKo,
        titleOriginal: meta.titleOriginal,
        summary:       meta.summary,
        topics:        meta.topics,
        publishedAt:   new Date(pubDate).toISOString(),
        originalUrl:   finalUrl,
        collectedAt,
      })
      passedUrls.push(finalUrl)
    }

    markSeen([...passedUrls, ...aiRejectedUrls], seen, { dryRun })

    // 소스 간 요청 간격 (서버 부하 방지)
    await new Promise(r => setTimeout(r, 500))
  }

  return allArticles
}

module.exports = { crawlRss }
