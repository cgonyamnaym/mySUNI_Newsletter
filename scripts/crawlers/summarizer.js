/**
 * Gemini API를 이용한 기사 요약 + 토픽 분류
 * - 한국어 기사: 요약 + 토픽 분류
 * - 영어 기사:   한국어 번역 요약 + 토픽 분류
 *
 * 환경변수 GEMINI_API_KEY 필요
 * 발급: https://aistudio.google.com/app/apikey
 *
 * 모델 우선순위: gemini-2.5-flash → gemini-3.1-flash-lite-preview → gemma-3-4b-it
 * 429(rate limit) / 503(일시 과부하) 시 자동 재시도 + 모델 fallback
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

// 모델 우선순위 (앞에서부터 시도)
const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview',
  'gemma-3-4b-it',
]

// 요청 간 최소 간격 (ms) — 분당 6건 기준 10초 (free tier 안정성)
const MIN_INTERVAL_MS = parseInt(process.env.GEMINI_INTERVAL_MS ?? '10000')
let _lastRequestAt = 0

let _genAI = null
function getGenAI() {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')
    }
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _genAI
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}


async function callWithRetry(modelName, prompt) {
  const model = getGenAI().getGenerativeModel({ model: modelName })

  // 분당 10건 제한 — 요청 전 최소 간격 대기
  const now = Date.now()
  const elapsed = now - _lastRequestAt
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed)
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      _lastRequestAt = Date.now()
      return await model.generateContent(prompt)
    } catch (err) {
      const is429 = err.message && err.message.includes('429')
      const is503 = err.message && err.message.includes('503')
      if (is429) {
        throw err  // 429는 재시도 없이 즉시 다음 모델로
      }
      if (is503 && attempt < 2) {
        process.stdout.write(`    ↻ [${modelName}] 503 — 8s 후 재시도 (${attempt + 1}/2)...\n`)
        await sleep(8000)
        _lastRequestAt = Date.now()
      } else {
        throw err
      }
    }
  }
}

/**
 * @param {{ title: string, content: string, lang: 'ko'|'en' }} article
 * @returns {{ titleKo: string, titleOriginal: string|null, summary: string, topics: string[] }}
 */
async function summarize({ title, content, lang }) {
  const topicList = TOPICS.map((t, i) => `${i + 1}. ${t}`).join('\n')

  const prompt = lang === 'ko'
    ? `다음 기사를 분석해줘.

제목: ${title}
본문: ${content.slice(0, 3000)}

아래 JSON 형식으로만 응답해. 마크다운 코드블록 없이 JSON만:
{
  "isEnergyMain": true,
  "titleKo": "기사 제목 (원문 그대로)",
  "titleOriginal": null,
  "summary": "2~3문장 핵심 요약. 구체적 수치나 정책명 포함.",
  "topics": []
}

isEnergyMain: 에너지 산업·정책·기술·시장이 이 기사의 핵심 주제이면 true, 에너지가 부수적으로만 언급되면 false.
topics는 다음 목록에서 최대 2개 선택:
${topicList}`

    : `Analyze the following article.

Title: ${title}
Content: ${content.slice(0, 3000)}

Respond ONLY in JSON, no markdown code blocks:
{
  "isEnergyMain": true,
  "titleKo": "Korean translation of the title",
  "titleOriginal": "${title.replace(/"/g, '\\"')}",
  "summary": "2-3 sentence Korean summary. Include specific numbers and organization names.",
  "topics": []
}

isEnergyMain: true if energy industry/policy/technology/market is the CORE topic of this article, false if energy is only mentioned in passing.
topics: choose up to 2 from the following:
${topicList}`

  // 모델 체인 순서로 시도
  for (const modelName of MODEL_CHAIN) {
    try {
      const result = await callWithRetry(modelName, prompt)
      const text = result.response.text().trim()
      const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      return JSON.parse(clean)
    } catch (err) {
      const is429DailyExhausted = err.message && err.message.includes('429') && err.message.includes('limit: 0')
      const is429 = err.message && err.message.includes('429')
      if (is429DailyExhausted || !is429) {
        // 일일 쿼터 소진이거나 다른 오류 → 다음 모델 시도
        process.stdout.write(`    → [${modelName}] 실패, 다음 모델 시도...\n`)
        continue
      }
      // 일반 429(분당 한도) — 이미 재시도했으므로 다음 모델
      process.stdout.write(`    → [${modelName}] 분당 한도 초과, 다음 모델 시도...\n`)
    }
  }

  // 모든 모델 실패 시 fallback: 키워드 기반 토픽 분류
  const fallbackTopics = []
  const lowerText = `${title || ''} ${content || ''}`.toLowerCase()
  const KEYWORD_MAP = {
    '전력 인프라': ['계통', '송배전', '스마트그리드', '전력망', '분산자원', 'vpp', '인프라', 'grid'],
    '에너지원': ['ess', '에너지저장', '원자력', '연료전지', '원전', 'smr', '태양광', '풍력', '수소', '바이오에너지', '재생에너지', '신재생', '그린수소', '데이터센터', '배터리', 'solar', 'wind'],
    '운영 최적화': ['derms', '수요 예측', '최적화', 'ai', '예측'],
    '정책·규제': ['정책', '법령', '규제', '제도', 'ppa', '정부', '산업부', '법안', 'ferc'],
    'ESG·탄소중립': ['탄소중립', 're100', '탄소시장', 'esg', 'ndc', '탄소', '기후', 'carbon'],
    '시장·가격 동향': ['가격', '수급', '투자', 'smp', '요금', '도매가격', 'lcoe', '시장']
  }
  for (const [topic, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        fallbackTopics.push(topic)
        break
      }
    }
  }
  if (fallbackTopics.length === 0) fallbackTopics.push('시장·가격 동향')

  return {
    isEnergyMain:  true,
    titleKo:       title,
    titleOriginal: lang === 'en' ? title : null,
    summary:       content.slice(0, 200),
    topics:        fallbackTopics.slice(0, 2),
  }
}

module.exports = { summarize }
