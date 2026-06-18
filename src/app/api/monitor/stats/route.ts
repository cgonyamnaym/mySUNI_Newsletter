import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

export async function GET() {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ total: 0, today: 0, month: 0, daily: [], hourly: [] })
  }

  const today = new Date().toISOString().split('T')[0]
  const month = today.substring(0, 7)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  }).reverse()

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))

  const pipeline = redis.pipeline()
  pipeline.get('pv:total')
  pipeline.get(`pv:${today}`)
  pipeline.get(`pv:month:${month}`)
  days.forEach(day => pipeline.get(`pv:${day}`))
  hours.forEach(hour => pipeline.get(`pv:h:${today}:${hour}`))

  const results = (await pipeline.exec()) as (number | null)[]

  const [total, todayPv, monthPv, ...rest] = results
  const dailyValues = rest.slice(0, 7)
  const hourlyValues = rest.slice(7)

  return NextResponse.json({
    total: total ?? 0,
    today: todayPv ?? 0,
    month: monthPv ?? 0,
    daily: days.map((date, i) => ({ date: date.slice(5), views: Number(dailyValues[i] ?? 0) })),
    hourly: hours.map((hour, i) => ({
      hour: `${hour}시`,
      views: Number(hourlyValues[i] ?? 0),
    })),
  })
}
