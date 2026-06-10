/**
 * Step 0 — 기사 유형 판별 (Method A / Method B 라우팅)
 *
 * 판별 흐름 (Cascade Early-Exit):
 *   Level 1: 출처 유형 override (즉시 종료)
 *   Level 2: 주 채점 Net Score ≥ 6 → A, ≤ 1 → B
 *   Level 3: 보조 밀도 점수 ≥ 0.30 → A, ≤ -0.10 → B
 *   Level 4: LLM 단일 질문 (회색지대만)
 */
const { callLLM } = require('./gemini-client')

// ── 출처 override ────────────────────────────────────────────────────────────

// 분석·리서치 기관 → B 확정
const SOURCE_OVERRIDE_B = ['iea', 'irena', 'bnef', 'carbon-brief']
// 정부·공공기관 → A 확정
const SOURCE_OVERRIDE_A = ['kea']

// ── A-Score 신호 ─────────────────────────────────────────────────────────────

const ENERGY_METRIC_RE = /\d[\d,]*(?:\.\d+)?\s*(?:MW|GW|kW|TWh|MWh|GWh|kWh|억\s*원|조\s*원|만\s*원|백만\s*원|%|만\s*톤|tCO2|건|개|명|MW급|GW급|억\s*달러|만\s*달러)/g

const COMPLETION_VERBS = [
  '체결됐다', '수주됐다', '발표됐다', '착공됐다', '준공됐다', '취득됐다',
  '결정됐다', '확정됐다', '합의됐다', '출시됐다', '공개됐다', '선정됐다',
  '승인됐다', '고시됐다', '완료됐다', '설립됐다', '착수됐다', '개통됐다',
  '체결했다', '수주했다', '발표했다', '착공했다', '준공했다', '취득했다',
  '결정했다', '확정했다', '합의했다', '출시했다', '공개했다', '선정했다',
  '승인했다', '고시했다', '계약했다', '투자했다', '인수했다', '합병했다',
]

const CORP_SUFFIXES = [
  '전력', '에너지', '솔루션', '테크', '코리아', '그룹', '전기', '산업',
  '화학', '건설', '엔지니어링', '시스템', '공사', '공단', '연구원',
  '협회', '위원회',
]

const TITLE_A_KEYWORDS = [
  '계약', '수주', '착공', '준공', '발표', '고시', '출시', '인증', '취득',
  '체결', '투자', '인수', '합병', '분사', 'MOU', '협약', '실적', '수상',
  '선정', '승인', '완공', '개통', '착수', '구축', '도입',
]

// ── B-Score 신호 ─────────────────────────────────────────────────────────────

const PREDICTIVE_EXPRESSIONS = [
  '전망', '예상', '추정', '될 것으로', '검토 중', '검토하고', '예측',
  '전망된다', '예상된다', '추정된다', '것으로 보인다', '것으로 알려졌다',
  '할 방침', '할 계획', '할 예정', '검토할', '논의 중',
]

const TITLE_B_KEYWORDS = [
  '분석', '동향', '전망', '인터뷰', '칼럼', '기고', '진단', '해설',
  '과제', '방향', '현황', '트렌드', '리뷰', '평가', '전략',
]

const ANALYSIS_LANGUAGE = [
  '시사', '과제', '방향', '트렌드', '패러다임', '구조적', '근본적',
]

// ── 밀도 신호 ─────────────────────────────────────────────────────────────────

const CONNECTIVE_EXPRESSIONS = [
  '이에', '따라서', '이처럼', '반면에', '특히', '하지만', '그러나',
  '이를 통해', '이에 따라', '이와 함께', '이로 인해', '그 결과',
  '이에 반해', '또한', '뿐만 아니라', '이와 관련해', '이와 달리',
  '이에 앞서', '한편', '이 같은',
]

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function extractValidSentences(text) {
  return text
    .split(/[.!?。？！]+\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 15)
}

// ── 주 채점 (Net Score) ───────────────────────────────────────────────────────

function countEnergyMetrics(text) {
  const m = text.match(ENERGY_METRIC_RE)
  return m ? m.length : 0
}

function countCompletionVerbs(text) {
  return COMPLETION_VERBS.filter(v => text.includes(v)).length
}

function countCorpEntities(text) {
  const words = text.split(/[\s,()「」『』【】〔〕\[\]]+/)
  const found = new Set()
  for (const w of words) {
    if (w.length >= 3 && CORP_SUFFIXES.some(s => w.endsWith(s))) found.add(w)
  }
  return found.size
}

