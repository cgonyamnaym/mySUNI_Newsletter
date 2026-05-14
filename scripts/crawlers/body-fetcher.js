/**
 * 기사 본문 수집 + 10문장 이상 필터
 * fetchBodyText(url)     → 본문 텍스트 (실패 시 '')
 * countSentences(text)   → 문장 수
 * isBodyLongEnough(url)  → boolean (기본 10문장 이상)
 */
const cheerio = require('cheerio')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const TIMEOUT_MS = parseInt(process.env.BODY_CHECK_TIMEOUT_MS ?? '8000')
const DEFAULT_MIN_SENTENCES = 10

// 본문 가능성 높은 셀렉터 (순서대로 시도)
const BODY_SELECTORS = [
  'article',
  '#articleBody',
  '#article_content',
  '.article-body',
  '.article_txt',
  '.articleBody',
  '.newsct_article',
  '.post-content',
  '.entry-content',
  '.news-body',
  '[role="main"]',
  'main',
]

/**
 * 주어진 URL에서 기사 본문 텍스트를 추출.
 * 실패(timeout, 404, 페이월 등) 시 빈 문자열 반환.
 */
async function fetchBodyText(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return ''

    const html = await res.text()
    const $ = cheerio.load(html)

    // 노이즈 제거
    $('script, style, nav, header, footer, aside, .ad, .advertisement, iframe, [class*="banner"], [class*="sidebar"]').remove()

    // 지정 셀렉터 순서대로 시도
    for (const sel of BODY_SELECTORS) {
      const el = $(sel).first()
      if (el.length) {
        const text = el.text().replace(/\s+/g, ' ').trim()
        if (text.length >= 100) return text
      }
    }

    // fallback: <p> 태그 합산
    const paragraphs = []
    $('p').each((_, el) => {
      const t = $(el).text().trim()
      if (t.length >= 20) paragraphs.push(t)
    })
    return paragraphs.join(' ')
  } catch {
    return ''
  }
}

/**
 * 텍스트에서 문장 수를 반환.
 * 구분자: . ! ? 。 ？ ！ (연속 구분자는 1개로 처리)
 * 공백·특수문자만 있는 토큰(5자 미만)은 제외.
 */
function countSentences(text) {
  if (!text) return 0
  const tokens = text.split(/[.!?。？！]+/)
  return tokens.filter(t => t.replace(/\s/g, '').length >= 5).length
}

/**
 * URL 기사가 최소 문장 수 조건을 충족하는지 확인.
 * @param {string} url
 * @param {number} minSentences 기본값: 10
 * @returns {Promise<{passes: boolean, sentenceCount: number}>}
 */
async function isBodyLongEnough(url, minSentences = DEFAULT_MIN_SENTENCES) {
  const text = await fetchBodyText(url)
  const sentenceCount = countSentences(text)
  return { passes: sentenceCount >= minSentences, sentenceCount, bodyText: text }
}

module.exports = { fetchBodyText, countSentences, isBodyLongEnough }
