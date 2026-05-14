/**
 * Daily news collection script
 * Run: node scripts/collect.js
 * Env: GEMINI_API_KEY
 */

const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const sources = require('./sources.json').sources
const DATA_DIR = path.join(__dirname, '../public/data/daily')
const INDEX_FILE = path.join(__dirname, '../public/data/index.json')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const TOPICS = ['전력 인프라', '에너지원', '운영 최적화', '정책·규제', 'ESG·탄소중립', '시장·가격 동향']

const TOPIC_KEYWORDS = {
  '전력 인프라': ['계통', '송배전', '스마트그리드', '전력망', '분산자원', 'VPP'],
  '에너지원': ['ESS', '에너지저장', '원자력', '원전', 'SMR', '태양광', '풍력', '수소', '바이오', '재생에너지', '신재생', '그린수소', '연료전지'],
  '운영 최적화': ['DERMS', '수요 예측', 'VPP 운영'],
  '정책·규제': ['에너지 정책', '법령', '규제', '전력 시장', 'PPA', '인허가'],
  'ESG·탄소중립': ['탄소중립', 'RE100', '탄소시장', 'ESG', 'NDC', '탄소'],
  '시장·가격 동향': ['에너지 가격', '수급', '투자', '시장'],
}

// ---------------------------------------------------------------------------

async function fetchRssFeed(url) {
  const { default: Parser } = await import('rss-parser')
  const parser = new Parser({ timeout: 10000 })
  try {
    const feed = await parser.parseURL(url)
    return feed.items.slice(0, 20).map((item) => ({
      title: item.title ?? '',
      url: item.link ?? '',
      body: item.contentSnippet ?? item.content ?? '',
      publishedAt: item.pubDate ?? new Date().toISOString(),
    }))
  } catch {
    console.warn(`[SKIP] RSS fetch failed: ${url}`)
    return []
  }
}

function detectTopicsByKeyword(text) {
  const lower = text.toLowerCase()
  return TOPICS.filter((topic) =>
    TOPIC_KEYWORDS[topic].some((kw) => lower.includes(kw.toLowerCase()))
  )
}

async function processArticleWithGemini(article, lang) {
  const isKorean = lang === 'ko'

  const prompt = isKorean
    ? `당신은 전력·에너지 산업 전문 저널리스트입니다.
다음 기사를 읽고 JSON 형식으로만 응답해주세요:
제목: ${article.title}
본문: ${article.body.slice(0, 1500)}

{
  "summary_ko": "2~3문장 핵심 요약 (한국어)",
  "topics": ["토픽 선택 (최대 3개): ${TOPICS.join(', ')}"]
}`
    : `당신은 전력·에너지 산업 전문 번역가 겸 저널리스트입니다.
다음 외국어 기사를 읽고 JSON 형식으로만 응답해주세요:
제목: ${article.title}
본문: ${article.body.slice(0, 1500)}

{
  "title_ko": "한국어 번역 제목",
  "summary_ko": "2~3문장 핵심 요약 (한국어)",
  "topics": ["토픽 선택 (최대 3개): ${TOPICS.join(', ')}"]
}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    return JSON.parse(text)
  } catch {
    const fallbackTopics = detectTopicsByKeyword(article.title + ' ' + article.body)
    return {
      title_ko: null,
      summary_ko: null,
      topics: fallbackTopics.slice(0, 3),
    }
  }
}

function loadExistingIds(date) {
  const filePath = path.join(DATA_DIR, `${date}.json`)
  if (!fs.existsSync(filePath)) return new Set()
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  return new Set(data.articles.map((a) => a.originalUrl))
}

async function run() {
  const today = new Date().toISOString().slice(0, 10)
  const existingUrls = loadExistingIds(today)
  const articles = []

  for (const source of sources) {
    if (source.type !== 'rss') continue
    console.log(`[COLLECT] ${source.name}`)
    const items = await fetchRssFeed(source.url)

    for (const item of items) {
      if (!item.url || existingUrls.has(item.url)) continue

      const aiResult = await processArticleWithGemini(item, source.lang)
      const isTranslated = source.lang !== 'ko'

      articles.push({
        id: crypto.randomUUID(),
        source: source.name,
        sourceId: source.id,
        originalLang: source.lang,
        isTranslated,
        title: isTranslated ? (aiResult.title_ko ?? item.title) : item.title,
        titleOriginal: isTranslated ? item.title : null,
        summary: aiResult.summary_ko ?? '',
        topics: aiResult.topics ?? [],
        publishedAt: new Date(item.publishedAt).toISOString(),
        originalUrl: item.url,
        collectedAt: new Date().toISOString(),
      })

      await new Promise((r) => setTimeout(r, 500))
    }
  }

  // Save daily data
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const output = {
    date: today,
    generatedAt: new Date().toISOString(),
    articleCount: articles.length,
    articles,
  }
  fs.writeFileSync(path.join(DATA_DIR, `${today}.json`), JSON.stringify(output, null, 2))
  console.log(`[DONE] Saved ${articles.length} articles for ${today}`)

  // Update index
  updateIndex(today)
}

function updateIndex(newDate) {
  const index = fs.existsSync(INDEX_FILE)
    ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'))
    : { lastUpdated: '', availableDates: [], availableReports: [], totalArticles: 0 }

  if (!index.availableDates.includes(newDate)) {
    index.availableDates.unshift(newDate)
    index.availableDates.sort((a, b) => b.localeCompare(a))
  }
  index.lastUpdated = new Date().toISOString()

  const allArticles = index.availableDates.reduce((sum, date) => {
    const f = path.join(DATA_DIR, `${date}.json`)
    if (!fs.existsSync(f)) return sum
    return sum + JSON.parse(fs.readFileSync(f, 'utf-8')).articleCount
  }, 0)
  index.totalArticles = allArticles

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2))
}

run().catch(console.error)
