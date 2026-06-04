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
 * @returns {Promise<string>} 응답 텍스트 (마크다운 코드블록 제거됨)
 */
async function callLLM(prompt) {
  for (const modelName of MODEL_CHAIN) {
    try {
      const now = Date.now()
      const elapsed = now - _lastRequestAt
      if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed)

      const model = getGenAI().getGenerativeModel({ model: modelName })
      _lastRequestAt = Date.now()
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    } catch (err) {
      const is429 = err.message?.includes('429')
      const is503 = err.message?.includes('503')

      if (is503) {
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
        process.stdout.write(`  → [${modelName}] rate limit, 다음 모델 시도...\n`)
        continue
      }

      process.stdout.write(`  → [${modelName}] 오류: ${err.message?.slice(0, 50)}, 다음 모델 시도...\n`)
    }
  }
  throw new Error('모든 Gemini 모델 호출 실패')
}

module.exports = { callLLM }
