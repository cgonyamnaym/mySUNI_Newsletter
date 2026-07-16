import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getRedis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/
const NOTIFY_TO = 'haileycho@sk.com'
const SUBSCRIBE_INDEX_KEY = 'subscribe:index'
const SUBSCRIBE_INDEX_MAX = 500

export interface SubscriptionRecord {
  email: string
  appliedAt: string
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function recordSubscription(email: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    const existing = await redis.get<SubscriptionRecord[]>(SUBSCRIBE_INDEX_KEY)
    const list = Array.isArray(existing) ? existing : []
    list.unshift({ email, appliedAt: new Date().toISOString() })
    await redis.set(SUBSCRIBE_INDEX_KEY, list.slice(0, SUBSCRIBE_INDEX_MAX))
  } catch (err) {
    console.error('Failed to record subscription in Redis:', err)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { email?: string } | null
  const email = body?.email?.trim()

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  await recordSubscription(email)

  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  })

  const safeEmail = escapeHtml(email)

  try {
    await transporter.sendMail({
      from: `에너지 인사이트 뉴스레터 <${gmailUser}>`,
      to: NOTIFY_TO,
      replyTo: email,
      subject: 'AI 뉴스레터 대시보드 구독 신청',
      html: `<p>새 구독 신청이 접수되었습니다.</p><p>신청자 이메일: <strong>${safeEmail}</strong></p>`,
    })
  } catch (err) {
    console.error('Nodemailer send error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
