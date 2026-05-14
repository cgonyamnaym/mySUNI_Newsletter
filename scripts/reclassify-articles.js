/**
 * 기존 수집 기사 토픽 재분류 스크립트
 * topics가 비어 있는 기사에 키워드 기반 분류 적용
 *
 * 사용법:
 *   node scripts/reclassify-articles.js           # 전체 재분류
 *   node scripts/reclassify-articles.js --dry-run  # 변경 내용 미리보기
 */
const fs   = require('fs')
const path = require('path')
const { classifyTopics } = require('./crawlers/classifier')

const DAILY_DIR = path.join(__dirname, '../public/data/daily')
const dryRun    = process.argv.includes('--dry-run')

const files = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.json')).sort()
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
    if (Array.isArray(article.topics) && article.topics.length > 0) {
      totalSkipped++
      return article
    }
    const topics = classifyTopics(
      article.title ?? '',
      article.summary ?? '',
      article.originalLang ?? 'ko',
    )
    if (topics.length > 0) changed++
    return { ...article, topics }
  })

  if (changed > 0) {
    totalUpdated += changed
    console.log(`[${file}] ${changed}건 분류 (총 ${data.articles.length}건)`)
    if (!dryRun) {
      fs.writeFileSync(filePath, JSON.stringify({ ...data, articles: updated }, null, 2))
    }
  }
}

console.log(`\n완료: ${totalUpdated}건 분류 | ${totalSkipped}건 이미 분류됨 | ${dryRun ? '(dry-run, 저장 안 됨)' : '저장 완료'}`)
