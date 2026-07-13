/**
 * Gemini API를 이용한 기사 요약 + 토픽 분류
 * - 한국어 기사: 요약 + 토픽 분류
 * - 영어 기사:   한국어 번역 요약 + 토픽 분류
 *
 * 환경변수 GEMINI_API_KEY 필요
 *
 * 모델 우선순위: gemini-2.5-flash → gemini-2.0-flash-lite → gemini-3.1-flash-lite-preview
 * (gemini-1.5-flash는 Google이 폐기(404 Not Found)하여 gemini-3.1-flash-lite-preview로 교체, 2026-07-13)
 * - 429 수신 시 해당 모델은 GEMINI_COOLDOWN_MS(기본 60s) 동안만 차단 (영구 아님)
 * - 전 모델 쿨다운 중이면 그 기사만 키워드 기반 폴백 처리 (translated: false로 표시)
 */
const { GoogleGenerativeAI } = require('@google/generative-ai')

const TOPICS = [
  '전력 인프라',
  '에너지원',
  '운영 최적화',
  '정책·규제',
  'ESG·탄소중립',
  '시장·가격 동향',
]

const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-3.1-flash-lite-preview',
]

// 모델별 독립 인터벌 추적 (ms)
const MIN_INTERVAL_MS = parseInt(process.env.GEMINI_INTERVAL_MS ?? '4000')
// 단일 호출 타임아웃 (ms)
const GEMINI_CALL_TIMEOUT_MS = parseInt(process.env.GEMINI_CALL_TIMEOUT_MS ?? '20000')

// 429 수신 시 모델을 영구 차단하지 않고 일정 시간만 쉬게 한다.
// 영구 차단 시 크롤링 중반에 트립되면 이후 수백 건이 전부 번역 없이
// computeFallback으로 처리되는 문제가 있었다 (isTranslated 오표기와 결합해 침묵 실패).
const RATE_LIMIT_COOLDOWN_MS = parseInt(process.env.GEMINI_COOLDOWN_MS ?? '60000')

const _lastRequestAtByModel = {}
const _blockedUntilByModel = {}  // modelName → 재시도 가능 시각(ms epoch)

let _genAI = null
function getGenAI() {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _genAI
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function callModel(modelName, prompt) {
  const model = getGenAI().getGenerativeModel({ model: modelName })

  // 모델별 독립 인터벌
  const elapsed = Date.now() - (_lastRequestAtByModel[modelName] ?? 0)
  if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed)

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      _lastRequestAtByModel[modelName] = Date.now()
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`timeout:${GEMINI_CALL_TIMEOUT_MS}ms`)), GEMINI_CALL_TIMEOUT_MS)
      )
      return await Promise.race([model.generateContent(prompt), timeout])
    } catch (err) {
      const is429 = err.message?.includes('429')
      const is503 = err.message?.includes('503')
      if (is429) throw err  // 즉시 상위로 전파 → 모델 차단
      if (is503 && attempt < 2) {
        process.stdout.write(`    ↻ [${modelName}] 503 — 5s 재시도...\n`)
        await sleep(5000)
      } else {
        throw err
      }
    }
  }
}

function computeFallback(title, content, lang) {
  const lowerText = `${title || ''} ${content || ''}`.toLowerCase()
  const KEYWORD_MAP = {
    '전력 인프라': ['계통', '송배전', '스마트그리드', '전력망', '분산자원', 'vpp', '인프라', 'grid'],
    '에너지원': ['ess', '에너지저장', '원자력', '연료전지', '원전', 'smr', '태양광', '풍력', '수소', '바이오에너지', '재생에너지', '신재생', '그린수소', '배터리', 'solar', 'wind'],
    '운영 최적화': ['derms', '수요 예측', '최적화', 'ai', '예측'],
    '정책·규제': ['정책', '법령', '규제', '제도', 'ppa', '정부', '산업부', '법안', 'ferc'],
    'ESG·탄소중립': ['탄소중립', 're100', '탄소시장', 'esg', 'ndc', '탄소', '기후', 'carbon'],
    '시장·가격 동향': ['가격', '수급', '투자', 'smp', '요금', '도매가격', 'lcoe', '시장'],
  }
  const topics = []
  for (const [topic, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => lowerText.includes(kw))) topics.push(topic)
    if (topics.length >= 2) break
  }
  if (topics.length === 0) topics.push('시장·가격 동향')
  return {
    isEnergyMain:  true,
    titleKo:       title,
    titleOriginal: lang === 'en' ? title : null,
    summary:       content.slice(0, 200),
    topics,
    translated:    false,  // 키워드 폴백 — 실제 LLM 번역/요약이 아님
  }
}

