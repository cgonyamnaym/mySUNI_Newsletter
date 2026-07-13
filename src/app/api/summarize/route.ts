import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getCachedSummary, setCachedSummary } from '@/lib/redis'
import type { Article, NewsletterSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'
// Vercel Pro 최대 실행 시간 (기사 1개 요약 ~ 20초 이내)
export const maxDuration = 60

// ── 파이프라인 모듈 동적 로드 (webpack 번들링 우회 — eval require 사용) ────────
// eval('require') 를 사용해 webpack의 정적 분석을 피하고 런타임 Node require 호출
/* eslint-disable @typescript-eslint/no-implied-eval */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nativeRequire = eval('require') as (id: string) => any
/* eslint-enable @typescript-eslint/no-implied-eval */

type LlmOpts = { deadlineMs?: number }

function loadPipeline() {
  const base = process.cwd()
  const { fetchBodyText, countSentences } = nativeRequire(
    path.join(base, 'scripts/crawlers/body-fetcher.js')
  ) as { fetchBodyText: (url: string) => Promise<string>; countSentences: (text: string) => number }
  const { classifyArticle } = nativeRequire(
    path.join(base, 'scripts/newsletter/article-classifier.js')
  ) as { classifyArticle: (title: string, body: string, sourceId: string, opts?: LlmOpts) => Promise<{ method: 'A' | 'B' }> }
  const { extractFieldsMethodA } = nativeRequire(
    path.join(base, 'scripts/newsletter/field-extractor.js')
  ) as { extractFieldsMethodA: (title: string, body: string, lang: string, opts?: LlmOpts) => Promise<unknown> }
  const { selectSentencesMethodB } = nativeRequire(
    path.join(base, 'scripts/newsletter/sentence-selector.js')
  ) as { selectSentencesMethodB: (title: string, body: string) => unknown }
  const { generateNewsletterSummary } = nativeRequire(
    path.join(base, 'scripts/newsletter/summary-generator.js')
  ) as { generateNewsletterSummary: (method: string, elements: unknown, lang: string, opts?: LlmOpts) => Promise<NewsletterSummary> }
  return { fetchBodyText, countSentences, classifyArticle, extractFieldsMethodA, selectSentencesMethodB, generateNewsletterSummary }
}

// ── 기사 탐색 ────────────────────────────────────────────────────────────────
function findArticle(id: string): Article | null {
  const dailyDir = path.join(process.cwd(), 'public/data/daily')
  try {
    const files = fs.readdirSync(dailyDir).filter(f => f.endsWith('.json')).sort().reverse()
    for (const file of files) {
      try {
        const data: { articles: Article[] } = JSON.parse(
          fs.readFileSync(path.join(dailyDir, file), 'utf-8')
        )
        const found = data.articles?.find(a => a.id === id)
        if (found) return found
      } catch { /* skip */ }
    }
  } catch { /* daily dir not found */ }
  return null
}

// ── 단일 기사 요약 파이프라인 ─────────────────────────────────────────────────
// deadlineMs: Vercel maxDuration(60s) 내에서 안전하게 응답하기 위한 절대 시각 예산.
// 예산 초과가 예상되면 gemini-client가 재시도 대기를 건너뛰고 빠르게 실패한다.
async function summarizeArticle(article: Article, deadlineMs: number): Promise<NewsletterSummary | null> {
  const { title, summary: rawSummary, originalUrl, sourceId, originalLang } = article
  const p = loadPipeline()
  const opts = { deadlineMs }

  let body = ''
  try { body = await p.fetchBodyText(originalUrl) } catch { /* ignore */ }
  if (!body || p.countSentences(body) < 3) {
    body = rawSummary || title
  }

  const { method } = await p.classifyArticle(title, body, sourceId ?? '', opts)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any = method === 'A'
    ? await p.extractFieldsMethodA(title, body, originalLang ?? 'ko', opts)
    : p.selectSentencesMethodB(title, body)

  // Method A LLM 파싱 실패(fallbackFields) 시 rawSummary를 최후 안전망으로 제공
  if (method === 'A') {
    elements.rawSummaryFallback = rawSummary || null
  }

  return await p.generateNewsletterSummary(method, elements, originalLang ?? 'ko', opts)
}

// ── 파일 캐시 병합 저장 (로컬 서버 전용, Vercel에서는 조용히 실패) ────────────
function trySaveToFile(id: string, summary: NewsletterSummary, article: Article) {
  try {
    const filePath = path.join(process.cwd(), 'public/data/newsletter-draft.json')
    let draft: { articles: (Article & { newsletterSummary?: NewsletterSummary })[] } = { articles: [] }
    try { draft = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { /* new file */ }
    const byId = new Map(draft.articles.map(a => [a.id, a]))
    byId.set(id, { ...article, newsletterSummary: summary })
    draft.articles = Array.from(byId.values())
    fs.writeFileSync(filePath, JSON.stringify(draft, null, 2), 'utf-8')
  } catch { /* read-only filesystem (Vercel) */ }
}

// ── POST /api/summarize ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids: string[] }
    if (!ids?.length) return NextResponse.json({ error: 'No IDs' }, { status: 400 })

    // maxDuration(60s) 내 응답을 보장하기 위한 요청 전체 시간 예산.
    // fs/redis/직렬화 오버헤드를 위해 10초 버퍼를 남겨둔다.
    const deadlineMs = Date.now() + 50_000

    const result: Record<string, NewsletterSummary> = {}
    const failed: string[] = []

    for (const id of ids) {
      // 1. Redis 캐시 확인
      const cached = await getCachedSummary(id)
      if (cached?.what) {
        result[id] = cached
        continue
      }

      // 2. 기사 탐색 + 파이프라인 실행
      const article = findArticle(id)
      if (!article) {
        console.error(`[summarize] ${id}: 기사를 찾을 수 없음`)
        failed.push(id)
        continue
      }

      try {
        const summary = await summarizeArticle(article, deadlineMs)
        if (summary?.what) {
          result[id] = summary
          await setCachedSummary(id, summary)    // Redis 저장
          trySaveToFile(id, summary, article)     // 로컬 파일 저장 (Vercel 무시)
        } else {
          console.error(`[summarize] ${id}: 요약 근거 부족으로 생성 실패`)
          failed.push(id)
        }
      } catch (err) {
        console.error(`[summarize] ${id}:`, err)
        failed.push(id)
      }
    }

    if (failed.length) {
      console.error(`[summarize] 실패 ${failed.length}/${ids.length}건:`, failed.join(', '))
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
