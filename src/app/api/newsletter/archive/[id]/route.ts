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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })

  const entry = await redis.get<PublishedNewsletter>(`newsletter:${params.id}`)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(entry)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = getRedis()
  if (!redis) return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })

  await redis.del(`newsletter:${params.id}`)

  const existingIndex = await redis.get<NewsletterMeta[]>('newsletter:index')
  const index: NewsletterMeta[] = Array.isArray(existingIndex) ? existingIndex : []
  await redis.set('newsletter:index', index.filter((m) => m.id !== params.id))

  return NextResponse.json({ ok: true })
}