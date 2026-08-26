import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getRedis } from '@/lib/redis'
import type { NewsletterMeta, PublishedNewsletter } from '@/app/api/newsletter/publish/route'

export const dynamic = 'force-dynamic'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })

  const entry = await redis.get<PublishedNewsletter>(`newsletter:${params.id}`)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (entry.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json(entry)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })

  const entry = await redis.get<PublishedNewsletter>(`newsletter:${params.id}`)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (entry.ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await redis.del(`newsletter:${params.id}`)

  for (const key of [`newsletter:index:${session.user.email}`, 'newsletter:index:global']) {
    const existingIndex = await redis.get<NewsletterMeta[]>(key)
    const index: NewsletterMeta[] = Array.isArray(existingIndex) ? existingIndex : []
    await redis.set(key, index.filter((m) => m.id !== params.id))
  }

  return NextResponse.json({ ok: true })
}