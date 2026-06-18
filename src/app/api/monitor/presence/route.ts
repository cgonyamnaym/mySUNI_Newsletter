import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

const PRESENCE_KEY = 'monitor:presence'
const STALE_MS = 35_000 // 35s — slightly longer than 20s heartbeat interval

export async function POST(req: NextRequest) {
  const redis = getRedis()
  if (!redis) return NextResponse.json({ count: 0 })

  const body = await req.json().catch(() => ({}))
  const { clientId, type = 'heartbeat' } = body as { clientId?: string; type?: string }
  if (!clientId) return NextResponse.json({ error: 'missing clientId' }, { status: 400 })

  const now = Date.now()

  // Remove stale users then add/refresh this user
  await redis.zremrangebyscore(PRESENCE_KEY, 0, now - STALE_MS)
  await redis.zadd(PRESENCE_KEY, { score: now, member: clientId })

  if (type === 'visit') {
    const today = new Date().toISOString().split('T')[0]           // YYYY-MM-DD
    const hour = new Date().getHours().toString().padStart(2, '0') // HH
    const month = today.substring(0, 7)                             // YYYY-MM

    const pipeline = redis.pipeline()
    pipeline.incr('pv:total')
    pipeline.incr(`pv:${today}`)
    pipeline.incr(`pv:h:${today}:${hour}`)
    pipeline.incr(`pv:month:${month}`)
    await pipeline.exec()

    // Set expiry (best-effort, ignore errors)
    redis.expire(`pv:${today}`, 90 * 24 * 3600).catch(() => {})
    redis.expire(`pv:h:${today}:${hour}`, 7 * 24 * 3600).catch(() => {})
    redis.expire(`pv:month:${month}`, 400 * 24 * 3600).catch(() => {})
  }

  const count = await redis.zcard(PRESENCE_KEY)
  return NextResponse.json({ count })
}

export async function GET() {
  const redis = getRedis()
  if (!redis) return NextResponse.json({ count: 0 })

  const now = Date.now()
  await redis.zremrangebyscore(PRESENCE_KEY, 0, now - STALE_MS)
  const count = await redis.zcard(PRESENCE_KEY)
  return NextResponse.json({ count })
}
