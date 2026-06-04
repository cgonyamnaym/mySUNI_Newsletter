/**
 * Step 1B — Method B: Sentence Scoring & Selection (rule-based, LLM 없음)
 * 분석·동향·인터뷰·칼럼 기사에서 What/Why/So what 후보 문장 선발
 */
const { extractValidSentences } = require('./article-classifier')

// ── 도메인 키워드 ─────────────────────────────────────────────────────────────

const ENERGY_KEYWORDS = [
  '재생에너지', '태양광', '풍력', '수소', 'ESS', '배터리', '전력망',
  '탄소중립', '원자력', 'SMR', 'BESS', '계통', 'VPP', 'PPA', 'RE100',
  '전기차', '충전', 'HVDC', '스마트그리드', '에너지저장', '태양열',
  'solar', 'wind', 'hydrogen', 'battery', 'grid', 'nuclear', 'renewable',
  'carbon', 'EV', 'storage', 'electrification', 'transition',
]

const ENERGY_METRIC_RE = /\d[\d,]*(?:\.\d+)?\s*(?:MW|GW|kW|TWh|MWh|GWh|kWh|억\s*원|%|만\s*톤|tCO2)/

// ── 문장 역할 마커 ────────────────────────────────────────────────────────────

const CAUSAL_MARKERS = [
  '때문에', '로 인해', '배경에는', '원인은', '이유는', '에 따라',
  '기인', '여파로', '영향으로', 'due to', 'because', 'as a result of',
]

const FUTURE_MARKERS = [
  '전망', '예상', '것으로 보인다', '의미', '시사', '영향을 미칠',
  '주목된다', '기대된다', '가능성', '이끌', '변화시킬',
  'expected', 'anticipated', 'likely', 'suggests', 'signal',
]

const QUOTE_MARKERS = [
  '에 따르면', '밝혔다', '말했다', '설명했다', '강조했다', '언급했다',
  'said', 'noted', 'stated', 'explained', 'according to',
]

// ── 개별 문장 점수 계산 ────────────────────────────────────────────────────────

/**
 * @param {string} sentence
 * @param {number} index       문장 인덱스 (0-based)
 * @param {number} total       전체 유효 문장 수
 * @returns {{ score: number, hasCausal: boolean, hasFuture: boolean }}
 */
function scoreSentence(sentence, index, total) {
  let score = 0

  // 위치 가중치
  const relPos = index / Math.max(total - 1, 1)
  if (relPos < 0.15)      score += 2.0  // 앞부분 (리드)
  else if (relPos < 0.30) score += 1.5
  else if (relPos > 0.85) score += 1.2  // 뒷부분 (결론)
  else                    score += 1.0

  // 에너지 단위 수치 포함 (+1.5)
  if (ENERGY_METRIC_RE.test(sentence)) score += 1.5

  // 에너지 도메인 키워드 (1개당 +0.5, max +2.0)
  const kwCount = ENERGY_KEYWORDS.filter(kw => sentence.toLowerCase().includes(kw.toLowerCase())).length
  score += Math.min(kwCount * 0.5, 2.0)

  // 인용·출처 표현 (+0.8)
  if (QUOTE_MARKERS.some(m => sentence.includes(m))) score += 0.8

  // 길이 페널티
  if (sentence.length < 20 || sentence.length > 200) score -= 0.5

  const hasCausal = CAUSAL_MARKERS.some(m => sentence.includes(m))
  const hasFuture = FUTURE_MARKERS.some(m => sentence.includes(m))

  return { score, hasCausal, hasFuture }
}

// ── 문장 선발 ─────────────────────────────────────────────────────────────────

/**
 * Method B: 문장 스코어링 후 What/Why/So what 3문장 선발
 * @param {string} title
 * @param {string} text
 * @returns {{ what: string, why: string|null, sowhat: string|null }}
 */
function selectSentencesMethodB(title, text) {
  const sentences = extractValidSentences(text)

  if (sentences.length === 0) {
    return { what: title, why: null, sowhat: null }
  }

  // 각 문장 점수 계산 + 문단 인덱스 (5문장 단위 근사)
  const scored = sentences.map((sentence, i) => {
    const { score, hasCausal, hasFuture } = scoreSentence(sentence, i, sentences.length)
    return {
      sentence,
      score,
      hasCausal,
      hasFuture,
      paraIdx: Math.floor(i / 5),
    }
  })

  const byScore = [...scored].sort((a, b) => b.score - a.score)

  // What: 점수 1위 문장
  const whatEntry = byScore[0]

  // Why: 인과 마커 문장 중 최고점, 다른 문단 우선
  const whyCandidates = scored
    .filter(s => s.hasCausal && s !== whatEntry)
    .sort((a, b) => {
      const aDiff = a.paraIdx !== whatEntry.paraIdx ? 1 : 0
      const bDiff = b.paraIdx !== whatEntry.paraIdx ? 1 : 0
      if (aDiff !== bDiff) return bDiff - aDiff
      return b.score - a.score
    })
  const whyEntry = whyCandidates[0] ?? byScore.find(s => s !== whatEntry) ?? null

  // So what: 전망 마커 문장 중 최고점, 이미 선발된 문단 제외 우선
  const usedParas = new Set([whatEntry?.paraIdx, whyEntry?.paraIdx])
  const sowhatCandidates = scored
    .filter(s => s.hasFuture && s !== whatEntry && s !== whyEntry)
    .sort((a, b) => {
      const aDiff = !usedParas.has(a.paraIdx) ? 1 : 0
      const bDiff = !usedParas.has(b.paraIdx) ? 1 : 0
      if (aDiff !== bDiff) return bDiff - aDiff
      return b.score - a.score
    })
  const sowhatEntry = sowhatCandidates[0]
    ?? byScore.find(s => s !== whatEntry && s !== whyEntry)
    ?? null

  return {
    what:   whatEntry?.sentence  ?? title,
    why:    whyEntry?.sentence   ?? null,
    sowhat: sowhatEntry?.sentence ?? null,
  }
}

module.exports = { selectSentencesMethodB, scoreSentence }
