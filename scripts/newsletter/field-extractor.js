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
 * @param {{ deadlineMs?: number }} [opts]
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
async function extractFieldsMethodA(title, text, lang = 'ko', opts = {}) {
  const body = text.slice(0, 3000)
  const typeList = ARTICLE_TYPES.join('|')

  const prompt = lang === 'en'
    ? buildPromptEn(title, body, typeList)
    : buildPromptKo(title, body, typeList)

  try {
    const raw = await callLLM(prompt, opts)
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    const jsonStr = (start !== -1 && end > start) ? raw.slice(start, end + 1) : raw
    const parsed = JSON.parse(jsonStr)
    return normalizeFields(parsed, body)
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

// ── Source Grounding 검증 ─────────────────────────────────────────────────────

// 원문에 이 마커가 없으면 causal_core는 LLM 추론(hallucination)으로 판단
const CAUSAL_MARKERS = [
  '때문에', '위해', '위한', '로 인해', '배경에는', '원인은', '이유는',
  '에 따라', '기인', '여파로', '영향으로', '목적으로', '차원에서',
  'due to', 'because', 'as a result of', 'in order to', 'driven by', 'motivated by',
]

// 원문에 이 마커가 없으면 business_impact는 LLM 추론으로 판단
const IMPACT_MARKERS = [
  '전망', '기대', '예상', '의미', '시사', '효과', '영향', '기여', '가능',
  '확대', '강화', '개선', '확보', '성장', '주목', '중요',
  'expected', 'anticipated', 'significant', 'impact', 'benefit', 'poised',
]

function hasMarkerInSource(text, markers) {
  const lower = text.toLowerCase()
  return markers.some(m => lower.includes(m))
}

// ── 수치 필드 원자화 ─────────────────────────────────────────────────────────

/**
 * metrics.* 필드는 추출 프롬프트에 개수 제한이 없어 LLM이 값을 여러 개 압축해
 * 담는 경우가 있다("연간 55GWh, 약 900MW ... 및 1GW 이상 ..."). 이후 단계
 * (2단계 요약 프롬프트·수치 보존 검증·fallback 조합)는 모두 "필드 = 값 1개"를
 * 전제로 동작하므로, 이 전제가 깨지면 60자 제한을 넘는 요구/비문 조합 등으로
 * 이어진다. 여기서 첫 절(clause)만 남겨 전제를 파이프라인 진입점에서 보장한다.
 * 숫자 내부 콤마(예: "6,100만")는 구분자로 취급하지 않도록 ", "(콤마+공백)만 사용.
 */
function atomizeMetricField(text) {
  if (!text) return text
  const firstClause = text.split(/,\s|\s및\s|;\s?|\s\(/)[0].trim()
  return firstClause || text
}

/**
 * 수치 필드(예: "100MW", "5,023억원")의 핵심 숫자가 source body에 실제로 존재하는지 검증.
 * LLM이 훈련 데이터에서 수치를 "기억"해 삽입하는 hallucination을 방지.
 */
function isMetricGrounded(fieldText, normalizedSource) {
  if (!fieldText) return true
  const nums = fieldText.match(/\d[\d,]*(?:\.\d+)?/g) ?? []
  if (nums.length === 0) return true  // 숫자 없는 필드는 검증 불가 → 통과
  const primary = nums[0].replace(/,/g, '')
  return normalizedSource.includes(primary)
}

function normalizeFields(parsed, sourceBody = '') {
  const fields = {
    article_type:    parsed.article_type    ?? '발표',
    who: {
      main_actor: parsed.who?.main_actor  ?? null,
      partner:    parsed.who?.partner     ?? null,
      authority:  parsed.who?.authority   ?? null,
    },
    metrics: {
      capacity: atomizeMetricField(parsed.metrics?.capacity  ?? null),
      amount:   atomizeMetricField(parsed.metrics?.amount    ?? null),
      timeline: atomizeMetricField(parsed.metrics?.timeline  ?? null),
      ratio:    atomizeMetricField(parsed.metrics?.ratio     ?? null),
      other:    atomizeMetricField(parsed.metrics?.other     ?? null),
    },
    location_target: parsed.location_target ?? null,
    tech_keywords:   Array.isArray(parsed.tech_keywords) ? parsed.tech_keywords.slice(0, 3) : [],
    causal_core:     parsed.causal_core     ?? null,
    business_impact: parsed.business_impact ?? null,
  }

  if (sourceBody) {
    const normalizedSource = sourceBody.replace(/,/g, '')

    // [수치 grounding] 각 metrics 필드: source에 없는 수치는 LLM hallucination → null 강제
    for (const key of Object.keys(fields.metrics)) {
      if (!isMetricGrounded(fields.metrics[key], normalizedSource)) {
        fields.metrics[key] = null
      }
    }

    // [인과 grounding] 원문에 인과 표현이 없으면 LLM이 추론한 causal_core 무효화
    if (fields.causal_core && !hasMarkerInSource(sourceBody, CAUSAL_MARKERS)) {
      fields.causal_core = null
    }
    // [인과 수치 grounding] causal_core 안의 숫자가 원문에 없으면 hallucination으로 판단
    // (metrics.* 필드와 동일한 검증을 causal_core/business_impact에도 적용 — why/sowhat이
    // 이 필드를 그대로 fallback으로 노출하는 경로가 있어 동일 수준의 grounding이 필요하다)
    if (fields.causal_core && !isMetricGrounded(fields.causal_core, normalizedSource)) {
      fields.causal_core = null
    }

    // [임팩트 grounding] 원문에 임팩트/전망 표현이 없으면 LLM이 추론한 business_impact 무효화
    if (fields.business_impact && !hasMarkerInSource(sourceBody, IMPACT_MARKERS)) {
      fields.business_impact = null
    }
    // [임팩트 수치 grounding] business_impact 안의 숫자가 원문에 없으면 hallucination으로 판단
    if (fields.business_impact && !isMetricGrounded(fields.business_impact, normalizedSource)) {
      fields.business_impact = null
    }
  }

  return fields
}

function fallbackFields(title, _text) {
  // causal_core를 원문 슬라이스로 채우지 않음:
  // LLM 파싱 실패 시 첫 문장은 팩트(what)이며, why 라인으로 노출되면 중복 출력됨
  return {
    article_type:    '발표',
    who:             { main_actor: null, partner: null, authority: null },
    metrics:         { capacity: null, amount: null, timeline: null, ratio: null, other: null },
    location_target: null,
    tech_keywords:   [],
    causal_core:     null,
    business_impact: null,
  }
}

module.exports = { extractFieldsMethodA }
