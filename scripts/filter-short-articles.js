/**
 * 기존 daily JSON에서 본문 10문장 미만 기사 소급 제거
 *
 * 사용법:
 *   node scripts/filter-short-articles.js                          # 전체 daily 파일
 *   node scripts/filter-short-articles.js --start=2026-04-16 --end=2026-04-30
 *   node scripts/filter-short-articles.js --dry-run               # 실제 삭제 없이 미리보기
 *   node scripts/filter-short-articles.js --concurrency=5         # 동시 요청 수 (기본 5)
 */
require('dotenv').config({ path: '.env.local' })

const fs   = require('fs')
const path = require('path')
const { isBodyLongEnough } = require('./crawlers/body-fetcher')

const args        = process.argv.slice(2)
const startDate   = args.find(a => a.startsWith('--start='))?.split('=')[1] ?? null
const endDate     = args.find(a => a.startsWith('--end='))?.split('=')[1] ?? null
const dryRun      = args.includes('--dry-run')
const concurrency = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? '5')

const DAILY_DIR  = path.join(__dirname, '../public/data/daily')
const INDEX_FILE = path.join(__dirname, '../public/data/index.json')

/** Promise pool — 최대 N개 동시 실행 */
async function pool(tasks, limit) {
  const results = []
  const running = []
  for (const task of tasks) {
    const p = Promise.resolve().then(task).then(r => { results.push(r) })
    running.push(p)
    if (running.length >= limit) {
      await Promise.race(running)
      // 완료된 항목 제거
      for (let i = running.length - 1; i >= 0; i--) {
        const settled = await Promise.race([running[i], Promise.resolve(null)])
        if (settled === null) running.splice(i, 1)
      }
    }
  }
  await Promise.all(running)
  return results
}

async function processFile(filePath) {
  const date = path.basename(filePath, '.json')

  // 날짜 범위 필터
  if (startDate && date < startDate) return null
  if (endDate   && date > endDate)   return null

  let data
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    console.warn(`[SKIP] ${date}: 파일 읽기 실패`)
    return null
  }

  const articles = data.articles ?? []
  if (articles.length === 0) {
    console.log(`[SKIP] ${date}: 기사 없음`)
    return { date, before: 0, after: 0, removed: 0 }
  }

  console.log(`[CHECK] ${date}: ${articles.length}건 본문 검사 중...`)

  // 동시 body 체크 (배치 단위로 concurrency 제한)
  const checks = []
  for (const batch of chunk(articles, concurrency)) {
    const batchResults = await Promise.all(
      batch.map(async article => {
        const { passes, sentenceCount } = await isBodyLongEnough(article.originalUrl)
        return { article, passes, sentenceCount }
      })
    )
    checks.push(...batchResults)
  }

  const passed  = checks.filter(c => c.passes).map(c => c.article)
  const removed = checks.filter(c => !c.passes)

  removed.forEach(c =>
    console.log(`  ✗ [${date}] ${c.sentenceCount}문장 — ${c.article.title?.slice(0, 60) ?? c.article.originalUrl}`)
  )

  console.log(`  → ${passed.length}건 유지 / ${removed.length}건 제거 (${articles.length}건 중)`)

  if (!dryRun && removed.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify({
      ...data,
      generatedAt:  new Date().toISOString(),
      articleCount: passed.length,
      articles:     passed,
    }, null, 2))
  }

  return { date, before: articles.length, after: passed.length, removed: removed.length }
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function rebuildIndex(summary) {
  let index = { lastUpdated: '', availableDates: [], availableReports: [], totalArticles: 0 }
  try { index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')) } catch {}

  // 전체 daily 파일 재집계
  const dailyFiles = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.json'))
  let total = 0
  const dates = []
  for (const f of dailyFiles) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, f), 'utf-8'))
      if ((d.articles?.length ?? 0) > 0) {
        dates.push(path.basename(f, '.json'))
        total += d.articles.length
      }
    } catch {}
  }

  const updated = {
    ...index,
    lastUpdated:    new Date().toISOString(),
    availableDates: dates.sort().reverse(),
    totalArticles:  total,
  }

  if (!dryRun) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(updated, null, 2))
  }
  return { dates: dates.length, total }
}

async function main() {
  const label = startDate && endDate
    ? `${startDate} ~ ${endDate}`
    : '전체'
  console.log(`\n${'─'.repeat(55)}`)
  console.log(`본문 길이 소급 필터 (기준: 10문장 이상, 범위: ${label})`)
  if (dryRun) console.log('ℹ dry-run 모드: 파일 변경 없음')
  console.log(`${'─'.repeat(55)}\n`)

  const files = fs.readdirSync(DAILY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => path.join(DAILY_DIR, f))

  // 파일을 순차 처리 (각 파일 내 기사는 concurrency 병렬)
  const results = []
  for (const filePath of files) {
    const result = await processFile(filePath)
    if (result) results.push(result)
  }

  const totalBefore  = results.reduce((s, r) => s + r.before,  0)
  const totalAfter   = results.reduce((s, r) => s + r.after,   0)
  const totalRemoved = results.reduce((s, r) => s + r.removed, 0)

  console.log(`\n${'─'.repeat(55)}`)
  console.log(`소급 필터 완료`)
  console.log(`  처리 파일: ${results.length}개`)
  console.log(`  기존 기사: ${totalBefore}건`)
  console.log(`  유지:      ${totalAfter}건`)
  console.log(`  제거:      ${totalRemoved}건 (본문 10문장 미만)`)

  if (!dryRun) {
    const idx = rebuildIndex(results)
    console.log(`  index.json: 날짜 ${idx.dates}개, 총 ${idx.total}건`)
  }
  console.log(`${'─'.repeat(55)}\n`)
}

main().catch(err => {
  console.error(`[ERROR] ${err.message}`)
  process.exit(1)
})
