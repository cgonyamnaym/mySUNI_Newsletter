/**
 * 기존 수집 기사 토픽 재분류 스크립트
 * topics가 비어 있거나 primaryTopic이 없는 기사에 키워드 기반 분류 적용
 *
 * 사용법:
 *   node scripts/reclassify-articles.js                              # 전체 재분류
 *   node scripts/reclassify-articles.js --dry-run                    # 변경 내용 미리보기
 *   node scripts/reclassify-articles.js --start=2026-05-01 --end=2026-05-15
 *   node scripts/reclassify-articles.js --start=2026-05-01 --end=2026-05-15 --dry-run
 */
const fs   = require('fs')
const path = require('path')
const { classifyTopics } = require('./crawlers/classifier')

const DAILY_DIR = path.join(__dirname, '../public/data/daily')

const args    = process.argv.slice(2)
const dryRun  = args.includes('--dry-run')
const startDate = args.find(a => a.startsWith('--start='))?.split('=')[1] ?? null
const endDate   = args.find(a => a.startsWith('--end='))?.split('=')[1]   ?? null

if (startDate || endDate) {
  console.log(`날짜 범위: ${startDate ?? '처음'} ~ ${endDate ?? '끝'}`)
}
if (dryRun) console.log('dry-run 모드: 파일 저장 없음\n')

// 파일명(YYYY-MM-DD.json)이 날짜 범위 안에 있는지 확인
function isInRange(filename) {
  const date = filename.replace('.json', '')
  if (startDate && date < startDate) return false
  if (endDate   && date > endDate)   return false
  return true
}

const files = fs.readdirSync(DAILY_DIR)
  .filter(f => f.endsWith('.json') && isInRange(f))
  .sort()

console.log(`대상 파일 ${files.length}개\n`)

let totalUpdated = 0
let totalSkipped = 0

for (const file of files) {
  const filePath = path.join(DAILY_DIR, file)
  let data
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    console.warn(`⚠ 파싱 실패: ${file}`)
    continue
  }

  if (!Array.isArray(data.articles) || data.articles.length === 0) continue

  let changed = 0
  const updated = data.articles.map(article => {
    const needsTopics  = !Array.isArray(article.topics) || article.topics.length === 0
    const needsPrimary = !article.primaryTopic
    if (!needsTopics && !needsPrimary) {
      totalSkipped++
      return article
    }
    const classified = classifyTopics(
      article.title ?? '',
      article.summary ?? '',
      article.originalLang ?? 'ko',
    )
    changed++
    const newPrimaryTopic = classified.primaryTopic
      ?? (Array.isArray(article.topics) && article.topics.length > 0 ? article.topics[0] : null)
    return {
      ...article,
      topics:       needsTopics   ? classified.topics  : article.topics,
      primaryTopic: needsPrimary  ? newPrimaryTopic     : article.primaryTopic,
    }
  })

  if (changed > 0) {
    totalUpdated += changed
    console.log(`[${file}] ${changed}건 업데이트 (총 ${data.articles.length}건)`)
    if (!dryRun) {
      fs.writeFileSync(filePath, JSON.stringify({ ...data, articles: updated }, null, 2))
    }
  } else {
    console.log(`[${file}] 변경 없음 (${data.articles.length}건 모두 최신)`)
  }
}

console.log(`\n완료: ${totalUpdated}건 업데이트 | ${totalSkipped}건 이미 최신 | ${dryRun ? '(dry-run, 저장 안 됨)' : '저장 완료'}`)
