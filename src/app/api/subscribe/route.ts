import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/
const NOTIFY_TO = 'haileycho@sk.com'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { email?: string } | null
  const email = body?.email?.trim()

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

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
