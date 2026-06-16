/**
 * 뉴스레터 요약 파이프라인 CLI
 *
 * 사용법:
 *   node scripts/summarize-newsletter.js --ids=id1,id2,id3
 *   node scripts/summarize-newsletter.js --input=path/to/ids.json
 *   node scripts/summarize-newsletter.js --ids=id1,id2 --dry-run
 *
 * 출력: public/data/newsletter-draft.json
 *
 * ids.json 형식: ["id1", "id2", ...]
 */
require('dotenv').config({ path: '.env.local' })

const fs   = require('fs')
const path = require('path')

const { fetchBodyText, countSentences } = require('./crawlers/body-fetcher')
const { classifyArticle }        = require('./newsletter/article-classifier')
const { extractFieldsMethodA }   = require('./newsletter/field-extractor')
const { selectSentencesMethodB } = require('./newsletter/sentence-selector')
const { generateNewsletterSummary } = require('./newsletter/summary-generator')

// ── 인자 파싱 ─────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

let targetIds = []

const idsArg   = args.find(a => a.startsWith('--ids='))
const inputArg = args.find(a => a.startsWith('--input='))

if (idsArg) {
  targetIds = idsArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
} else if (inputArg) {
  const inputPath = inputArg.split('=')[1]
  targetIds = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
} else {
  console.error('사용법: node scripts/summarize-newsletter.js --ids=id1,id2  또는  --input=ids.json')
  process.exit(1)
}

const DAILY_DIR   = path.join(__dirname, '../public/data/daily')
const OUTPUT_FILE = path.join(__dirname, '../public/data/newsletter-draft.json')

// ── 기사 검색 ─────────────────────────────────────────────────────────────────

function findArticles(ids) {
  const idSet = new Set(ids)
  const found = new Map()

  const files = fs.readdirSync(DAILY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse() // 최신 날짜부터 검색

  for (const file of files) {
    if (found.size === idSet.size) break
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, file), 'utf-8'))
      for (const article of (data.articles ?? [])) {
        if (idSet.has(article.id) && !found.has(article.id)) {
          found.set(article.id, article)
        }
      }
    } catch { /* skip malformed files */ }
  }

  return ids.map(id => found.get(id)).filter(Boolean)
}

// ── 단일 기사 처리 파이프라인 ─────────────────────────────────────────────────

async function processArticle(article) {
  const { title, summary: rawSummary, bodySnippet, originalUrl, sourceId, originalLang } = article
  process.stdout.write(`\n[${sourceId}] ${title.slice(0, 60)}...\n`)

  // 본문 fetch → bodySnippet → rawSummary 순으로 fallback (원문 grounding 우선)
  let body = ''
  try {
    body = await fetchBodyText(originalUrl)
  } catch { /* ignore */ }
  if (!body || countSentences(body) < 3) {
    if (bodySnippet) {
      process.stdout.write('  ↳ 본문 재fetch 실패, bodySnippet 사용\n')
      body = bodySnippet
    } else {
      process.stdout.write('  ↳ 본문 부족(페이월·짧은 본문), rawSummary 사용\n')
      body = rawSummary ?? title
    }
  }

  // Step 0: 유형 판별
  const classification = await classifyArticle(title, body, sourceId ?? '')
  const { method, level, netScore, densityScore } = classification
  process.stdout.write(`  ↳ 판별: Method ${method} (Level ${level}`)
  if (netScore   !== undefined) process.stdout.write(` | net=${netScore.toFixed(1)}`)
  if (densityScore !== undefined) process.stdout.write(` | density=${densityScore.toFixed(2)}`)
  process.stdout.write(')\n')

  // Step 1: 핵심 요소 추출
  let elements
  if (method === 'A') {
    process.stdout.write('  ↳ Step 1A: 필드 추출 (LLM)...\n')
    elements = await extractFieldsMethodA(title, body, originalLang ?? 'ko')
  } else {
    process.stdout.write('  ↳ Step 1B: 문장 선발 (rule-based)...\n')
    elements = selectSentencesMethodB(title, body)
  }

  // Step 2: 3줄 요약 생성
  process.stdout.write('  ↳ Step 2: 3줄 요약 생성 (LLM)...\n')
  const newsletterSummary = await generateNewsletterSummary(method, elements, originalLang ?? 'ko')

  process.stdout.write(`  ✓ what: ${(newsletterSummary.what ?? '').slice(0, 60)}\n`)
  if (newsletterSummary.why)    process.stdout.write(`    why:    ${newsletterSummary.why.slice(0, 60)}\n`)
  if (newsletterSummary.sowhat) process.stdout.write(`    sowhat: ${newsletterSummary.sowhat.slice(0, 60)}\n`)

  return {
    ...article,
    newsletterSummary,
    _meta: { method, level, netScore, densityScore },
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '─'.repeat(60))
  console.log(`뉴스레터 요약 파이프라인`)
  console.log(`대상 기사: ${targetIds.length}건${dryRun ? ' (dry-run)' : ''}`)
  console.log('─'.repeat(60))

  const articles = findArticles(targetIds)
  if (articles.length === 0) {
    console.error('대상 기사를 찾을 수 없습니다.')
    process.exit(1)
  }
  if (articles.length < targetIds.length) {
    const missing = targetIds.filter(id => !articles.find(a => a.id === id))
    console.warn(`주의: ${missing.length}개 ID를 찾지 못했습니다: ${missing.join(', ')}`)
  }

  const results = []
  let successCount = 0
  let failCount    = 0

  for (const article of articles) {
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

  // 기존 newsletter-draft.json의 요약을 보존하며 병합 (덮어쓰지 않음)
  let allArticles = results
  if (!dryRun) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
      const byId = new Map((existing.articles ?? []).map(a => [a.id, a]))
      for (const r of results) { byId.set(r.id, r) }  // 새 결과가 기존을 덮음
      allArticles = Array.from(byId.values())
    } catch { /* 기존 파일 없으면 results만 사용 */ }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    total:       allArticles.length,
    success:     allArticles.filter(a => a.newsletterSummary).length,
    failed:      failCount,
    articles:    allArticles,
  }

  if (!dryRun) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8')
    console.log(`\n출력: ${OUTPUT_FILE}`)
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`완료: ${successCount}건 성공 / ${failCount}건 실패`)
  if (dryRun) console.log('(dry-run: 파일 저장 안 함)')
  console.log('─'.repeat(60) + '\n')
}

main().catch(err => {
  console.error('[FATAL]', err.message)
  process.exit(1)
})
