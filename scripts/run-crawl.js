/**
 * 크롤러 메인 실행 스크립트
 *
 * 사용법:
 *   node scripts/run-crawl.js              # 오늘 기사 수집
 *   node scripts/run-crawl.js --days=3     # 최근 3일치 수집
 *   node scripts/run-crawl.js --start=2026-04-15 --end=2026-04-30  # 날짜 범위
 *   node scripts/run-crawl.js --dry-run    # 파일 저장 없이 미리보기 (URL 트래커 보존)
 *   node scripts/run-crawl.js --no-sum     # 요약 없이 빠르게 수집
 *   node scripts/run-crawl.js --force      # URL 트래커 무시하고 재수집 (누락 날짜 복구용)
 */
require('dotenv').config({ path: '.env.local' })

const fs      = require('fs')
const path    = require('path')
const sources = require('./crawlers/sources')
const { crawlRss }    = require('./crawlers/rss-crawler')
const { crawlScrape } = require('./crawlers/scraper')
const { crawlPdf }    = require('./crawlers/pdf-crawler')

// ── CLI 인자 파싱 ────────────────────────────────
const args        = process.argv.slice(2)
const daysBack    = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] ?? '1')
const startDate   = args.find(a => a.startsWith('--start='))?.split('=')[1]
const endDate     = args.find(a => a.startsWith('--end='))?.split('=')[1]
const dryRun      = args.includes('--dry-run')
const force       = args.includes('--force')
const noSummarize = args.includes('--no-sum') || !process.env.GEMINI_API_KEY

if (noSummarize && !process.env.GEMINI_API_KEY) {
  console.log('ℹ GEMINI_API_KEY 없음 → 요약 없이 원문 제목만 저장합니다.')
}
if (dryRun)  console.log('ℹ dry-run 모드: 파일 저장 없음, URL 트래커 보존\n')
if (force)   console.log('ℹ force 모드: URL 트래커 무시하고 재수집\n')

// ── 날짜별 JSON 저장 ─────────────────────────────
const DATA_DAILY  = path.join(__dirname, '../public/data/daily')
const INDEX_FILE  = path.join(__dirname, '../public/data/index.json')

function writeDayFile(date, articles) {
  const filePath = path.join(DATA_DAILY, `${date}.json`)
  fs.writeFileSync(filePath, JSON.stringify({
    date,
    generatedAt:  new Date().toISOString(),
    articleCount: articles.length,
    articles,
  }, null, 2))
}

function saveDailyArticles(articles, { rangeStart, rangeEnd } = {}) {
  // 날짜별로 그룹화
  const byDate = {}
  for (const a of articles) {
    const date = a.publishedAt.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(a)
  }

  for (const [date, dayArticles] of Object.entries(byDate)) {
    const filePath = path.join(DATA_DAILY, `${date}.json`)

    // 기존 파일 있으면 병합 (같은 날 여러 번 실행 시)
    let existing = []
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')).articles ?? []
      } catch {}
    }

    // 배치 내 URL 중복 제거 (다중 페이지 수집 시 동일 기사 중복 방지)
    const seenInBatch = new Set()
    const uniqueDayArticles = dayArticles.filter(a => {
      if (seenInBatch.has(a.originalUrl)) return false
      seenInBatch.add(a.originalUrl)
      return true
    })

    const existingUrls = new Set(existing.map(a => a.originalUrl))
    const fresh = uniqueDayArticles.filter(a => !existingUrls.has(a.originalUrl))

    if (fresh.length === 0) {
      console.log(`[SAVE] ${date}: 신규 없음 (기존 ${existing.length}건)`)
      continue
    }

    const merged = [...existing, ...fresh]
    if (!dryRun) writeDayFile(date, merged)
    console.log(`[SAVE] ${date}: ${fresh.length}건 추가 → 총 ${merged.length}건`)
  }

  // 날짜 범위 내 기사가 없는 날에도 빈 파일 생성 (gap 방지)
  if (!dryRun && rangeStart && rangeEnd) {
    const cur = new Date(rangeStart)
    const end = new Date(rangeEnd)
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10)
      const filePath = path.join(DATA_DAILY, `${key}.json`)
      if (!fs.existsSync(filePath)) {
        writeDayFile(key, [])
        console.log(`[SAVE] ${key}: 빈 파일 생성 (기사 없음)`)
      }
      cur.setDate(cur.getDate() + 1)
    }
  }
}

