/**
 * HTML 스크래퍼 — Cheerio 기반 기사 목록 추출
 *
 * scrapeConfig 스키마:
 *   listUrl        {string}  목록 페이지 URL
 *   titleSelector  {string}  CSS 선택자 (기사 제목 링크)
 *   linkSelector   {string}  CSS 선택자 (기사 URL 링크, 보통 titleSelector와 동일)
 *   dateSelector   {string}  CSS 선택자 (날짜 텍스트, 선택)
 */
const cheerio = require('cheerio')
const crypto  = require('crypto')
const { summarize }          = require('./summarizer')
const { classifyTopics }     = require('./classifier')
const { filterNew, markSeen, isUrlAccessible } = require('./url-tracker')
const { isBodyLongEnough } = require('./body-fetcher')
const { isEnergyRelevant } = require('./relevance-filter')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// "2026.05.04 17:03" → "2026-05-04 17:03" 등 비표준 날짜 정규화
function normalizeDateText(text) {
  if (!text) return null
  return text.trim().replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')
}

function isRecent(dateText, daysBack = 1, startDateStr, endDateStr) {
  if (!dateText) return true
  const parsed = new Date(normalizeDateText(dateText))
  if (isNaN(parsed.getTime())) return true

  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDateStr)
    end.setHours(23, 59, 59, 999)
    return parsed >= start && parsed <= end
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  return parsed >= cutoff
}

