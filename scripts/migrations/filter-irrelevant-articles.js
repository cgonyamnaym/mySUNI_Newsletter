/**
 * 기존 daily JSON에서 에너지 무관 기사 소급 제거
 *
 * 사용법:
 *   node scripts/filter-irrelevant-articles.js                         # 전체
 *   node scripts/filter-irrelevant-articles.js --start=2026-04-16 --end=2026-04-30
 *   node scripts/filter-irrelevant-articles.js --dry-run               # 미리보기
 */
const fs   = require('fs')
const path = require('path')
const { isEnergyRelevant } = require('./crawlers/relevance-filter')

const args      = process.argv.slice(2)
const startDate = args.find(a => a.startsWith('--start='))?.split('=')[1] ?? null
const endDate   = args.find(a => a.startsWith('--end='))?.split('=')[1] ?? null
const dryRun    = args.includes('--dry-run')

const DAILY_DIR  = path.join(__dirname, '../public/data/daily')
const INDEX_FILE = path.join(__dirname, '../public/data/index.json')

function processFile(filePath) {
  const date = path.basename(filePath, '.json')
  if (startDate && date < startDate) return null
  if (endDate   && date > endDate)   return null

  let data
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }

  const articles = data.articles ?? []
  if (articles.length === 0) return { date, before: 0, after: 0, removed: 0 }

  const passed  = []
  const removed = []

  for (const a of articles) {
    if (isEnergyRelevant(a.title ?? '', a.summary ?? '', a.originalLang ?? 'ko', a.sourceId ?? '')) {
      passed.push(a)
    } else {
      removed.push(a)
      console.log(`  ✗ [${date}] [${a.source}] ${a.title?.slice(0, 70)}`)
    }
  }

  if (removed.length > 0) {
    console.log(`  → ${date}: ${passed.length}건 유지 / ${removed.length}건 제거 (${articles.length}건 중)`)
    if (!dryRun) {
      fs.writeFileSync(filePath, JSON.stringify({
        ...data,
        generatedAt:  new Date().toISOString(),
        articleCount: passed.length,
        articles:     passed,
      }, null, 2))
    }
  }

  return { date, before: articles.length, after: passed.length, removed: removed.length }
}

function rebuildIndex() {
  let index = {}
  try { index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')) } catch {}
  let total = 0
  const dates = []
  for (const f of fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.json'))) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, f), 'utf-8'))
      if ((d.articles?.length ?? 0) > 0) {
        dates.push(path.basename(f, '.json'))
        total += d.articles.length
      }
    } catch {}
  }
  const updated = { ...index, lastUpdated: new Date().toISOString(), availableDates: dates.sort().reverse(), totalArticles: total }
  if (!dryRun) fs.writeFileSync(INDEX_FILE, JSON.stringify(updated, null, 2))
  return { dates: dates.length, total }
}

function main() {
  const label = startDate && endDate ? `${startDate} ~ ${endDate}` : '전체'
  console.log(`\n${'─'.repeat(55)}`)
  console.log(`에너지 관련성 소급 필터 (범위: ${label})`)
  if (dryRun) console.log('ℹ dry-run 모드: 파일 변경 없음')
  console.log(`${'─'.repeat(55)}\n`)

  const files = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.json')).sort()
  const results = files.map(f => processFile(path.join(DAILY_DIR, f))).filter(Boolean)

  const totalBefore  = results.reduce((s, r) => s + r.before,  0)
  const totalAfter   = results.reduce((s, r) => s + r.after,   0)
  const totalRemoved = results.reduce((s, r) => s + r.removed, 0)

  console.log(`\n${'─'.repeat(55)}`)
  console.log(`완료: 처리 ${results.length}개 파일`)
  console.log(`  기존: ${totalBefore}건 → 유지: ${totalAfter}건 / 제거: ${totalRemoved}건`)

  if (!dryRun) {
    const idx = rebuildIndex()
    console.log(`  index.json: 날짜 ${idx.dates}개, 총 ${idx.total}건`)
  }
  console.log(`${'─'.repeat(55)}\n`)
}

main()
