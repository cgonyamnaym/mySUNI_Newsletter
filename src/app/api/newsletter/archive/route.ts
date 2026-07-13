import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getRedis } from '@/lib/redis'
import type { NewsletterMeta, PublishedNewsletter } from '@/app/api/newsletter/publish/route'

export const dynamic = 'force-dynamic'

// 수요 키워드 추출용으로 불러올 최근 아카이브 개수
const DEMAND_SAMPLE_SIZE = 20

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })

  const existingIndex = await redis.get<NewsletterMeta[]>('newsletter:index')
  const index: NewsletterMeta[] = Array.isArray(existingIndex) ? existingIndex : []

  const { searchParams } = new URL(req.url)
  if (searchParams.get('articles') === '1') {
    const ids = index.slice(0, DEMAND_SAMPLE_SIZE).map((m) => m.id)
    if (!ids.length) return NextResponse.json({ articles: [] })
    const entries = await redis.mget<PublishedNewsletter[]>(...ids.map((id) => `newsletter:${id}`))
    const articles = entries.filter(Boolean).flatMap((e) => e!.articles)
    return NextResponse.json({ articles })
  }

  return NextResponse.json({ entries: index })
}