/**
 * @param {{ title: string, content: string, lang: 'ko'|'en' }} article
 * @returns {{ titleKo, titleOriginal, summary, topics, isEnergyMain }}
 */
async function summarize({ title, content, lang }) {
  // 쿨다운이 지난 모델만 필터 (영구 차단 아님 — 60초 후 자동 복구)
  const now = Date.now()
  const available = MODEL_CHAIN.filter(m => (_blockedUntilByModel[m] ?? 0) <= now)

  // 전 모델이 쿨다운 중 → 이번 기사만 폴백 (다음 기사에서 재시도)
  if (available.length === 0) {
    return computeFallback(title, content, lang)
  }

  const topicList = TOPICS.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const prompt = lang === 'ko'
    ? `다음 기사를 분석해줘.\n\n제목: ${title}\n본문: ${content.slice(0, 3000)}\n\n아래 JSON 형식으로만 응답해. 마크다운 코드블록 없이 JSON만:\n{\n  "isEnergyMain": true,\n  "titleKo": "기사 제목 (원문 그대로)",\n  "titleOriginal": null,\n  "summary": "2~3문장 핵심 요약. 구체적 수치나 정책명 포함.",\n  "topics": []\n}\n\nisEnergyMain: 에너지 산업·정책·기술·시장이 이 기사의 핵심 주제이면 true, 에너지가 부수적으로만 언급되면 false.\ntopics는 다음 목록에서 최대 2개 선택:\n${topicList}`
    : `Analyze the following article.\n\nTitle: ${title}\nContent: ${content.slice(0, 3000)}\n\nRespond ONLY in JSON, no markdown code blocks:\n{\n  "isEnergyMain": true,\n  "titleKo": "Korean translation of the title",\n  "titleOriginal": "${title.replace(/"/g, '\\"')}",\n  "summary": "2-3 sentence Korean summary. Include specific numbers and organization names.",\n  "topics": []\n}\n\nisEnergyMain: true if energy industry/policy/technology/market is the CORE topic, false if energy is only mentioned in passing.\ntopics: choose up to 2 from:\n${topicList}`

  for (const modelName of available) {
    try {
      const result = await callModel(modelName, prompt)
      const text = result.response.text().trim()
      const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      return { ...JSON.parse(clean), translated: true }
    } catch (err) {
      const is429 = err.message?.includes('429')
      if (is429) {
        _blockedUntilByModel[modelName] = Date.now() + RATE_LIMIT_COOLDOWN_MS
        const remaining = MODEL_CHAIN.filter(m => (_blockedUntilByModel[m] ?? 0) <= Date.now())
        if (remaining.length === 0) {
          process.stdout.write(`\n⚡ 서킷 브레이커: 모든 Gemini 모델 429 — ${RATE_LIMIT_COOLDOWN_MS / 1000}s 쿨다운, 이번 기사는 키워드 분류로 진행\n\n`)
        } else {
          process.stdout.write(`    → [${modelName}] 429, ${RATE_LIMIT_COOLDOWN_MS / 1000}s 쿨다운. 남은 모델: ${remaining.join(', ')}\n`)
        }
      } else {
        process.stdout.write(`    → [${modelName}] 실패 (${err.message?.slice(0, 50)})\n`)
      }
    }
  }

  return computeFallback(title, content, lang)
}

module.exports = { summarize }
