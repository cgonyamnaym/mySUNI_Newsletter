import { Redis } from '@upstash/redis'
import type { NewsletterSummary } from './types'

let _redis: Redis | null = null

export function getRedis(): Redis | null {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  _redis = new Redis({ url, token })
  return _redis
}

export const SUMMARY_TTL_SEC = 60 * 60 * 24 * 30  // 30일

export const summaryKey = (id: string) => `summary:${id}`

export async function getCachedSummary(id: string): Promise<NewsletterSummary | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    return await redis.get<NewsletterSummary>(summaryKey(id))
  } catch {
    return null
  }
}

export async function setCachedSummary(id: string, summary: NewsletterSummary): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(summaryKey(id), summary, { ex: SUMMARY_TTL_SEC })
  } catch { /* ignore */ }
}

export async function getManycached(ids: string[]): Promise<Record<string, NewsletterSummary>> {
  const redis = getRedis()
  if (!redis || !ids.length) return {}
  try {
    const values = await redis.mget<NewsletterSummary[]>(...ids.map(summaryKey))
    const result: Record<string, NewsletterSummary> = {}
    ids.forEach((id, i) => {
      if (values[i]) result[id] = values[i]!
    })
    return result
  } catch {
    return {}
  }
}
