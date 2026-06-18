/**
 * Step 2 — 3줄 요약 생성 (LLM)
 * Method A/B 추출 결과를 고정 템플릿으로 What / Why / So what 생성
 *
 * 왜곡 방지 원칙:
 *   - 핵심 문장/필드는 기사에서 직접 추출된 원문 근거입니다.
 *   - 이 근거들만을 기반으로 요약을 작성합니다.
 *   - 근거에 없는 내용을 추가하거나 추정할 수 없습니다.
 *   - 검증은 프롬프트(소프트) + 코드(하드) 2중으로 수행합니다.
 *
 * 코드 레벨 검증 항목:
 *   1. what 근거 없음  → what/why/sowhat 전부 null 강제
 *   2. 수치 보존       → 소스 수치가 출력에 없으면 fallback 텍스트로 교체
 *   3. 엔티티 보존     → 핵심 행위자명이 출력에 없으면 fallback 텍스트로 교체 (Method A)
 *   4. why/sowhat 근거 없음 → null 강제 (LLM 생성 내용 무효화)
 */
const { callLLM } = require('./gemini-client')

// ── 합쇼체 → 신문 기사체 어미 변환 ──────────────────────────────────────────

const HAMNIDA_MAP = {
  '했습니다': '했다', '됐습니다': '됐다', '받았습니다': '받았다',
  '했습니다만': '했지만', '됩니다': '된다', '합니다': '한다',
  '입니다': '이다', '있습니다': '있다', '없습니다': '없다',
  '겠습니다': '겠다', '습니다': '다',
}
// 길이 내림차순 정렬로 긴 어미 우선 매칭
const HAMNIDA_RE = new RegExp(
  `(${Object.keys(HAMNIDA_MAP).sort((a, b) => b.length - a.length).join('|')})([\\.!?,]?)`,
  'g'  // 문장 중간 합쇼체도 전부 변환
)

function normalizeEnding(text) {
  if (!text) return text
  return text.replace(HAMNIDA_RE, (_, ending, punct) =>
    (HAMNIDA_MAP[ending] ?? '다') + punct
  )
}

// ── 폴백 텍스트 정제 ──────────────────────────────────────────────────────────

/**
 * 폴백 문장을 정제: 줄바꿈 제거, 어미 변환, 길이 제한, 보일러플레이트 감지
 * @param {string|null} text
 * @returns {string|null}
 */