function updateIndex(articles) {
  let index = { lastUpdated: '', availableDates: [], availableReports: [], totalArticles: 0 }
  try { index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')) } catch {}

  const newDates  = [...new Set(articles.map(a => a.publishedAt.slice(0, 10)))]
  const allDates  = [...new Set([...newDates, ...index.availableDates])].sort().reverse()
  const newTotal  = (index.totalArticles ?? 0) + articles.length

  if (!dryRun) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify({
      ...index,
      lastUpdated:    new Date().toISOString(),
      availableDates: allDates,
      totalArticles:  newTotal,
    }, null, 2))
  }
  console.log(`[INDEX] 날짜 ${allDates.length}개, 총 ${newTotal}건`)
}

// ── 메인 ─────────────────────────────────────────
async function main() {
  console.log(`\n${'─'.repeat(50)}`)
  if (startDate && endDate) {
    console.log(`에너지 인사이트 크롤러 시작 (기간: ${startDate} ~ ${endDate})`)
  } else {
    console.log(`에너지 인사이트 크롤러 시작 (최근 ${daysBack}일치)`)
  }
  console.log(`${'─'.repeat(50)}\n`)

  const enabledSources = sources.filter(s => s.enabled !== false)
  const rssSources     = enabledSources.filter(s => s.type === 'rss' || s.type === 'google-news')
  const scrapeSources  = enabledSources.filter(s => s.type === 'scrape')
  const pdfSources     = enabledSources.filter(s => s.type === 'pdf')

  console.log(`소스 현황: RSS/GNews ${rssSources.length}개 | 스크래핑 ${scrapeSources.length}개 | PDF ${pdfSources.length}개\n`)

  const crawlOpts = { daysBack, noSummarize, startDate, endDate, dryRun, force }

  // 2단계: RSS + Google News 수집
  console.log('[ 2단계 ] RSS / Google News 수집\n')
  const rssArticles = await crawlRss(rssSources, crawlOpts)

  // 3단계: HTML 스크래핑 수집
  console.log('\n[ 3단계 ] HTML 스크래핑 수집\n')
  const scrapeArticles = await crawlScrape(scrapeSources, crawlOpts)

  // 4단계: PDF 수집 (기관 보고서)
  console.log('\n[ 4단계 ] PDF 수집\n')
  const pdfArticles = await crawlPdf(pdfSources, { noSummarize, dryRun, force })

  const all = [...rssArticles, ...scrapeArticles, ...pdfArticles]
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`수집 완료: 총 ${all.length}건 (RSS/GNews ${rssArticles.length} | 스크래핑 ${scrapeArticles.length} | PDF ${pdfArticles.length})`)
  console.log(`${'─'.repeat(50)}\n`)

  if (all.length > 0) {
    saveDailyArticles(all, { rangeStart: startDate, rangeEnd: endDate })
    updateIndex(all)
  } else {
    console.log('새 기사 없음.')
    // 날짜 범위 모드: 기사가 전혀 없어도 빈 파일 생성
    if (!dryRun && startDate && endDate) {
      saveDailyArticles([], { rangeStart: startDate, rangeEnd: endDate })
    }
  }

  // dry-run 미리보기
  if (dryRun && all.length > 0) {
    console.log('\n[ 미리보기 ]\n')
    all.slice(0, 5).forEach(a => {
      console.log(`  [${a.sourceId}] ${a.title}`)
      console.log(`  토픽: ${a.topics.join(', ') || '미분류'}`)
      console.log(`  URL: ${a.originalUrl}\n`)
    })
  }
}

main()
  .then(() => {
    console.log(`[완료] ${new Date().toISOString()}`)
  })
  .catch(err => {
    console.error(`[ERROR] ${new Date().toISOString()} ${err.message}`)
    process.exit(1)
  })