function resolveUrl(href, baseUrl) {
  if (!href) return null
  if (href.startsWith('http')) return href
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

/**
 * pagination 설정에 따라 페이지 URL을 생성
 * - url-param  : listUrl의 쿼리 파라미터를 증가 (예: ?page=2, ?pageIndex=2)
 * - url-path   : pathTemplate의 {page}를 교체 (예: /blog/page/2/)
 * - next-link  : HTML에서 "다음 페이지" 앵커를 추출해 따라감
 */
function buildPageUrl(cfg, page) {
  const pg = cfg.pagination
  if (!pg || pg.type === 'none') return cfg.listUrl
  if (pg.type === 'url-param') {
    const u = new URL(cfg.listUrl)
    u.searchParams.set(pg.param, page)
    return u.toString()
  }
  if (pg.type === 'url-path') {
    // startPage(보통 2)부터 템플릿 사용, 1페이지는 listUrl 그대로
    if (page < (pg.startPage ?? 2)) return cfg.listUrl
    return pg.pathTemplate.replace('{page}', page)
  }
  return cfg.listUrl
}

/**
 * HTML에서 "다음 페이지" 링크를 찾아 절대 URL로 반환
 */
function findNextPageUrl($, cfg, currentUrl) {
  const pg = cfg.pagination
  if (!pg || pg.type !== 'next-link') return null
  const selectors = (pg.nextSelector ?? 'a[rel="next"], .pagination .next a, .next a')
    .split(',').map(s => s.trim())
  for (const sel of selectors) {
    const el = $(sel).first()
    if (el.length) {
      const href = el.attr('href')
      if (href) return resolveUrl(href, currentUrl)
    }
  }
  return null
}

/**
 * 한 페이지 HTML에서 기사 항목을 추출
 * onclickPattern 지원: onclick="fn_Xxx('id1','id2')" 방식 사이트 처리
 */
function extractItems($, cfg, pageUrl) {
  const items = []

  // ── onclick 패턴 방식 (예: KEA) ──────────────────────
  if (cfg.onclickPattern) {
    const op = cfg.onclickPattern
    const re = new RegExp(op.regex)
    $(op.selector).each((_, el) => {
      const onclick = $(el).attr('onclick') || ''
      const match   = onclick.match(re)
      if (!match) return

      let url = op.urlTemplate
      match.slice(1).forEach((g, i) => { url = url.replace(`$${i + 1}`, g) })

      const title = $(el).find(op.titleSelector ?? 'span').first().text().trim() || $(el).text().trim()
      if (!title || !url) return

      let dateText = null
      if (cfg.dateSelector) {
        const dateSelectors = cfg.dateSelector.split(',').map(s => s.trim())
        for (const dsel of dateSelectors) {
          const dateEl = $(el).closest('li, tr, article, .item').find(dsel).first()
          if (dateEl.length) { dateText = normalizeDateText(dateEl.text().trim()); break }
        }
      }
      items.push({ title, url, dateText })
    })
    return items
  }

  // ── 기본 href 방식 ────────────────────────────────────
  const titleSelectors = cfg.titleSelector.split(',').map(s => s.trim())
  let titleEls = $()
  for (const sel of titleSelectors) {
    titleEls = $(sel)
    if (titleEls.length > 0) break
  }

  titleEls.each((_, el) => {
    const title = $(el).text().trim()
    const href  = $(el).attr('href') ?? $(el).closest('a').attr('href')
    const url   = resolveUrl(href, pageUrl)
    if (!title || !url) return

    let dateText = null
    if (cfg.dateSelector) {
      const dateSelectors = cfg.dateSelector.split(',').map(s => s.trim())
      for (const dsel of dateSelectors) {
        const dateEl = $(el).closest('li, tr, article, .item, .news-item').find(dsel).first()
        if (dateEl.length) {
          dateText = normalizeDateText(dateEl.attr('datetime') ?? dateEl.text().trim())
          break
        }
      }
    }
    items.push({ title, url, dateText })
  })
  return items
}

/**
 * @param {object[]} sources  - type='scrape' 인 소스 배열
 * @param {object}   options
 * @param {number}   options.daysBack    - 최근 며칠치 수집
 * @param {boolean}  options.noSummarize - 요약 생략
 * @returns {Promise<object[]>}
 */
async function crawlScrape(sources, { daysBack = 1, noSummarize = false, startDate, endDate, dryRun = false, force = false } = {}) {
  const allArticles = []

  for (const source of sources) {
    if (source.type !== 'scrape') continue
    if (source.enabled === false) continue
    const cfg = source.scrapeConfig
    if (!cfg) { console.warn(`  ⚠ scrapeConfig 없음 (${source.name})`); continue }

    const pg = cfg.pagination
    const maxPages = pg?.maxPages ?? 1
    const isNextLink = pg?.type === 'next-link'

    console.log(`[SCR] ${source.name} 수집 중... (최대 ${maxPages}페이지)`)

    const allItems = []     // 이 소스에서 수집한 전체 기사
    let currentUrl = cfg.listUrl
    let pageNum = pg?.startPage ?? 1

    // ── 다중 페이지 루프 ──────────────────────────────────
    for (let p = 1; p <= maxPages; p++) {
      if (p > 1) {
        await new Promise(r => setTimeout(r, 600))
        if (!isNextLink) {
          currentUrl = buildPageUrl(cfg, pageNum)
        }
        console.log(`  → p${p}: ${currentUrl}`)
      }

      let html
      try {
        html = await fetchHtml(currentUrl)
      } catch (err) {
        console.warn(`  ⚠ 실패 (${source.name} p${p}): ${err.message}`)
        break
      }

      const $ = cheerio.load(html)
      const pageItems = extractItems($, cfg, currentUrl)

      if (pageItems.length === 0) {
        console.log(`  → p${p}: 기사 없음, 중단`)
        break
      }

      // 날짜가 있는 항목 추출
      const hasDateItems = pageItems.filter(i => i.dateText)
      const recentOnPage = pageItems.filter(i => isRecent(i.dateText, daysBack, startDate, endDate))
      allItems.push(...recentOnPage)

      // 중단 조건: 모든 날짜 기사가 수집 범위보다 "오래됐을" 때만 중단
      // - daysBack 모드: cutoff보다 오래된 경우
      // - startDate/endDate 모드: startDate보다 이전인 경우 (너무 최신인 경우엔 계속 넘김)
      if (hasDateItems.length > 0) {
        const allPastWindow = hasDateItems.every(i => {
          if (!i.dateText) return false
          const parsed = new Date(i.dateText)
          if (isNaN(parsed.getTime())) return false
          if (startDate && endDate) {
            // 날짜 범위 모드: startDate보다 이전 = 너무 오래된 것
            return parsed < new Date(startDate)
          }
          // daysBack 모드: cutoff보다 이전 = 너무 오래된 것
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - daysBack)
          return parsed < cutoff
        })
        if (allPastWindow) {
          console.log(`  → p${p}: startDate(${startDate ?? `D-${daysBack}`})보다 오래된 기사만 있어 중단`)
          break
        }
      }

      // next-link 방식: 다음 페이지 URL 탐색
      if (isNextLink) {
        const nextUrl = findNextPageUrl($, cfg, currentUrl)
        if (!nextUrl) {
          console.log(`  → p${p}: 다음 페이지 링크 없음, 중단`)
          break
        }
        currentUrl = nextUrl
      } else {
        pageNum++
      }
    }
    // ──────────────────────────────────────────────────────

    if (allItems.length === 0) {
      console.log(`  → 기사 파싱 결과 없음 (선택자 불일치 가능)`)
      continue
    }

    // URL 중복 제거
    const urls = allItems.map(i => i.url)
    const { newUrls, seen } = filterNew(urls, { force })

    if (newUrls.length === 0) {
      console.log(`  → 모두 이미 수집됨`)
      continue
    }

    const newItems = allItems.filter(i => newUrls.includes(i.url))
    
    // 원문 링크 접속 유효성 검사 (404 등 제외)
    const validItems = []
    for (const item of newItems) {
      const isValid = await isUrlAccessible(item.url)
      if (isValid) {
        validItems.push(item)
      } else {
        console.log(`    ⚠ 접속 불가 (404 등) 제외: ${item.url}`)
      }
    }

    if (validItems.length === 0) {
      console.log(`  → 신규 기사 중 유효한 링크 없음`)
      continue
    }

    // 에너지 관련성 필터 (신뢰 소스는 면제, 혼합 소스는 키워드 검사)
    const relevantItems = validItems.filter(item => {
      const relevant = isEnergyRelevant(item.title ?? '', '', source.lang, source.id)
      if (!relevant) console.log(`    ⚠ 에너지 무관 제외: ${item.title?.slice(0, 60)}`)
      return relevant
    })

    if (relevantItems.length === 0) {
      console.log(`  → 관련성 필터 후 기사 없음`)
      continue
    }

    // 본문 10문장 이상 필터 (bodyText도 함께 보존 → 요약 fallback 및 Gemini content 활용)
    const bodyPassItems = []
    for (const item of relevantItems) {
      const { passes, sentenceCount, bodyText } = await isBodyLongEnough(item.url)
      if (passes) {
        bodyPassItems.push({ ...item, bodyText })
      } else {
        console.log(`    ⚠ 본문 ${sentenceCount}문장 (10 미만) 제외: ${item.url}`)
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
      const collectedAt = new Date().toISOString()
      const pubDate = item.dateText
        ? (isNaN(new Date(item.dateText).getTime()) ? new Date().toISOString() : new Date(item.dateText).toISOString())
        : new Date().toISOString()

      const bodyText = item.bodyText ?? ''

      let meta = {
        isEnergyMain:  true,
        titleKo:       item.title,
        titleOriginal: source.lang === 'en' ? item.title : null,
        summary:       bodyText.slice(0, 300),  // 본문 앞부분을 fallback 요약으로 사용
        topics:        classifyTopics(item.title, bodyText, source.lang),
      }

      if (!noSummarize && process.env.GEMINI_API_KEY) {
        try {
          meta = await summarize({
            title:   item.title,
            content: bodyText || item.title,  // 본문을 Gemini에 전달 (없으면 제목)
            lang:    source.lang,
          })
          if (source.lang === 'en') meta.titleOriginal = item.title
          if (!meta.topics || meta.topics.length === 0) {
            meta.topics = classifyTopics(item.title, '', source.lang)
          }
        } catch (err) {
          console.warn(`    ⚠ 요약 실패: ${err.message}`)
        }
      }

      // AI 관련성 판별: 에너지가 주요 주제가 아니면 제외 (재수집 방지를 위해 seen 등록)
      if (meta.isEnergyMain === false) {
        console.log(`    ⚠ 에너지 주요 주제 아님 (AI 판별) 제외: ${item.title?.slice(0, 60)}`)
        aiRejectedUrls.push(item.url)
        continue
      }

      allArticles.push({
        id:            crypto.randomUUID(),
        source:        source.name,
        sourceId:      source.id,
        sourceOrigin:  source.origin,
        originalLang:  source.lang,
        isTranslated:  source.lang !== 'ko',
        title:         meta.titleKo,
        titleOriginal: meta.titleOriginal,
        summary:       meta.summary,
        topics:        meta.topics,
        publishedAt:   pubDate,
        originalUrl:   item.url,
        collectedAt,
      })
      passedUrls.push(item.url)
    }

    markSeen([...passedUrls, ...aiRejectedUrls], seen, { dryRun })
    await new Promise(r => setTimeout(r, 800))
  }

  return allArticles
}

module.exports = { crawlScrape }
