/**
 * 구독자 대시보드 로그인 정보 안내 메일 발송
 *
 * 계정 생성(provision-subscriber-accounts.js)과 완전히 분리되어 있다.
 * role=subscriber && notifiedAt=null 인 계정만 대상으로 하며, 발송 후 notifiedAt을 기록해
 * 재실행해도 이미 안내한 사람에게 중복 발송하지 않는다.
 *
 * ⚠️ 플래그 없이 실행하면 대상 전원에게 실제 메일이 나간다.
 *    반드시 --test=<이메일>로 먼저 확인하고, 사용자가 발송을 명시적으로 지시했을 때만 실행할 것.
 *
 * 사용법:
 *   node scripts/migrations/send-subscriber-credentials.js --dry-run           # 대상 목록만 확인
 *   node scripts/migrations/send-subscriber-credentials.js --test=me@sk.com   # 테스트 발송 1건 (notifiedAt 갱신 안 함)
 *   node scripts/migrations/send-subscriber-credentials.js                    # 실제 전체 발송
 */
require('dotenv').config({ path: '.env.local' })

const nodemailer = require('nodemailer')
const { Redis } = require('@upstash/redis')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const testEmail = args.find((a) => a.startsWith('--test='))?.split('=')[1]

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN이 설정되지 않았습니다.')
    process.exit(1)
  }
  return new Redis({ url, token })
}

function buildMailHtml(email, password) {
  const loginUrl = `${(process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')}/login`
  return `
    <p>안녕하세요, 에너지 인사이트 뉴스레터 대시보드입니다.</p>
    <p>구독 신청해주셔서 감사합니다. 아래 계정으로 대시보드에 로그인하실 수 있습니다.</p>
    <ul>
      <li>아이디: <strong>${email}</strong></li>
      <li>비밀번호: <strong>${password}</strong></li>
    </ul>
    <p><a href="${loginUrl}">${loginUrl}</a> 에서 로그인해주세요.</p>
  `
}

async function main() {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  if (!gmailUser || !gmailPass) {
    console.error('GMAIL_USER / GMAIL_APP_PASSWORD가 설정되지 않았습니다.')
    process.exit(1)
  }
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })

  if (testEmail) {
    console.log(`\n테스트 발송 → ${testEmail} (notifiedAt은 갱신하지 않습니다)\n`)
    await transporter.sendMail({
      from: `에너지 인사이트 뉴스레터 <${gmailUser}>`,
      to: testEmail,
      subject: '[테스트] 에너지 인사이트 대시보드 로그인 정보 안내',
      html: buildMailHtml(testEmail, '000000 (예시 비밀번호)'),
    })
    console.log('테스트 메일 발송 완료.\n')
    return
  }

  const redis = getRedis()
  const keys = await redis.keys('user:*')

  const targets = []
  for (const key of keys) {
    const user = await redis.get(key)
    if (user && user.role === 'subscriber' && !user.notifiedAt) {
      targets.push(user)
    }
  }
  targets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`발송 대상: ${targets.length}명 (role=subscriber, notifiedAt=null)` + (dryRun ? ' [dry-run]' : ''))
  console.log(`${'─'.repeat(60)}\n`)

  if (dryRun) {
    targets.forEach((t) => console.log(`  [DRY] #${t.order}  ${t.email}`))
    console.log('\nℹ dry-run: 실제 발송 없음.\n')
    return
  }

  console.log('⚠ 3초 후 실제 발송을 시작합니다. 중단하려면 Ctrl+C.\n')
  await new Promise((r) => setTimeout(r, 3000))

  let sent = 0
  let failed = 0
  for (const t of targets) {
    const password = String(t.order).padStart(6, '0')
    try {
      await transporter.sendMail({
        from: `에너지 인사이트 뉴스레터 <${gmailUser}>`,
        to: t.email,
        subject: '에너지 인사이트 대시보드 로그인 정보 안내',
        html: buildMailHtml(t.email, password),
      })
      await redis.set(`user:${t.email}`, { ...t, notifiedAt: new Date().toISOString() })
      sent += 1
      console.log(`  [SENT] #${t.order}  ${t.email}`)
    } catch (err) {
      failed += 1
      console.error(`  [FAIL] ${t.email}:`, err.message)
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`발송 완료: ${sent}명 성공 / ${failed}명 실패`)
  console.log(`${'─'.repeat(60)}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
