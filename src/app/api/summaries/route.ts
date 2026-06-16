import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { getManycached } from '@/lib/redis'
import type { NewsletterSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const idsParam = searchParams.get('ids')
  if (!idsParam) return NextResponse.json({}, { status: 400 })

  const ids = idsParam.split(',').filter(Boolean)

  // 1. Redis에서 일괄 조회
  const result: Record<string, NewsletterSummary> = await getManycached(ids)

  // 2. 캐시 미스 항목 → 로컬 newsletter-draft.json fallback
  const missing = ids.filter(id => !result[id])
  if (missing.length > 0) {
    try {
      const filePath = path.join(process.cwd(), 'public/data/newsletter-draft.json')
      const draft: { articles: { id: string; newsletterSummary?: NewsletterSummary }[] } =
        JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      for (const a of draft.articles ?? []) {
        if (missing.includes(a.id) && a.newsletterSummary?.what) {
          result[a.id] = a.newsletterSummary
        }
      }
    } catch { /* 파일 없거나 읽기 실패 무시 */ }
  }

  return NextResponse.json(result)
}
