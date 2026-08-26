import { getRedis } from './redis'

export type UserRole = 'editor' | 'subscriber'

export interface UserRecord {
  email: string
  passwordHash: string
  order: number | null
  role: UserRole
  createdAt: string
  notifiedAt: string | null
}

const userKey = (email: string) => `user:${email}`
const SEQ_KEY = 'user:seq:next'

export function formatPassword(seq: number): string {
  return String(seq).padStart(6, '0')
}

export async function getUser(email: string): Promise<UserRecord | null> {
  const redis = getRedis()
  if (!redis) return null
  return redis.get<UserRecord>(userKey(email))
}

export async function createUser(input: {
  email: string
  passwordHash: string
  order: number | null
  role: UserRole
}): Promise<UserRecord | null> {
  const redis = getRedis()
  if (!redis) return null
  const record: UserRecord = {
    email: input.email,
    passwordHash: input.passwordHash,
    order: input.order,
    role: input.role,
    createdAt: new Date().toISOString(),
    notifiedAt: null,
  }
  await redis.set(userKey(input.email), record)
  return record
}

export async function markNotified(email: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  const user = await getUser(email)
  if (!user) return
  await redis.set(userKey(email), { ...user, notifiedAt: new Date().toISOString() })
}

export async function nextSequence(): Promise<number> {
  const redis = getRedis()
  if (!redis) throw new Error('Redis not configured')
  const value = await redis.incr(SEQ_KEY)
  return value - 1
}
