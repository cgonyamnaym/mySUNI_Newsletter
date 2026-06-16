// Aggregates all daily JSON files into a single search-index.json for the /search page.
// Run after crawl: node scripts/build-search-index.js
const fs = require('fs')
const path = require('path')

const DAILY_DIR = path.join(__dirname, '..', 'public', 'data', 'daily')
const OUT_FILE = path.join(__dirname, '..', 'public', 'data', 'search-index.json')

function main() {
  if (!fs.existsSync(DAILY_DIR)) {
    console.error('❌ public/data/daily 디렉토리가 없습니다.')
    process.exit(1)
  }

  const files = fs.readdirSync(DAILY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()

  const articles = []
  const seen = new Set()

  for (const file of files) {
    let daily
    try {
      daily = JSON.parse(fs.readFileSync(path.join(DAILY_DIR, file), 'utf-8'))
    } catch {
      console.warn(`⚠️  파싱 실패: ${file}`)
      continue
    }
    for (const a of (daily.articles || [])) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      articles.push({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        source: a.source,
        sourceOrigin: a.sourceOrigin,
        topics: a.topics || [],
        publishedAt: a.publishedAt,
        originalUrl: a.originalUrl,
        isTranslated: !!a.isTranslated,
      })
    }
  }

  articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), totalCount: articles.length, articles }),
  )

  console.log(`✅ search-index.json 생성 완료: ${articles.length}개 기사 (${files.length}개 파일)`)
}

main()
