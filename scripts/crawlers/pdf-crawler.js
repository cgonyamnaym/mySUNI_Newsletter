/**
 * 3단계: PDF 기관 보고서 크롤러
 *
 * 흐름:
 *   1. 기관 사이트 index 페이지 HTML 읽기
 *   2. 최근 PDF 링크 추출 (cheerio)
 *   3. PDF 다운로드
 *   4. 텍스트 추출 (pdf-parse)
 *   5. Claude로 한국어 요약 + 토픽 분류
 *
 * 한계: JS 렌더링 필요한 페이지는 cheerio로 파싱 불가
 *       → 해당 경우 puppeteer로 업그레이드 필요
 */
const crypto     = require('crypto')
const cheerio    = require('cheerio')
const { PDFParse } = require('pdf-parse')
const { summarize }   = require('./summarizer')
const { filterNew, markSeen } = require('./url-tracker')

const FETCH_TIMEOUT_MS = 15000

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 기관 사이트 index 페이지에서 최근 PDF 링크 추출
 * directPdfUrls 가 설정된 경우 해당 목록을 즉시 반환 (indexUrl 접근 불필요)
 * @returns {string[]}  절대 URL 배열
 */
async function extractPdfLinks(source) {
  // directPdfUrls: 인덱스 페이지가 차단된 기관의 알려진 PDF URL 목록
  if (source.directPdfUrls && source.directPdfUrls.length > 0) {
    return source.directPdfUrls
  }

  let html
  try {
    const res = await fetchWithTimeout(source.indexUrl, {
      headers: { 'User-Agent': 'EnergyInsightBot/1.0' },
    })
    html = await res.text()
  } catch (err) {
    console.warn(`  ⚠ 인덱스 페이지 로드 실패 (${source.name}): ${err.message}`)
    return []
  }

  const $    = cheerio.load(html)
  const base = new URL(source.indexUrl).origin
  const links = []

  $(source.pdfSelector ?? 'a[href$=".pdf"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const fullUrl = href.startsWith('http') ? href : `${base}${href}`
    links.push(fullUrl)
  })

  // 중복 제거
  return [...new Set(links)]
}

/**
 * PDF URL → 텍스트 추출 (pdf-parse v2 API)
 * @returns {{ text: string, pages: number } | null}
 */
async function extractPdfText(pdfUrl) {
  let data
  try {
    const res = await fetchWithTimeout(pdfUrl)
    data = new Uint8Array(await res.arrayBuffer())
  } catch (err) {
    console.warn(`  ⚠ PDF 다운로드 실패: ${err.message}`)
    return null
  }

  try {
    const parser = new PDFParse({ data, verbosity: 0 })
    await parser.load()
    const result = await parser.getText({ maxPages: 10 })
    const info   = parser.getInfo() ?? {}
    return { text: result.text, pages: info.Pages ?? 0 }
  } catch (err) {
    console.warn(`  ⚠ PDF 파싱 실패: ${err.message}`)
    return null
  }
}

/**
 * @param {object[]} sources  - sources.js에서 type='pdf'인 것들
 * @param {object}   options
 * @param {boolean}  options.noSummarize - Claude 요약 생략 (테스트용)
 * @returns {Promise<object[]>}  article 배열
 */
async function crawlPdf(sources, { noSummarize = false, dryRun = false, force = false } = {}) {
  const allArticles = []

  for (const source of sources) {
    if (source.type !== 'pdf') continue
    console.log(`[PDF] ${source.name} 수집 중...`)

    // IEA처럼 RSS도 제공하는 경우 RSS 우선 시도
    if (source.rssUrl) {
      console.log(`  → RSS 피드 발견, RSS 방식으로 시도 (pdf-crawler 스킵)`)
      console.log(`  → run-crawl.js에서 rssUrl로 처리됩니다.`)
      continue
    }

    const pdfLinks = await extractPdfLinks(source)
    if (pdfLinks.length === 0) {
      console.log(`  → PDF 링크 없음 (JS 렌더링 필요 가능성)`)
      continue
    }

    const { newUrls, seen } = filterNew(pdfLinks, { force })
    if (newUrls.length === 0) {
      console.log(`  → 새 PDF 없음`)
      continue
    }

    // 최대 5개만 처리 (최신순으로 앞에서부터)
    const toProcess = newUrls.slice(0, 5)
    console.log(`  → ${toProcess.length}개 PDF 처리`)

    for (const pdfUrl of toProcess) {
      const extracted = await extractPdfText(pdfUrl)
      if (!extracted) continue

      if (extracted.text.trim().length < 200) {
        console.warn(`  ⚠ 텍스트 추출 부족 (스캔 PDF일 가능성): ${pdfUrl}`)
        continue
      }

      const collectedAt = new Date().toISOString()
      let meta = {
        titleKo:       `[${source.name}] 보고서`,
        titleOriginal: null,
        summary:       extracted.text.slice(0, 200),
        topics:        [],
      }

      if (!noSummarize && process.env.ANTHROPIC_API_KEY) {
        try {
          const titleGuess = extracted.text.split('\n').find(l => l.trim().length > 10) ?? ''
          meta = await summarize({
            title:   titleGuess.trim().slice(0, 200),
            content: extracted.text,
            lang:    source.lang,
          })
          if (source.lang === 'en') meta.titleOriginal = titleGuess.trim()
        } catch (err) {
          console.warn(`    ⚠ 요약 실패: ${err.message}`)
        }
      }

      allArticles.push({
        id:            crypto.randomUUID(),
        source:        source.name,
        sourceId:      source.id,
        originalLang:  source.lang,
        isTranslated:  source.lang !== 'ko',
        title:         meta.titleKo,
        titleOriginal: meta.titleOriginal,
        summary:       meta.summary,
        topics:        meta.topics,
        publishedAt:   new Date().toISOString(),
        originalUrl:   pdfUrl,
        collectedAt,
      })

      await new Promise(r => setTimeout(r, 1000))
    }

    markSeen(toProcess, seen, { dryRun })
  }

  return allArticles
}

module.exports = { crawlPdf }
