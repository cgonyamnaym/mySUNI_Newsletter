import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import { getRedis } from '@/lib/redis'
import { getUser, createUser, nextSequence, formatPassword, markNotified } from '@/lib/users'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/
const NOTIFY_TO = 'haileycho@sk.com'
const SUBSCRIBE_INDEX_KEY = 'subscribe:index'
const SUBSCRIBE_INDEX_MAX = 500
const PASSWORD_HASH_COST = 12

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

async function provisionSubscriberAccount(email: string): Promise<{ password: string } | null> {
  const existing = await getUser(email)
  if (existing) return null
  try {
    const order = await nextSequence()
    const password = formatPassword(order)
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_COST)
    await createUser({ email, passwordHash, order, role: 'subscriber' })
    return { password }
  } catch (err) {
    console.error('Failed to provision subscriber account:', err)
    return null
  }
}

function buildCredentialMailHtml(email: string, password: string) {
  const baseUrl = process.env.NEXTAUTH_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const loginUrl = `${baseUrl.replace(/\/$/, '')}/login`
  return `
    <p>안녕하세요, SKI mySUNI 경영관리역량 조혜경입니다.</p>
    <p>
      Electrification/Energy Insight Newsletter 구독 신청해주셔서 감사합니다.<br/>
      아래 계정으로 대시보드에 로그인하실 수 있습니다.<br/>
      (로컬 PC에서 열리지 않는 분들은 보안예외신청 부탁드립니다)
    </p>
    <p>
      아이디: <strong>${email}</strong><br/>
      비밀번호: <strong>${password}</strong> <a href="${loginUrl}">${loginUrl}</a>에서 로그인해주세요.
    </p>
    <p>문의 사항이 있으신 분께선 haileycho@sk.com으로 연락 부탁드리겠습니다.</p>
  `
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
  const provisioned = await provisionSubscriberAccount(email)

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

  if (provisioned) {
    try {
      await transporter.sendMail({
        from: `[SK이노베이션 mySUNI] Electrification/Energy Insight Newsletter <${gmailUser}>`,
        to: email,
        replyTo: NOTIFY_TO,
        subject: '[Electrification/Energy Insight]',
        html: buildCredentialMailHtml(email, provisioned.password),
      })
      await markNotified(email)
    } catch (err) {
      console.error('Failed to send subscriber credential email:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
