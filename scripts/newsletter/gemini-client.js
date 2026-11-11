/**
 * 공유 Gemini API 클라이언트
 * - 모델 체인: gemini-flash-lite-latest → gemini-3.1-flash-lite → gemini-flash-latest
 * - 호출당 HTTP 타임아웃 + 429/503 자동 재시도 + 다음 모델 fallback
 * - 분당 요청 간격 보장 (MIN_INTERVAL_MS)
 */
const { GoogleGenerativeAI } = require('@google/generative-ai')

// gemini-2.5-flash·gemma-3-4b-it는 새로 발급한 GCP 프로젝트(GEMINI_SUMMARY_API_KEY)에서
// "no longer available to new users" / 404로 영구 실패함이 확인되어 제외.
// "-latest" 별칭 모델을 우선해 향후 세대교체로 인한 재단종 위험을 줄인다.
//
// gemini-flash-latest는 2026-11 기준 별칭 대상이 응답을 돌려주지 않아(동일 프롬프트로
// 45초 무응답 3/3 재현, 150초까지 기다려도 무응답, 간헐 503/ECONNRESET) 1순위에서
// 최후순위로 내렸다. 같은 조건에서 flash-lite 계열은 1~3초에 응답한다.
// 아래 CALL_TIMEOUT_MS가 있으므로 별칭이 복구되면 다시 쓰이고, 죽어 있으면
// 타임아웃만 소모하고 넘어간다.
const MODEL_CHAIN = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
]

// daily-crawl.yml에서 동일 API 키로 4000ms가 이미 안전하게 검증됨 (GEMINI_INTERVAL_MS)
// → /api/summarize도 동일 기본값 사용 (기존 10000ms는 과도하게 보수적이어서
//    기사 1건당 요약 생성이 불필요하게 느려지는 원인이었다)
const MIN_INTERVAL_MS = parseInt(process.env.GEMINI_INTERVAL_MS ?? '4000')

// 호출 1건의 HTTP 타임아웃. @google/generative-ai는 기본 타임아웃이 없어, 무응답
// 모델을 만나면 fetch가 무한정 매달려 다음 모델 fallback 자체가 동작하지 않는다.
// 그 결과 /api/summarize가 Vercel maxDuration(60s)에 걸려 강제 종료되고
// 요약이 전건 실패했다(로컬은 시간 상한이 없어 수 분 뒤 성공 → 재현 안 됨).
// flash-lite 계열 정상 응답이 1~3초이므로 15초면 충분한 상한이다.
const CALL_TIMEOUT_MS = parseInt(process.env.GEMINI_CALL_TIMEOUT_MS ?? '15000')

// 뉴스레터 요약 전용 키(GEMINI_SUMMARY_API_KEY, 별도 GCP 프로젝트 권장).
// 일일 크롤링(daily-crawl.yml)이 GEMINI_API_KEY 쿼터를 먼저 소비해 두면
// 편집자가 오후에 뉴스레터 요약을 생성할 때 429가 누적되어 갈수록 느려졌다.
// 미설정 시 기존 GEMINI_API_KEY로 하위 호환 동작.
const SUMMARY_API_KEY = process.env.GEMINI_SUMMARY_API_KEY || process.env.GEMINI_API_KEY
let _genAI = null
let _lastRequestAt = 0

function getGenAI() {
  if (!_genAI) {
    if (!SUMMARY_API_KEY) throw new Error('GEMINI_SUMMARY_API_KEY(또는 GEMINI_API_KEY) 환경변수가 설정되지 않았습니다.')
    _genAI = new GoogleGenerativeAI(SUMMARY_API_KEY)
  }
  return _genAI
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * 모델 1회 호출 (타임아웃 적용) → 정제된 텍스트 반환
 * @param {string} modelName
 * @param {string} prompt
 * @param {number} timeoutMs  이 시간 내 응답이 없으면 요청을 중단(abort)한다.
 */
async function generateOnce(modelName, prompt, timeoutMs) {
  const model = getGenAI().getGenerativeModel({ model: modelName }, { timeout: timeoutMs })
  _lastRequestAt = Date.now()
  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

/**
 * 프롬프트를 LLM에 전달하고 텍스트 응답 반환
 * 모든 모델 실패 시 Error throw
 * @param {string} prompt
 * @param {{ deadlineMs?: number }} [opts]  절대 시각(ms) 기준 시간 예산.
 *   지정 시 재시도 대기와 호출 타임아웃 양쪽에 반영되어, 남은 예산을 넘기지 않고
 *   빠르게 실패한다. (Vercel 서버리스 maxDuration 초과로 응답 자체가 유실되는 것을 방지)
 * @returns {Promise<string>} 응답 텍스트 (마크다운 코드블록 제거됨)
 */
async function callLLM(prompt, opts = {}) {
  const { deadlineMs } = opts
  const timeLeft = () => (deadlineMs ? deadlineMs - Date.now() : Infinity)
  // 호출 타임아웃은 남은 시간 예산을 넘지 않게 자른다(응답 직렬화용 500ms 버퍼).
  const callTimeout = () => Math.min(CALL_TIMEOUT_MS, Math.max(0, timeLeft() - 500))

  for (const modelName of MODEL_CHAIN) {
    // 예산이 1초도 남지 않았으면 새 호출을 시작하지 않는다.
    if (timeLeft() <= 1000) break
    try {
      const now = Date.now()
      const elapsed = now - _lastRequestAt
      const wait = Math.min(
        elapsed < MIN_INTERVAL_MS ? MIN_INTERVAL_MS - elapsed : 0,
        Math.max(0, timeLeft())
      )
      if (wait > 0) await sleep(wait)

      return await generateOnce(modelName, prompt, callTimeout())
    } catch (err) {
      const is429 = err.message?.includes('429')
      const is503 = err.message?.includes('503')

      if (is503 && timeLeft() > 8000) {
        process.stdout.write(`  ↻ [${modelName}] 503 — 8s 후 재시도...\n`)
        await sleep(8000)
        try {
          return await generateOnce(modelName, prompt, callTimeout())
        } catch (retryErr) {
          process.stdout.write(`  → [${modelName}] 재시도 실패, 다음 모델 시도...\n`)
          continue
        }
      }

      if (is429) {
        const wait = Math.min(15000, Math.max(0, timeLeft() - 500))
        if (wait > 0) {
          process.stdout.write(`  → [${modelName}] rate limit, ${Math.round(wait / 1000)}s 대기 후 다음 모델 시도...\n`)
          await sleep(wait)
        } else {
          process.stdout.write(`  → [${modelName}] rate limit, 시간 예산 부족으로 즉시 다음 모델 시도...\n`)
        }
        continue
      }

      // 타임아웃(abort)은 "모델이 응답을 돌려주지 않음"이라 원인 추적 시 구분이 중요하다.
      const isAbort = err.name === 'GoogleGenerativeAIAbortError' || /abort/i.test(err.message ?? '')
      if (isAbort) {
        process.stdout.write(`  → [${modelName}] 응답 없음(${CALL_TIMEOUT_MS}ms 타임아웃), 다음 모델 시도...\n`)
      } else {
        process.stdout.write(`  → [${modelName}] 오류: ${err.message?.slice(0, 50)}, 다음 모델 시도...\n`)
      }
    }
  }
  throw new Error(
    '모든 Gemini 모델 호출 실패' + (deadlineMs && timeLeft() <= 1000 ? ' (시간 예산 초과)' : '')
  )
}

module.exports = { callLLM }
