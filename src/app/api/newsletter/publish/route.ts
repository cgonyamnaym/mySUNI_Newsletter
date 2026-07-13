import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getRedis } from '@/lib/redis'
import type { Article } from '@/lib/types'

export const dynamic = 'force-dynamic'

export interface PublishedNewsletter {
  id: string
  confirmedAt: string
  title: string
  articleCount: number
  articles: Article[]
}

export interface NewsletterMeta {
  id: string
  confirmedAt: string
  articleCount: number
  title: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { articles: Article[]; title?: string }
  const { articles } = body
  if (!articles?.length) return NextResponse.json({ error: 'No articles' }, { status: 400 })

  const id = crypto.randomUUID()
  const confirmedAt = new Date().toISOString()
  const dateStr = confirmedAt.slice(0, 10)

  const entry: PublishedNewsletter = {
    id,
    confirmedAt,
    title: body.title ?? `에너지 인사이트 뉴스레터 ${dateStr}`,
    articleCount: articles.length,
    articles,
  }

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
  }

  await redis.set(`newsletter:${id}`, entry)

  const existingIndex = await redis.get<NewsletterMeta[]>('newsletter:index')
  const index: NewsletterMeta[] = Array.isArray(existingIndex) ? existingIndex : []
  index.unshift({ id, confirmedAt, articleCount: articles.length, title: entry.title })
  await redis.set('newsletter:index', index.slice(0, 200))

  return NextResponse.json({
    id,
    url: `/n/${id}`,
    confirmedAt,
    articleCount: articles.length,
    title: entry.title,
  })
}