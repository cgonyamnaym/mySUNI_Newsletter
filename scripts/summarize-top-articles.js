/**
 * 크롤링 후 자동 실행 — 연관성 상위 N개 기사 전부 요약
 *
 * 사용법:
 *   node scripts/summarize-top-articles.js           # 기본: 최근 14일, 상위 30개
 *   node scripts/summarize-top-articles.js --days=7  # 최근 7일치 기사 대상
 *   node scripts/summarize-top-articles.js --limit=20 # 상위 20개만
 *   node scripts/summarize-top-articles.js --dry-run  # 파일 저장 없음
 *
 * 출력: public/data/newsletter-draft.json
 *   → /generate 페이지에서 자동으로 병합하여 3줄 요약 표시
 */
require('dotenv').config({ path: '.env.local' })

const fs   = require('fs')
const path = require('path')

const { screenArticles }            = require('./newsletter/node-screener')
const { fetchBodyText }             = require('./crawlers/body-fetcher')
const { classifyArticle }           = require('./newsletter/article-classifier')
const { extractFieldsMethodA }      = require('./newsletter/field-extractor')
const { selectSentencesMethodB }    = require('./newsletter/sentence-selector')
const { generateNewsletterSummary } = require('./newsletter/summary-generator')

// ── CLI 인자 ─────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const days   = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1]  ?? '14')
const limit  = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '30')

const DAILY_DIR   = path.join(__dirname, '../public/data/daily')
const OUTPUT_FILE = path.join(__dirname, '../public/data/newsletter-draft.json')

// ── 최근 N일 기사 로드 ────────────────────────────────────────────────────────
function loadRecentArticles(daysBack) {
  const files = fs.readdirSync(DAILY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, daysBack)

  const articles = []
  const seen = new Set()

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, file), 'utf-8'))
      for (const a of (data.articles ?? [])) {
        if (!seen.has(a.id)) {
          seen.add(a.id)
          articles.push(a)
        }
      }
    } catch { /* skip malformed */ }
  }

  return articles
}

// ── 기존 draft에서 유효한 요약 로드 (이미 생성된 건 재사용) ───────────────────
function loadExistingSummaries() {
  try {
    const draft = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
    const map = new Map()
    for (const a of (draft.articles ?? [])) {
      if (a.newsletterSummary?.what) {
        map.set(a.id, a.newsletterSummary)
      }
    }
    return map
  } catch {
    return new Map()
  }
}

// ── 단일 기사 처리 ────────────────────────────────────────────────────────────
async function processArticle(article) {
  const { title, summary: rawSummary, originalUrl, sourceId, originalLang } = article
  process.stdout.write(`\n[${sourceId}] ${title.slice(0, 60)}...\n`)

  let body = ''
  try {
    body = await fetchBodyText(originalUrl)
  } catch { /* ignore */ }
  if (!body || body.length < 50) {
    process.stdout.write('  ↳ 본문 없음, 기존 요약 사용\n')
    body = rawSummary ?? title
  }

  const classification = await classifyArticle(title, body, sourceId ?? '')
  const { method, level, netScore, densityScore } = classification
  process.stdout.write(`  ↳ 판별: Method ${method} (Level ${level}`)
  if (netScore   !== undefined) process.stdout.write(` | net=${netScore.toFixed(1)}`)
  if (densityScore !== undefined) process.stdout.write(` | density=${densityScore.toFixed(2)}`)
  process.stdout.write(')\n')

  let elements
  if (method === 'A') {
    process.stdout.write('  ↳ Step 1A: 필드 추출 (LLM)...\n')
    elements = await extractFieldsMethodA(title, body, originalLang ?? 'ko')
  } else {
    process.stdout.write('  ↳ Step 1B: 문장 선발 (rule-based)...\n')
    elements = selectSentencesMethodB(title, body)
  }

  process.stdout.write('  ↳ Step 2: 3줄 요약 생성 (LLM)...\n')
  const newsletterSummary = await generateNewsletterSummary(method, elements, originalLang ?? 'ko')

  process.stdout.write(`  ✓ what: ${(newsletterSummary.what ?? '').slice(0, 60)}\n`)
  if (newsletterSummary.why)    process.stdout.write(`    why:    ${newsletterSummary.why.slice(0, 60)}\n`)
  if (newsletterSummary.sowhat) process.stdout.write(`    sowhat: ${newsletterSummary.sowhat.slice(0, 60)}\n`)

  return { ...article, newsletterSummary, _meta: { method, level, netScore, densityScore } }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '─'.repeat(60))
  console.log(`뉴스레터 상위 기사 자동 요약 파이프라인`)
  console.log(`대상: 최근 ${days}일 기사 → 상위 ${limit}개 선발`)
  if (dryRun) console.log('(dry-run: 파일 저장 안 함)')
  console.log('─'.repeat(60))

  // 1. 최근 기사 로드
  const allArticles = loadRecentArticles(days)
  console.log(`\n수집된 기사 총 ${allArticles.length}건`)

  if (allArticles.length === 0) {
    console.error('기사가 없습니다. npm run crawl 을 먼저 실행하세요.')
    process.exit(1)
  }

  // 2. 스크리닝 — 상위 N개 선발
  const topArticles = screenArticles(allArticles, { limit })
  console.log(`스크리닝 후 선발: ${topArticles.length}건`)

  // 3. 기존 요약 재사용 (API 호출 최소화)
  const existingSummaries = loadExistingSummaries()
  const needSummary = topArticles.filter(a => !existingSummaries.has(a.id))
  const alreadySummarized = topArticles.filter(a => existingSummaries.has(a.id))

  console.log(`  이미 요약됨: ${alreadySummarized.length}건 (재사용)`)
  console.log(`  신규 요약 필요: ${needSummary.length}건`)

  // 4. 신규 기사 요약 생성
  const results = []
  let successCount = alreadySummarized.length
  let failCount    = 0

  // 기존 요약 먼저 추가
  for (const article of alreadySummarized) {
    results.push({ ...article, newsletterSummary: existingSummaries.get(article.id) })
  }

  // 신규 요약 생성 (기사 간 5초 쿨다운으로 rate limit 분산)
  for (let i = 0; i < needSummary.length; i++) {
    const article = needSummary[i]
    if (i > 0) {
      process.stdout.write(`\n  ⏳ 다음 기사까지 5s 대기 (${i}/${needSummary.length})...\n`)
      await new Promise(r => setTimeout(r, 5000))
    }
    try {
      const result = await processArticle(article)
      results.push(result)
      successCount++
    } catch (err) {
      console.error(`  ✗ 처리 실패 [${article.id}]: ${err.message}`)
      results.push({ ...article, newsletterSummary: null, _meta: { error: err.message } })
      failCount++
    }
  }

  // 5. 저장
  const output = {
    generatedAt: new Date().toISOString(),
    total:       results.length,
    success:     successCount,
    failed:      failCount,
    articles:    results,
  }

  if (!dryRun) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8')
    console.log(`\n출력: ${OUTPUT_FILE}`)
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`완료: ${successCount}건 요약 / ${failCount}건 실패`)
  if (dryRun) console.log('(dry-run: 파일 저장 안 함)')
  console.log('─'.repeat(60) + '\n')
}

main().catch(err => {
  console.error('[FATAL]', err.message)
  process.exit(1)
})