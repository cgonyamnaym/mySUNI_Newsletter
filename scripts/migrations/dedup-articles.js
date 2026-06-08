/**
 * 기존 daily JSON에서 URL 기준 중복 기사 소급 제거
 *
 * 사용법:
 *   node scripts/dedup-articles.js                         # 전체
 *   node scripts/dedup-articles.js --start=2026-05-01 --end=2026-05-12
 *   node scripts/dedup-articles.js --dry-run               # 미리보기
 */
const fs   = require('fs')
const path = require('path')

const args      = process.argv.slice(2)
const startDate = args.find(a => a.startsWith('--start='))?.split('=')[1] ?? null
const endDate   = args.find(a => a.startsWith('--end='))?.split('=')[1] ?? null
const dryRun    = args.includes('--dry-run')

const DAILY_DIR  = path.join(__dirname, '../public/data/daily')
const INDEX_FILE = path.join(__dirname, '../public/data/index.json')

const label = startDate && endDate ? `${startDate} ~ ${endDate}` : '전체'
console.log(`\n${'─'.repeat(55)}`)
console.log(`URL 중복 기사 소급 제거 (범위: ${label})`)
if (dryRun) console.log('ℹ dry-run 모드: 파일 변경 없음')
console.log(`${'─'.repeat(55)}\n`)

let totalBefore = 0
let totalRemoved = 0
let filesChanged = 0

for (const f of fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.json')).sort()) {
  const date = path.basename(f, '.json')
  if (startDate && date < startDate) continue
  if (endDate   && date > endDate)   continue

  const filePath = path.join(DAILY_DIR, f)
  let data
  try { data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { continue }

  const articles = data.articles ?? []
  if (articles.length === 0) continue

  const seen = new Set()
  const unique = []
  const dupes  = []

  for (const a of articles) {
    if (seen.has(a.originalUrl)) {
      dupes.push(a)
    } else {
      seen.add(a.originalUrl)
      unique.push(a)
    }
  }

  totalBefore  += articles.length
  totalRemoved += dupes.length

  if (dupes.length > 0) {
    filesChanged++
    console.log(`  ${date}: ${articles.length}건 → ${unique.length}건 (중복 ${dupes.length}건 제거)`)
    for (const d of dupes) {
      console.log(`    ✗ [${d.source}] ${d.title?.slice(0, 60)}`)
    }
    if (!dryRun) {
      fs.writeFileSync(filePath, JSON.stringify({
        ...data,
        generatedAt:  new Date().toISOString(),
        articleCount: unique.length,
        articles:     unique,
      }, null, 2))
    }
  }
}

if (!dryRun && filesChanged > 0) {
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
  fs.writeFileSync(INDEX_FILE, JSON.stringify({
    ...index,
    lastUpdated:    new Date().toISOString(),
    availableDates: dates.sort().reverse(),
    totalArticles:  total,
  }, null, 2))
  console.log(`\n  index.json 재빌드: ${dates.length}개 날짜, 총 ${total}건`)
}

console.log(`\n${'─'.repeat(55)}`)
console.log(`완료: 처리 파일 ${filesChanged}개`)
console.log(`  기존 ${totalBefore}건 → 유지 ${totalBefore - totalRemoved}건 / 제거 ${totalRemoved}건`)
if (dryRun) console.log('  (dry-run: 파일 변경 없음)')
console.log(`${'─'.repeat(55)}\n`)
