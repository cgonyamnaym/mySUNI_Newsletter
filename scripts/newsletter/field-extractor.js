/**
 * Step 1A — Method A: Structured Field Extraction (LLM)
 * 팩트형 기사에서 도메인 전용 필드를 JSON으로 추출
 */
const { callLLM } = require('./gemini-client')

const ARTICLE_TYPES = [
  '계약', '수주', '발표', '정책', '기술발표', '투자', '착공준공',
  '실적', 'MOU', '인증', '인수합병',
]

/**
 * @param {string} title
 * @param {string} text   기사 본문 (최대 3000자 사용)
 * @param {'ko'|'en'} lang
 * @returns {Promise<{
 *   article_type: string,
 *   who: { main_actor: string|null, partner: string|null, authority: string|null },
 *   metrics: { capacity: string|null, amount: string|null, timeline: string|null, ratio: string|null, other: string|null },
 *   location_target: string|null,
 *   tech_keywords: string[],
 *   causal_core: string|null,
 *   business_impact: string|null
 * }>}
 */
async function extractFieldsMethodA(title, text, lang = 'ko') {
  const body = text.slice(0, 3000)
  const typeList = ARTICLE_TYPES.join('|')

  const prompt = lang === 'en'
    ? buildPromptEn(title, body, typeList)
    : buildPromptKo(title, body, typeList)

  try {
    const raw = await callLLM(prompt)
    const parsed = JSON.parse(raw)
    return normalizeFields(parsed)
  } catch (err) {
    return fallbackFields(title, text)
  }
}

function buildPromptKo(title, body, typeList) {
  return `다음 에너지 뉴스 기사에서 핵심 요소를 추출해줘.

제목: ${title}
본문: ${body}

아래 JSON 형식으로만 응답. 마크다운 코드블록 없이 JSON만:
{
  "article_type": "${typeList} 중 가장 적합한 1개",
  "who": {
    "main_actor": "주요 행위자 기업명 또는 기관명 (없으면 null)",
    "partner": "상대방 또는 파트너 (없으면 null)",
    "authority": "관련 정부·규제 기관 (없으면 null)"
  },
  "metrics": {
    "capacity": "전력 용량 단위 포함 (MW·GW 등, 없으면 null)",
    "amount": "금액 단위 포함 (억원·조원 등, 없으면 null)",
    "timeline": "일정·기한 (없으면 null)",
    "ratio": "비율·목표치 (% 포함, 없으면 null)",
    "other": "기타 핵심 수치 (없으면 null)"
  },
  "location_target": "지역 또는 대상 시장 (없으면 null)",
  "tech_keywords": ["기술·솔루션 키워드 최대 3개"],
  "causal_core": "핵심 인과 또는 배경 1문장 (없으면 null)",
  "business_impact": "사업 임팩트 또는 의의 1문장 (없으면 null)"
}`
}

function buildPromptEn(title, body, typeList) {
  return `Extract key elements from the following energy news article.
All text fields must be written in KOREAN (한국어).

Title: ${title}
Body: ${body}

Respond ONLY in JSON, no markdown code blocks:
{
  "article_type": "one of: ${typeList}",
  "who": {
    "main_actor": "한국어로 작성 — main company or organization name translated to Korean (null if none)",
    "partner": "한국어로 작성 — counterpart or partner translated to Korean (null if none)",
    "authority": "한국어로 작성 — government or regulatory body translated to Korean (null if none)"
  },
  "metrics": {
    "capacity": "power capacity with unit (MW/GW etc, null if none)",
    "amount": "monetary amount with unit (null if none)",
    "timeline": "schedule or deadline (null if none)",
    "ratio": "percentage or target ratio (null if none)",
    "other": "other key figures (null if none)"
  },
  "location_target": "한국어로 작성 — geographic location or target market in Korean (null if none)",
  "tech_keywords": ["한국어로 작성 — up to 3 technology or solution keywords in Korean"],
  "causal_core": "한국어로 작성 — 1-sentence core cause or background in Korean (null if none)",
  "business_impact": "한국어로 작성 — 1-sentence business impact or significance in Korean (null if none)"
}`
}

function normalizeFields(parsed) {
  return {
    article_type:    parsed.article_type    ?? '발표',
    who: {
      main_actor: parsed.who?.main_actor  ?? null,
      partner:    parsed.who?.partner     ?? null,
      authority:  parsed.who?.authority   ?? null,
    },
    metrics: {
      capacity: parsed.metrics?.capacity  ?? null,
      amount:   parsed.metrics?.amount    ?? null,
      timeline: parsed.metrics?.timeline  ?? null,
      ratio:    parsed.metrics?.ratio     ?? null,
      other:    parsed.metrics?.other     ?? null,
    },
    location_target: parsed.location_target ?? null,
    tech_keywords:   Array.isArray(parsed.tech_keywords) ? parsed.tech_keywords.slice(0, 3) : [],
    causal_core:     parsed.causal_core     ?? null,
    business_impact: parsed.business_impact ?? null,
  }
}

function fallbackFields(title, text) {
  return {
    article_type:    '발표',
    who:             { main_actor: null, partner: null, authority: null },
    metrics:         { capacity: null, amount: null, timeline: null, ratio: null, other: null },
    location_target: null,
    tech_keywords:   [],
    causal_core:     (text || title).slice(0, 100) || null,
    business_impact: null,
  }
}

module.exports = { extractFieldsMethodA }
