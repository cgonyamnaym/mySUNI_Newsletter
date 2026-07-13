/**
 * 공유 Gemini API 클라이언트
 * - 모델 체인: gemini-2.5-flash → gemini-3.1-flash-lite-preview → gemma-3-4b-it
 * - 429/503 자동 재시도 + 다음 모델 fallback
 * - 분당 요청 간격 보장 (MIN_INTERVAL_MS)
 */
const { GoogleGenerativeAI } = require('@google/generative-ai')

const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview',
  'gemma-3-4b-it',
]

const MIN_INTERVAL_MS = parseInt(process.env.GEMINI_INTERVAL_MS ?? '10000')
let _genAI = null
let _lastRequestAt = 0

function getGenAI() {
  if (!_genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _genAI
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * 프롬프트를 LLM에 전달하고 텍스트 응답 반환
 * 모든 모델 실패 시 Error throw
 * @param {string} prompt
 * @param {{ deadlineMs?: number }} [opts]  절대 시각(ms) 기준 시간 예산.
 *   지정 시 예산 초과가 예상되는 대기(429/503 재시도)를 건너뛰어 빠르게 실패한다.
 *   (Vercel 서버리스 maxDuration 초과로 응답 자체가 유실되는 것을 방지)
 * @returns {Promise<string>} 응답 텍스트 (마크다운 코드블록 제거됨)
 */
async function callLLM(prompt, opts = {}) {
  const { deadlineMs } = opts
  const timeLeft = () => (deadlineMs ? deadlineMs - Date.now() : Infinity)

  for (const modelName of MODEL_CHAIN) {
    if (timeLeft() <= 0) break
    try {
      const now = Date.now()
      const elapsed = now - _lastRequestAt
      const wait = Math.min(
        elapsed < MIN_INTERVAL_MS ? MIN_INTERVAL_MS - elapsed : 0,
        Math.max(0, timeLeft())
      )
      if (wait > 0) await sleep(wait)

      const model = getGenAI().getGenerativeModel({ model: modelName })
      _lastRequestAt = Date.now()
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    } catch (err) {
      const is429 = err.message?.includes('429')
      const is503 = err.message?.includes('503')

      if (is503 && timeLeft() > 8000) {
        process.stdout.write(`  ↻ [${modelName}] 503 — 8s 후 재시도...\n`)
        await sleep(8000)
        _lastRequestAt = Date.now()
        try {
          const model = getGenAI().getGenerativeModel({ model: modelName })
          const result = await model.generateContent(prompt)
          const text = result.response.text().trim()
          return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
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

      process.stdout.write(`  → [${modelName}] 오류: ${err.message?.slice(0, 50)}, 다음 모델 시도...\n`)
    }
  }
  throw new Error(
    '모든 Gemini 모델 호출 실패' + (deadlineMs && timeLeft() <= 0 ? ' (시간 예산 초과)' : '')
  )
}

module.exports = { callLLM }