function computeMainScore(title, text) {
  const combined = title + ' ' + text

  // A-Score (max 10)
  const metricScore  = Math.min(countEnergyMetrics(combined), 3)
  const verbScore    = countCompletionVerbs(combined) > 0 ? 3 : 0
  const entityCount  = countCorpEntities(text)
  const entityScore  = entityCount === 1 ? 2 : entityCount <= 3 ? 1 : 0
  const titleAScore  = TITLE_A_KEYWORDS.some(k => title.includes(k)) ? 2 : 0
  const aScore       = metricScore + verbScore + entityScore + titleAScore

  // B-Score (max 6)
  const predScore    = Math.min(PREDICTIVE_EXPRESSIONS.filter(e => combined.includes(e)).length, 3)
  const titleBScore  = TITLE_B_KEYWORDS.some(k => title.includes(k)) ? 2 : 0
  const analysisScore = Math.min(ANALYSIS_LANGUAGE.filter(w => combined.includes(w)).length * 0.5, 1)
  const bScore       = predScore + titleBScore + analysisScore

  return aScore - bScore
}

// ── 보조 밀도 채점 ────────────────────────────────────────────────────────────

function computeDensityScore(text) {
  const sentences = extractValidSentences(text)
  const n = sentences.length
  if (n === 0) return 0

  const 수치밀도      = countEnergyMetrics(text) / n
  const 완료동사밀도  = COMPLETION_VERBS.filter(v => text.includes(v)).length / n
  const 예측표현밀도  = PREDICTIVE_EXPRESSIONS.filter(e => text.includes(e)).length / n
  const 연결표현밀도  = sentences.filter(s =>
    CONNECTIVE_EXPRESSIONS.some(c => s.startsWith(c))
  ).length / n

  return (수치밀도 * 2.0) + (완료동사밀도 * 1.5)
       - (예측표현밀도 * 1.5) - (연결표현밀도 * 1.0)
}

// ── Level 4: LLM 판별 (회색지대만) ───────────────────────────────────────────

async function classifyWithLLM(title, text) {
  const sentences = extractValidSentences(text)
  const lead = sentences.slice(0, 3).join(' ')

  const prompt = `이 기사 제목과 첫 문단에서 아래 3가지가 모두 확인되는가?
1. 특정 기업·기관명 (행위자)
2. 완료된 행동 동사 (수주·발표·체결·착공 등)
3. 구체적 수치 (MW, 억원, % 등 단위 포함)

제목: ${title}
첫 문단: ${lead}

JSON만 응답 (마크다운 없이):
{ "all_three": true }  또는  { "all_three": false }`

  try {
    const raw = await callLLM(prompt)
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    const jsonStr = (start !== -1 && end > start) ? raw.slice(start, end + 1) : raw
    const parsed = JSON.parse(jsonStr)
    return parsed.all_three === true ? 'A' : 'B'
  } catch {
    return 'B' // 불확실하면 보수적으로 B
  }
}

// ── 메인 분류 함수 ────────────────────────────────────────────────────────────

/**
 * 기사 유형을 판별하여 Method A 또는 B를 반환
 * @param {string} title
 * @param {string} text   기사 본문
 * @param {string} sourceId   sources.js의 id 값
 * @returns {Promise<{ method: 'A'|'B', level: number, netScore?: number, densityScore?: number }>}
 */
async function classifyArticle(title, text, sourceId = '') {
  // Level 1: 출처 override
  if (SOURCE_OVERRIDE_A.includes(sourceId)) return { method: 'A', level: 1 }
  if (SOURCE_OVERRIDE_B.includes(sourceId)) return { method: 'B', level: 1 }

  // Level 2: 주 채점
  const netScore = computeMainScore(title, text)
  if (netScore >= 6) return { method: 'A', level: 2, netScore }
  if (netScore <= 1) return { method: 'B', level: 2, netScore }

  // Level 3: 밀도 채점
  const densityScore = computeDensityScore(text)
  if (densityScore >= 0.30)  return { method: 'A', level: 3, netScore, densityScore }
  if (densityScore <= -0.10) return { method: 'B', level: 3, netScore, densityScore }

  // Level 4: LLM (회색지대)
  const method = await classifyWithLLM(title, text)
  return { method, level: 4, netScore, densityScore }
}

module.exports = { classifyArticle, computeMainScore, computeDensityScore, extractValidSentences }