function sanitizeFallbackText(text) {
  if (!text) return null
  const cleaned = normalizeEnding(
    text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  )
  if (cleaned.length < 10 || cleaned.length > 200) return null
  // 이메일, 해시태그 다수, 저작권 고지 포함 시 보일러플레이트로 판단
  if (cleaned.includes('@')) return null
  if ((cleaned.match(/#\S+/g) ?? []).length >= 3) return null
  if (cleaned.includes('저작권자') || cleaned.includes('무단전재')) return null
  return cleaned
}

// ── 수치 추출 및 검증 ─────────────────────────────────────────────────────────

const METRIC_RE = /\d[\d,]*(?:\.\d+)?\s*(?:MW|GW|kW|TWh|MWh|GWh|kWh|억\s?원|조\s?원|만\s?원|%|만\s?톤|tCO2)/g

/**
 * 수치 비교용 정규화: 공백 제거 + 숫자 사이 쉼표 제거
 * "7,200 억원" → "7200억원" (LLM이 쉼표를 빼도 동일 수치로 인식)
 */
function normalizeNumeric(text) {
  return text.replace(/\s/g, '').replace(/(\d),(\d)/g, '$1$2')
}

/** 텍스트에서 수치+단위 패턴을 추출 (정규화 적용) */
function extractMetricValues(text) {
  if (!text) return []
  return [...(text.matchAll(METRIC_RE))].map(m => normalizeNumeric(m[0]))
}

/** 소스 수치 전체가 출력 텍스트에 포함되어 있는지 확인 (정규화 비교) */
function allMetricsPreserved(outputText, sourceMetrics) {
  if (!outputText || sourceMetrics.length === 0) return true
  const normalized = normalizeNumeric(outputText)
  return sourceMetrics.every(m => normalized.includes(m))
}

// ── Method A fallback 템플릿 (LLM 없이 직접 조합) ────────────────────────────

// 기사 유형별 종결 표현
const TYPE_ENDING = {
  '계약':    '계약을 체결했다',
  'MOU':     'MOU를 체결했다',
  '수주':    '사업을 수주했다',
  '발표':    '계획을 발표했다',
  '정책':    '정책을 발표했다',
  '기술발표':'기술을 공개했다',
  '투자':    '투자를 결정했다',
  '착공준공':'공사에 착수했다',
  '실적':    '실적을 발표했다',
  '인증':    '인증을 취득했다',
  '인수합병':'인수합병을 발표했다',
}

/**
 * 검증 실패 시 LLM을 우회하여 자연어 문장을 직접 조합
 * "행위자가 수치 규모 TYPE_ENDING" 형식
 */
function buildMethodAWhatFallback(fields) {
  const actor = fields.who.main_actor
  const metricValues = Object.values(fields.metrics).filter(Boolean)
  const hasSubstance = !!(actor || metricValues.length > 0)

  if (!hasSubstance && fields.causal_core) {
    return fields.causal_core.slice(0, 80)
  }
  if (!hasSubstance) return null

  const parts = []

  if (actor) {
    // 받침 유무에 따라 이/가 선택 (한글 마지막 글자 기준)
    const last = actor[actor.length - 1]
    const code = last.charCodeAt(0)
    const isHangul = code >= 0xAC00 && code <= 0xD7A3
    const hasBatchim = isHangul && (code - 0xAC00) % 28 !== 0
    parts.push(actor + (hasBatchim ? '이' : '가'))
  }

  if (metricValues.length > 0) {
    parts.push(metricValues.join('·') + ' 규모')
  }

  parts.push(TYPE_ENDING[fields.article_type] ?? '발표했다')

  return parts.join(' ')
}

// ── 출력 검증 및 복구 ─────────────────────────────────────────────────────────

/**
 * LLM 출력을 소스 근거와 대조하여 왜곡 여부를 검증하고 복구
 *
 * @param {{ what: string|null, why: string|null, sowhat: string|null }} parsed  LLM 출력
 * @param {{
 *   whatAvailable:   boolean,       // what 근거 존재 여부
 *   whatMetrics:     string[],      // 소스에서 추출된 수치 목록
 *   whatEntity:      string|null,   // 검증할 핵심 엔티티명 (Method A)
 *   whatFallback:    string|null,   // 검증 실패 시 대체 텍스트
 *   whySource:       boolean,       // why 근거 존재 여부
 *   whyMetrics:      string[],      // why 소스 문장의 수치 목록
 *   whyFallback:     string|null,   // why 검증 실패 시 소스 문장 원문
 *   sowhatSource:    boolean,       // sowhat 근거 존재 여부
 *   sowhatMetrics:   string[],      // sowhat 소스 문장의 수치 목록
 *   sowhatFallback:  string|null,   // sowhat 검증 실패 시 소스 문장 원문
 * }} constraints
 */
function validateAndRepair(parsed, constraints) {
  // LLM 직접 출력 정제: 줄바꿈 제거 + 어미 변환 + 길이 초과 시 자르기
  function cleanLlm(text, maxLen) {
    if (!text) return null
    let s = normalizeEnding(
      text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
    )
    if (s.length > maxLen) {
      // 최대 길이 내에서 '다' 종결 위치를 역방향 탐색 (최소 65% 지점 이후)
      const window = s.slice(0, maxLen)
      const minPos = Math.floor(maxLen * 0.65)
      let cut = -1
      for (let i = window.length - 1; i >= minPos; i--) {
        if (window[i] === '다') {
          const next = window[i + 1]
          if (!next || /[.。!?,\s]/.test(next)) { cut = i + 1; break }
        }
      }
      s = cut > 0 ? window.slice(0, cut).trim() : window.trim()
    }
    return s.length >= 15 ? s : null
  }

  const result = {
    what:   cleanLlm(parsed.what,   150),
    why:    cleanLlm(parsed.why,    120),
    sowhat: cleanLlm(parsed.sowhat, 120),
  }

  // [검증 1] what 근거 없음 → 전체 null 강제
  if (!constraints.whatAvailable) {
    return { what: null, why: null, sowhat: null }
  }

  // [검증 1b] LLM 실패로 what이 null이지만 근거는 있을 때 → fallback 적용 (정제 후)
  if (!result.what && constraints.whatFallback) {
    result.what = sanitizeFallbackText(constraints.whatFallback)
  }

  // [검증 2] 수치 보존 — 소스 수치가 출력에 없으면 fallback으로 교체 (정제 후)
  if (result.what && !allMetricsPreserved(result.what, constraints.whatMetrics ?? [])) {
    result.what = sanitizeFallbackText(constraints.whatFallback) ?? null
  }

  // [검증 3] 핵심 엔티티 보존 (Method A only) — 행위자명이 출력에 없으면 fallback (정제 후)
  if (result.what && constraints.whatEntity) {
    const entityWords = constraints.whatEntity
      .split(/[\s·()]+/)
      .filter(w => w.length >= 2)
    const entityFound = entityWords.some(w => result.what.includes(w))
    if (!entityFound) {
      result.what = sanitizeFallbackText(constraints.whatFallback) ?? null
    }
  }

  // [검증 4] why/sowhat 근거 없음 → null 강제 (LLM 생성 내용 무효화)
  if (!constraints.whySource)    result.why    = null
  if (!constraints.sowhatSource) result.sowhat = null

  // [검증 5] why 수치 보존 — source 수치가 LLM 출력에 없으면 source 문장 원문 사용
  if (result.why && (constraints.whyMetrics ?? []).length > 0) {
    if (!allMetricsPreserved(result.why, constraints.whyMetrics)) {
      result.why = sanitizeFallbackText(constraints.whyFallback ?? null) ?? null
    }
  }

  // [검증 6] sowhat 수치 보존
  if (result.sowhat && (constraints.sowhatMetrics ?? []).length > 0) {
    if (!allMetricsPreserved(result.sowhat, constraints.sowhatMetrics)) {
      result.sowhat = sanitizeFallbackText(constraints.sowhatFallback ?? null) ?? null
    }
  }

  return result
}

// ── LLM 호출 + 파싱 + 검증 ───────────────────────────────────────────────────

async function callAndParse(prompt, constraints) {
  let parsed = { what: null, why: null, sowhat: null }

  try {
    const raw = await callLLM(prompt)
    // LLM이 preamble/postamble을 추가하는 경우 JSON 객체 부분만 추출
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    const jsonStr = (start !== -1 && end > start) ? raw.slice(start, end + 1) : raw
    const json = JSON.parse(jsonStr)
    parsed = {
      what:   typeof json.what   === 'string' ? json.what.trim()   : null,
      why:    typeof json.why    === 'string' ? json.why.trim()    : null,
      sowhat: typeof json.sowhat === 'string' ? json.sowhat.trim() : null,
    }
  } catch {
    // LLM/파싱 실패 → validateAndRepair [검증 1b]에서 whatFallback 적용
  }

  return validateAndRepair(parsed, constraints)
}

// ── Method A: 구조화 필드 → 3줄 요약 ─────────────────────────────────────────

async function generateSummaryFromFields(fields) {
  const metricsStr = Object.entries(fields.metrics)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' / ') || null

  const whoStr = [
    fields.who.main_actor,
    fields.who.partner   ? `+ ${fields.who.partner}`   : null,
    fields.who.authority ? `(${fields.who.authority})` : null,
  ].filter(Boolean).join(' ') || null

  // 수치 보존 검증은 가장 중요한 primary 메트릭 1개만 체크
  // (ALL 체크 시 60자 제한 내에 모든 수치를 담을 수 없어 불필요한 fallback 발생)
  const primaryMetric = fields.metrics.capacity
    ?? fields.metrics.amount
    ?? fields.metrics.ratio
    ?? fields.metrics.timeline
    ?? fields.metrics.other

  const constraints = {
    // causal_core·tech_keywords·rawSummaryFallback 포함: 필드 추출 실패 시에도 what 생성 가능
    whatAvailable:  !!(fields.who.main_actor || metricsStr || fields.causal_core || fields.tech_keywords.length > 0 || fields.rawSummaryFallback),
    whatMetrics:    primaryMetric ? extractMetricValues(primaryMetric) : [],
    whatEntity:     fields.who.main_actor ?? null,
    // 조합 fallback 우선, 실패 시 rawSummary 사용
    whatFallback:   buildMethodAWhatFallback(fields) ?? (fields.rawSummaryFallback ? sanitizeFallbackText(fields.rawSummaryFallback) : null),
    whySource:      !!fields.causal_core,
    whyMetrics:     extractMetricValues(fields.causal_core ?? ''),
    whyFallback:    fields.causal_core ?? null,
    sowhatSource:   !!fields.business_impact,
    sowhatMetrics:  extractMetricValues(fields.business_impact ?? ''),
    sowhatFallback: fields.business_impact ?? null,
  }

  const prompt = `아래 정보는 기사에서 직접 추출된 내용입니다.
이 정보만을 근거로 에너지 뉴스레터용 3줄 요약을 작성하세요.

[엄격한 규칙]
- 추출된 정보에 없는 내용을 추가하거나 추정하지 마세요.
- "없음"으로 표시된 항목은 해당 줄을 null로 출력하세요.
- 수치는 반드시 추출된 값 그대로 사용하고 변형하지 마세요.
- 행위자명은 원문 그대로 사용하고 변형하지 마세요.
- 모든 문장은 반드시 "~했다", "~냈다", "~됐다", "~밝혔다" 등 신문 기사체 종결어미로 끝내세요.
- "~함", "~했습니다", "~입니다", "~됩니다", "~합니다" 등의 어미는 절대 사용하지 마세요.

기사 유형: ${fields.article_type}
행위자: ${whoStr ?? '없음'}
핵심 수치: ${metricsStr ?? '없음'}
지역·대상: ${fields.location_target ?? '없음'}
기술 키워드: ${fields.tech_keywords.join(', ') || '없음'}
핵심 인과: ${fields.causal_core ?? '없음'}
사업 임팩트: ${fields.business_impact ?? '없음'}

JSON만 응답 (마크다운 없이):
{
  "what": "행위자 + 기사 유형 + 핵심 수치 포함, ~했다/~됐다 체로 (1문장, 60자 이내)",
  "why": "핵심 인과 근거로만, ~했다/~됐다 체로 (1문장, 50자 이내) — 핵심 인과가 없음이면 반드시 null",
  "sowhat": "사업 임팩트 근거로만, ~했다/~됐다 체로 (1문장, 50자 이내) — 사업 임팩트가 없음이면 반드시 null"
}`

  return await callAndParse(prompt, constraints)
}

// ── Method B: 선발 문장 → 3줄 요약 ──────────────────────────────────────────

/**
 * @param {{ what: string, why: string|null, sowhat: string|null }} sentences
 * @param {'ko'|'en'} lang   원문 언어 — 'en'이면 한국어 번역 지시 추가
 */
async function generateSummaryFromSentences(sentences, lang = 'ko') {
  const constraints = {
    whatAvailable: !!sentences.what,
    whatMetrics:   extractMetricValues(sentences.what ?? ''),
    whatEntity:    null,  // Method B는 엔티티 특정 없음
    // 영어 기사는 LLM 실패 시 영어 원문 노출 방지를 위해 null 처리
    // (한국어 뉴스레터에 영어 문장 노출보다 빈 값이 적절)
    whatFallback:   lang === 'en' ? null : (sentences.what ?? null),
    whySource:      !!sentences.why,
    whyMetrics:     extractMetricValues(sentences.why ?? ''),
    whyFallback:    lang === 'en' ? null : (sentences.why ?? null),
    sowhatSource:   !!sentences.sowhat,
    sowhatMetrics:  extractMetricValues(sentences.sowhat ?? ''),
    sowhatFallback: lang === 'en' ? null : (sentences.sowhat ?? null),
  }

  const translateNote = lang === 'en'
    ? '\n- 원문이 영어이므로 반드시 한국어로 번역하여 정제하세요.'
    : ''

  const prompt = `아래 문장들은 기사에서 직접 추출된 원문 근거입니다.
이 문장들만을 근거로 에너지 뉴스레터용 3줄 요약을 한국어로 작성하세요.

[엄격한 규칙]
- 제공된 문장에 없는 내용을 추가하거나 추정하지 마세요.
- "없음"으로 표시된 항목은 해당 줄을 null로 출력하세요.
- 수치는 반드시 원문 값 그대로 사용하고 변형하지 마세요.
- 문장을 자연스럽게 다듬는 것은 허용되지만 의미와 수치를 변경할 수 없습니다.
- 모든 문장은 반드시 "~했다", "~냈다", "~됐다", "~밝혔다" 등 신문 기사체 종결어미로 끝내세요.
- "~함", "~했습니다", "~입니다", "~됩니다", "~합니다" 등의 어미는 절대 사용하지 마세요.${translateNote}

[직접 추출된 문장]
What 근거: ${sentences.what ?? '없음'}
Why 근거: ${sentences.why ?? '없음'}
So what 근거: ${sentences.sowhat ?? '없음'}

JSON만 응답 (마크다운 없이):
{
  "what": "What 근거를 한국어 신문 기사체(~했다/~됐다)로 정제 (1문장, 60자 이내)",
  "why": "Why 근거를 한국어 신문 기사체(~했다/~됐다)로 정제 (1문장, 50자 이내) — 근거가 없음이면 반드시 null",
  "sowhat": "So what 근거를 한국어 신문 기사체(~했다/~됐다)로 정제 (1문장, 50자 이내) — 근거가 없음이면 반드시 null"
}`

  return await callAndParse(prompt, constraints)
}

// ── 통합 인터페이스 ───────────────────────────────────────────────────────────

/**
 * @param {'A'|'B'} method
 * @param {object} elements
 * @param {'ko'|'en'} lang   원문 언어 (Method B 번역 지시에 사용)
 */
async function generateNewsletterSummary(method, elements, lang = 'ko') {
  if (method === 'A') return generateSummaryFromFields(elements)
  return generateSummaryFromSentences(elements, lang)
}

module.exports = { generateNewsletterSummary, generateSummaryFromFields, generateSummaryFromSentences }
