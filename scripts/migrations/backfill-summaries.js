/**
 * 빈 요약 기사 소급 보완 + 영어 요약 한국어 번역
 * - GEMINI_API_KEY 있으면 Gemini로 요약/번역 생성
 * - 없으면 본문 앞 300자를 fallback으로 사용
 *
 * 사용법:
 *   node scripts/backfill-summaries.js                         # 빈 요약 전체 보완
 *   node scripts/backfill-summaries.js --translate-en          # 영어 기사 요약·제목 한국어 번역
 *   node scripts/backfill-summaries.js --start=2026-05-01 --end=2026-05-12
 *   node scripts/backfill-summaries.js --dry-run               # 미리보기 (저장 안 함)
 *   node scripts/backfill-summaries.js --no-sum                # Gemini 없이 본문 fallback만
 */
require('dotenv').config({ path: '.env.local' })

const fs   = require('fs')
const path = require('path')
const { fetchBodyText }  = require('./crawlers/body-fetcher')
const { summarize }      = require('./crawlers/summarizer')

const args        = process.argv.slice(2)
const startDate   = args.find(a => a.startsWith('--start='))?.split('=')[1] ?? null
const endDate     = args.find(a => a.startsWith('--end='))?.split('=')[1] ?? null
const dryRun      = args.includes('--dry-run')
const noSummarize = args.includes('--no-sum') || !process.env.GEMINI_API_KEY
const translateEn = args.includes('--translate-en') && !noSummarize

const DAILY_DIR  = path.join(__dirname, '../public/data/daily')
const INDEX_FILE = path.join(__dirname, '../public/data/index.json')

const label = startDate && endDate ? `${startDate} ~ ${endDate}` : '전체'
const modeLabel = translateEn
  ? '영어 요약·제목 한국어 번역 (Gemini)'
  : noSummarize ? '본문 fallback (Gemini 없음)' : 'Gemini 요약'
console.log(`\n${'─'.repeat(60)}`)
console.log(`요약 소급 처리 (범위: ${label})`)
console.log(`모드: ${modeLabel}`)
if (dryRun) console.log('ℹ dry-run: 파일 저장 안 함')
console.log(`${'─'.repeat(60)}\n`)

// 처리 대상 기사 인덱스 반환
function getTargetIdxs(articles) {
  if (translateEn) {
    // 영어 기사 중 요약에 한글이 없는 것 (번역 미완료)
    return articles
      .map((a, i) => {
        if (a.originalLang !== 'en') return -1
        const summary = (a.summary || '').trim()
        if (/[가-힣]/.test(summary)) return -1   // 이미 한국어 요약 있음
        return i
      })
      .filter(i => i >= 0)
  }
  // 기본: 빈 요약
  return articles
    .map((a, i) => (!(a.summary || '').trim() ? i : -1))
    .filter(i => i >= 0)
}

async function processFile(filePath) {
  const date = path.basename(filePath, '.json')
  if (startDate && date < startDate) return null
  if (endDate   && date > endDate)   return null

  let data
  try { data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { return null }

  const articles = data.articles ?? []
  const targetIdxs = getTargetIdxs(articles)

  if (targetIdxs.length === 0) return { date, total: articles.length, filled: 0, failed: 0 }

  const taskLabel = translateEn ? '영어→한국어 번역' : '빈 요약'
  console.log(`[${date}] ${taskLabel} ${targetIdxs.length}건 처리 중...`)

  let filled = 0, failed = 0

  for (const idx of targetIdxs) {
    const article = articles[idx]
    const url     = article.originalUrl
    const lang    = article.originalLang ?? 'ko'

    process.stdout.write(`  → [${article.source}] ${article.title?.slice(0, 50)}... `)

    try {
      const bodyText = await fetchBodyText(url)

      if (!bodyText.trim()) {
        process.stdout.write('본문 없음 (skip)\n')
        failed++
        continue
      }

      let summary = bodyText.slice(0, 300)
      let titleKo  = null  // 번역된 한국어 제목 (영어 기사만)

      if (!noSummarize) {
        try {
          const meta = await summarize({ title: article.title, content: bodyText, lang })
          if (meta.summary?.trim()) {
            summary = meta.summary
            if (meta.isEnergyMain === false) {
              process.stdout.write('[AI: 비주요] ')
            }
          }
          if (translateEn && meta.titleKo?.trim()) {
            titleKo = meta.titleKo
          }
        } catch (err) {
          process.stdout.write(`[Gemini 실패: ${err.message.slice(0, 30)}] `)
        }
      }

      // 영어 번역 모드: title도 한국어로 업데이트 (titleOriginal은 영어 원제 유지)
      const updated = { ...article, summary }
      if (titleKo) {
        updated.title = titleKo
        if (!updated.titleOriginal) updated.titleOriginal = article.title
      }

      articles[idx] = updated
      filled++
      process.stdout.write('완료\n')

    } catch (err) {
      process.stdout.write(`실패 (${err.message.slice(0, 40)})\n`)
      failed++
    }
  }

  if (filled > 0 && !dryRun) {
    fs.writeFileSync(filePath, JSON.stringify({
      ...data,
      generatedAt:  new Date().toISOString(),
      articles,
    }, null, 2))
  }

  console.log(`  완료: ${filled}건 처리, ${failed}건 실패\n`)
  return { date, total: articles.length, filled, failed }
}

async function main() {
  const files = fs.readdirSync(DAILY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()

  let totalFilled = 0, totalFailed = 0, totalFiles = 0

  for (const f of files) {
    const result = await processFile(path.join(DAILY_DIR, f))
    if (!result) continue
    if (result.filled > 0 || result.failed > 0) {
      totalFilled += result.filled
      totalFailed += result.failed
      totalFiles++
    }
  }

  console.log(`${'─'.repeat(60)}`)
  console.log(`완료: ${totalFiles}개 파일`)
  console.log(`  보완: ${totalFilled}건 / 실패: ${totalFailed}건`)
  if (dryRun) console.log('  (dry-run: 파일 저장 안 함)')
  console.log(`${'─'.repeat(60)}\n`)
}

main().catch(err => {
  console.error('[ERROR]', err.message)
  process.exit(1)
})
