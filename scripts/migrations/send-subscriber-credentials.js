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
 *
 * 정정 재발송 (예: 잘못된 링크로 이미 발송된 경우):
 *   --resend-all           notifiedAt 여부와 상관없이 role=subscriber 전원 대상, 정정 전용 문구/제목 사용
 *   --skip=a@x.com,b@y.com 이미 정상 링크로 안내받은 사람 등 재발송에서 제외할 이메일 목록
 *
 * From은 항상 GMAIL_USER(현재 hyeokyeong@gmail.com) — haileycho@sk.com은 Send-As 별칭이 아니라서
 * From으로 쓰면 Gmail이 조용히 되돌린다(실측 확인됨). 정정 메일(--resend-all)은 대신 replyTo를
 * haileycho@sk.com으로 지정해, 수신자가 답장하면 그쪽으로 가도록 처리한다.
 */
require('dotenv').config({ path: '.env.local' })

const nodemailer = require('nodemailer')
const { Redis } = require('@upstash/redis')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const testEmail = args.find((a) => a.startsWith('--test='))?.split('=')[1]
const resendAll = args.includes('--resend-all')
const skipEmails = new Set(
  (args.find((a) => a.startsWith('--skip='))?.split('=')[1] ?? '').split(',').filter(Boolean)
)

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN이 설정되지 않았습니다.')
    process.exit(1)
  }
  return new Redis({ url, token })
}

function loginUrlFrom(baseUrl) {
  return `${(baseUrl || 'http://localhost:3000').replace(/\/$/, '')}/login`
}

function buildMailHtml(email, password) {
  const loginUrl = loginUrlFrom(process.env.NEXTAUTH_URL)
  return `
    <p>안녕하세요, SKI mySUNI 경영관리역량 조혜경입니다.</p>
    <p>
      Energy Insight Newsletter 구독 신청해주셔서 감사합니다.<br/>
      아래 계정으로 대시보드에 로그인하실 수 있습니다.<br/>
      (로컬 PC에서 열리지 않는 분들은 보안예외신청 부탁드립니다)
    </p>
    <p>
      아이디: <strong>${email}</strong><br/>
      비밀번호: <strong>${password}</strong> <a href="${loginUrl}">${loginUrl}</a>에서 로그인해주세요.
    </p>
  `
}

// 잘못된(localhost) 링크가 담긴 최초 안내 메일을 받은 사람들에게 보내는 정정 재발송 전용 템플릿
const CORRECTION_SUBJECT = '[Electrification/Energy Insight]'
function buildCorrectionMailHtml(email, password) {
  const loginUrl = loginUrlFrom(process.env.NEXTAUTH_URL)
  return `
    <p>안녕하세요, SK이노베이션 mySUNI 경영관리역량 조혜경입니다.</p>
    <p>
      Electrification/Energy Insight Newsletter 구독 신청해주셔서 감사합니다.<br/>
      이전 안내 메일 링크로 접속이 안되시는 분들께선 하기 링크로 이용 부탁드리겠습니다.
    </p>
    <p>
      아이디: <strong>${email}</strong><br/>
      비밀번호: <strong>${password}</strong>
    </p>
    <p>대시보드 링크: <a href="${loginUrl}">${loginUrl}</a> 에서 로그인해주세요.</p>
    <p>문의 사항이 있으신 분께선 haileycho@sk.com으로 연락 부탁드립니다.</p>
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
  // haileycho@sk.com은 hyeokyeong@gmail.com의 인증된 Send-As 별칭이 아니라서
  // From 헤더로 쓰면 Gmail이 조용히 인증 계정으로 되돌린다 (실측 확인됨).
  // 차선책: From은 그대로 gmailUser로 두고, 정정 메일에 한해 답장은 haileycho@sk.com으로 가도록 replyTo만 지정.
  const fromHeader = resendAll
    ? `[SK이노베이션 mySUNI] Electrification/Energy Insight Newsletter <${gmailUser}>`
    : `에너지 인사이트 뉴스레터 <${gmailUser}>`
  const replyTo = resendAll ? 'haileycho@sk.com' : undefined

  if (testEmail) {
    console.log(`\n테스트 발송 → ${testEmail} (notifiedAt은 갱신하지 않습니다${replyTo ? `, replyTo=${replyTo}` : ''})\n`)
    await transporter.sendMail({
      from: fromHeader,
      to: testEmail,
      replyTo,
      subject: resendAll ? `[테스트] ${CORRECTION_SUBJECT}` : '[테스트] [Energy Insight]',
      html: resendAll ? buildCorrectionMailHtml(testEmail, '000000 (예시 비밀번호)') : buildMailHtml(testEmail, '000000 (예시 비밀번호)'),
    })
    console.log('테스트 메일 발송 완료.\n')
    return
  }

  const redis = getRedis()
  const keys = await redis.keys('user:*')

  const targets = []
  for (const key of keys) {
    const user = await redis.get(key)
    if (!user || user.role !== 'subscriber') continue
    if (skipEmails.has(user.email)) continue
    if (resendAll || !user.notifiedAt) targets.push(user)
  }
  targets.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const modeLabel = resendAll ? 'role=subscriber 전체 (정정 재발송)' : 'role=subscriber, notifiedAt=null'
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`발송 대상: ${targets.length}명 (${modeLabel})` + (dryRun ? ' [dry-run]' : ''))
  console.log(`${'─'.repeat(60)}\n`)

  if (dryRun) {
    targets.forEach((t) => console.log(`  [DRY] #${t.order}  ${t.email}`))
    console.log('\nℹ dry-run: 실제 발송 없음.\n')
    return
  }

  const resolvedLoginUrl = loginUrlFrom(process.env.NEXTAUTH_URL)
  if (resolvedLoginUrl.includes('localhost')) {
    console.error(`✗ NEXTAUTH_URL이 localhost로 설정되어 있어 중단합니다: ${resolvedLoginUrl}`)
    console.error('  운영 도메인을 지정해서 다시 실행하세요. 예)')
    console.error('  PowerShell: $env:NEXTAUTH_URL="https://실제도메인"; node scripts/migrations/send-subscriber-credentials.js ...\n')
    process.exit(1)
  }
  console.log(`ℹ 메일에 삽입될 로그인 링크: ${resolvedLoginUrl}\n`)

  console.log('⚠ 3초 후 실제 발송을 시작합니다. 중단하려면 Ctrl+C.\n')
  await new Promise((r) => setTimeout(r, 3000))

  let sent = 0
  let failed = 0
  for (const t of targets) {
    const password = String(t.order).padStart(6, '0')
    try {
      await transporter.sendMail({
        from: fromHeader,
        to: t.email,
        replyTo,
        subject: resendAll ? CORRECTION_SUBJECT : '[Energy Insight]',
        html: resendAll ? buildCorrectionMailHtml(t.email, password) : buildMailHtml(t.email, password),
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
