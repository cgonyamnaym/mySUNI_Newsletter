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
  ownerEmail: string
}

export interface NewsletterMeta {
  id: string
  confirmedAt: string
  articleCount: number
  title: string
}

const ARCHIVE_INDEX_MAX = 200

async function pushToIndex(redis: ReturnType<typeof getRedis>, key: string, meta: NewsletterMeta) {
  if (!redis) return
  const existing = await redis.get<NewsletterMeta[]>(key)
  const index: NewsletterMeta[] = Array.isArray(existing) ? existing : []
  index.unshift(meta)
  await redis.set(key, index.slice(0, ARCHIVE_INDEX_MAX))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { articles: Article[]; title?: string }
  const { articles } = body
  if (!articles?.length) return NextResponse.json({ error: 'No articles' }, { status: 400 })

  const id = crypto.randomUUID()
  const confirmedAt = new Date().toISOString()
  const dateStr = confirmedAt.slice(0, 10)
  const ownerEmail = session.user.email

  const entry: PublishedNewsletter = {
    id,
    confirmedAt,
    title: body.title ?? `에너지 인사이트 뉴스레터 ${dateStr}`,
    articleCount: articles.length,
    articles,
    ownerEmail,
  }

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
  }

  await redis.set(`newsletter:${id}`, entry)

  const meta: NewsletterMeta = { id, confirmedAt, articleCount: articles.length, title: entry.title }
  await pushToIndex(redis, `newsletter:index:${ownerEmail}`, meta)
  await pushToIndex(redis, 'newsletter:index:global', meta)

  return NextResponse.json({
    id,
    url: `/n/${id}`,
    confirmedAt,
    articleCount: articles.length,
    title: entry.title,
  })
}