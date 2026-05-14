/**
 * 격주 트렌드 리포트 생성 스크립트
 *
 * 사용법:
 *   node scripts/biweekly-report.js              # 현재 격주 기간 리포트 생성
 *   node scripts/biweekly-report.js --force       # 짝수 주차 체크 건너뛰고 강제 실행
 *   node scripts/biweekly-report.js --dry-run     # 파일 저장 없이 결과만 출력
 *
 * 환경변수:
 *   GEMINI_API_KEY=...
 */
require('dotenv').config({ path: '.env.local' })

const fs   = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const DATA_DAILY    = path.join(__dirname, '../public/data/daily')
const DATA_BIWEEKLY = path.join(__dirname, '../public/data/biweekly')
const INDEX_FILE    = path.join(__dirname, '../public/data/index.json')

// 모델 우선순위 — summarizer.js와 동일한 체인
const MODEL_CHAIN      = ['gemini-2.5-flash', 'gemini-3.1-flash-lite-preview', 'gemma-3-4b-it']
const MIN_INTERVAL_MS  = 6500
let   _lastRequestAt   = 0

const args   = process.argv.slice(2)
const force  = args.includes('--force')
const dryRun = args.includes('--dry-run')

// ── Gemini 유틸 ──────────────────────────────────────────────────────────────

let _genAI = null
function getGenAI() {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 환경변수가 없습니다.')
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _genAI
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function extractRetryDelay(err) {
  try {
    const m = err.message.match(/"retryDelay":"(\d+)s"/)
    if (m) return parseInt(m[1], 10) * 1000 + 500
  } catch {}
  return 20000
}

async function callWithRetry(modelName, prompt) {
  const model   = getGenAI().getGenerativeModel({ model: modelName })
  const elapsed = Date.now() - _lastRequestAt
  if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed)

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      _lastRequestAt = Date.now()
      return await model.generateContent(prompt)
    } catch (err) {
      const is429 = err.message?.includes('429')
      const is503 = err.message?.includes('503')
      if ((is429 || is503) && attempt < 2) {
        const delay = is429 ? extractRetryDelay(err) : 8000
        console.log(`  ↻ [${modelName}] ${is429 ? 'rate limit' : '503'} — ${delay/1000}s 후 재시도...`)
        await sleep(delay)
        _lastRequestAt = Date.now()
      } else throw err
    }
  }
}

// ── 날짜/기간 계산 ────────────────────────────────────────────────────────────

function getIsoWeek(date) {
  const d    = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day  = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const year = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - year) / 86400000 + 1) / 7)
}

function getReportId(date = new Date()) {
  const year       = date.getFullYear()
  const week       = getIsoWeek(date)
  const biweekNum  = Math.ceil(week / 2)
  return `${year}-BW${String(biweekNum).padStart(2, '0')}`
}

function getDateRange(date = new Date()) {
  const end   = new Date(date)
  const start = new Date(date)
  start.setDate(start.getDate() - 13)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  }
}

function isEvenWeek(date = new Date()) {
  return getIsoWeek(date) % 2 === 0
}

// ── 기사 로드 ─────────────────────────────────────────────────────────────────

function loadArticlesForRange(startDate, endDate) {
  const articles = []
  const cur      = new Date(startDate)
  const end      = new Date(endDate)

  while (cur <= end) {
    const dateStr  = cur.toISOString().slice(0, 10)
    const filePath = path.join(DATA_DAILY, `${dateStr}.json`)
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        articles.push(...(data.articles ?? []))
      } catch {}
    }
    cur.setDate(cur.getDate() + 1)
  }
  return articles
}

// ── Gemini 리포트 생성 ────────────────────────────────────────────────────────

async function generateReport(articles, startDate, endDate) {
  // 요약이 있는 기사 우선, 최대 80개
  const usable = articles
    .filter(a => a.summary && a.summary.length > 20)
    .slice(0, 80)

  const articleText = usable
    .map(a => `[${(a.topics ?? []).join(', ') || '미분류'}] ${a.title}: ${a.summary}`)
    .join('\n')

  const prompt = `당신은 전력·에너지 산업 수석 애널리스트입니다.

아래는 ${startDate}~${endDate} 2주간 수집된 주요 에너지 뉴스 ${usable.length}건입니다:
${articleText}

아래 JSON 형식으로 격주 트렌드 리포트를 작성해 주세요.
마크다운 코드블록 없이 JSON만 출력하세요.

{
  "headline": "이번 2주를 한 줄로 요약하는 헤드라인 (30자 이내)",
  "topIssues": [
    {"rank": 1, "title": "이슈 제목 (20자 이내)", "summary": "2~3문장 구체적 설명"},
    {"rank": 2, "title": "이슈 제목", "summary": "2~3문장"},
    {"rank": 3, "title": "이슈 제목", "summary": "2~3문장"},
    {"rank": 4, "title": "이슈 제목", "summary": "2~3문장"},
    {"rank": 5, "title": "이슈 제목", "summary": "2~3문장"}
  ],
  "topicSummaries": {
    "전력 인프라": "이 토픽 동향 2~3문장 (관련 기사 없으면 생략)",
    "에너지원": "동향 2~3문장",
    "운영 최적화": "동향 2~3문장",
    "정책·규제": "동향 2~3문장",
    "ESG·탄소중립": "동향 2~3문장",
    "시장·가격 동향": "동향 2~3문장"
  },
  "keyPlayers": [
    {"name": "기업 또는 기관명", "summary": "이번 기간 주목 동향"}
  ],
  "nextPeriodWatch": ["다음 2주 주목 이슈 1", "이슈 2", "이슈 3"]
}`

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`  → [${modelName}] 리포트 생성 중...`)
      const result = await callWithRetry(modelName, prompt)
      const text   = result.response.text().trim()
      const clean  = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      return JSON.parse(clean)
    } catch (err) {
      const isExhausted = err.message?.includes('429') && err.message?.includes('limit: 0')
      const is429       = err.message?.includes('429')
      if (isExhausted || !is429) {
        console.log(`  → [${modelName}] 실패, 다음 모델 시도...`)
        continue
      }
      console.log(`  → [${modelName}] 분당 한도 초과, 다음 모델 시도...`)
    }
  }
  throw new Error('모든 모델에서 리포트 생성 실패')
}

// ── 인덱스 업데이트 ───────────────────────────────────────────────────────────

function updateIndex(reportId) {
  let index = { lastUpdated: '', availableDates: [], availableReports: [], totalArticles: 0 }
  try { index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')) } catch {}

  if (!index.availableReports.includes(reportId)) {
    index.availableReports.unshift(reportId)
    index.availableReports.sort((a, b) => b.localeCompare(a))
  }
  index.lastUpdated = new Date().toISOString()
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2))
  console.log(`[INDEX] availableReports: ${index.availableReports.join(', ')}`)
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '─'.repeat(50))
  console.log('에너지 인사이트 격주 리포트 생성')
  console.log('─'.repeat(50) + '\n')

  if (!force && !isEvenWeek()) {
    const week = getIsoWeek(new Date())
    console.log(`[SKIP] 현재 ISO 주차: ${week}주차 (홀수). 짝수 주차에만 자동 실행됩니다.`)
    console.log('강제 실행하려면 --force 플래그를 사용하세요.')
    return
  }

  const { startDate, endDate } = getDateRange()
  const reportId               = getReportId()

  console.log(`기간: ${startDate} ~ ${endDate}`)
  console.log(`리포트 ID: ${reportId}\n`)

  const articles = loadArticlesForRange(startDate, endDate)
  console.log(`기사 로드: ${articles.length}건`)

  if (articles.length === 0) {
    console.warn('[WARN] 해당 기간 기사 없음. 종료합니다.')
    return
  }

  const trendReport = await generateReport(articles, startDate, endDate)
  console.log('\n리포트 생성 완료.')

  if (dryRun) {
    console.log('\n[dry-run] 결과 미리보기:')
    console.log(JSON.stringify({ reportId, startDate, endDate, trendReport }, null, 2))
    return
  }

  const output = { reportId, startDate, endDate, generatedAt: new Date().toISOString(), trendReport }
  fs.mkdirSync(DATA_BIWEEKLY, { recursive: true })
  fs.writeFileSync(path.join(DATA_BIWEEKLY, `${reportId}.json`), JSON.stringify(output, null, 2))
  console.log(`[SAVE] data/biweekly/${reportId}.json`)

  updateIndex(reportId)
  console.log(`\n[완료] ${new Date().toISOString()}`)
}

main().catch(err => {
  console.error(`[ERROR] ${err.message}`)
  process.exit(1)
})
