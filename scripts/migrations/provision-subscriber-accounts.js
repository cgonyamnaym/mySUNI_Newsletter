/**
 * 구독 신청자 일괄 대시보드 계정 생성 (+ 기존 편집자 계정 Redis 이전)
 *
 * - 로그인 ID = 구독 신청 이메일
 * - 비밀번호 = 구독 신청 순서대로 000000부터 부여하는 6자리 순번
 * - 이미 계정이 있는 이메일은 건너뜀 (재실행 안전)
 * - 이 스크립트는 메일을 보내지 않는다 — 계정 생성과 안내 메일 발송은 완전히 분리되어 있으며,
 *   실제 발송은 scripts/migrations/send-subscriber-credentials.js에서 사용자 승인 후 별도로 수행한다.
 *
 * 사용법:
 *   node scripts/migrations/provision-subscriber-accounts.js --dry-run   # 미리보기 (저장 안 함)
 *   node scripts/migrations/provision-subscriber-accounts.js             # 실제 생성
 */
require('dotenv').config({ path: '.env.local' })

const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const { Redis } = require('@upstash/redis')

const dryRun = process.argv.includes('--dry-run')
const PASSWORD_HASH_COST = 12
const SUBSCRIBE_INDEX_KEY = 'subscribe:index'
const SEQ_KEY = 'user:seq:next'
const LEGACY_NEWSLETTER_INDEX_KEY = 'newsletter:index'
const GLOBAL_NEWSLETTER_INDEX_KEY = 'newsletter:index:global'
const LEGACY_OWNER_EMAIL = 'hyeokyeong@gmail.com'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN이 설정되지 않았습니다.')
    process.exit(1)
  }
  return new Redis({ url, token })
}

function formatPassword(seq) {
  return String(seq).padStart(6, '0')
}

async function migrateEditors(redis) {
  const usersJson = process.env.AUTH_USERS
  if (!usersJson) return []
  let editors
  try {
    editors = JSON.parse(usersJson)
  } catch {
    console.warn('AUTH_USERS JSON 파싱 실패 — 편집자 계정 이전을 건너뜁니다.')
    return []
  }

  const migrated = []
  for (const editor of editors) {
    const key = `user:${editor.email}`
    const existing = await redis.get(key)
    if (existing) continue
    migrated.push(editor.email)
    if (dryRun) continue
    await redis.set(key, {
      email: editor.email,
      passwordHash: editor.passwordHash,
      order: null,
      role: 'editor',
      createdAt: new Date().toISOString(),
      notifiedAt: null,
    })
  }
  return migrated
}

async function migrateLegacyNewsletterIndex(redis) {
  const legacy = await redis.get(LEGACY_NEWSLETTER_INDEX_KEY)
  if (!Array.isArray(legacy) || legacy.length === 0) return 0

  if (dryRun) {
    console.log(`  (dry-run) 기존 newsletter:index ${legacy.length}건을 ${LEGACY_OWNER_EMAIL} 개인 아카이브 + 전역 인덱스로 이전 예정`)
    return legacy.length
  }

  for (const meta of legacy) {
    const entryKey = `newsletter:${meta.id}`
    const entry = await redis.get(entryKey)
    if (entry && !entry.ownerEmail) {
      await redis.set(entryKey, { ...entry, ownerEmail: LEGACY_OWNER_EMAIL })
    }
  }

  const ownerKey = `newsletter:index:${LEGACY_OWNER_EMAIL}`
  const existingOwnerIndex = await redis.get(ownerKey)
  const ownerIndex = Array.isArray(existingOwnerIndex) ? existingOwnerIndex : []
  const mergedOwner = [...legacy, ...ownerIndex.filter((m) => !legacy.some((l) => l.id === m.id))]
  await redis.set(ownerKey, mergedOwner)

  const existingGlobalIndex = await redis.get(GLOBAL_NEWSLETTER_INDEX_KEY)
  const globalIndex = Array.isArray(existingGlobalIndex) ? existingGlobalIndex : []
  const mergedGlobal = [...legacy, ...globalIndex.filter((m) => !legacy.some((l) => l.id === m.id))]
  await redis.set(GLOBAL_NEWSLETTER_INDEX_KEY, mergedGlobal)

  await redis.del(LEGACY_NEWSLETTER_INDEX_KEY)
  return legacy.length
}

async function main() {
  const redis = getRedis()

  console.log(`\n${'─'.repeat(60)}`)
  console.log('구독자 계정 일괄 생성' + (dryRun ? ' (dry-run)' : ''))
  console.log(`${'─'.repeat(60)}\n`)

  const migratedEditors = await migrateEditors(redis)
  console.log(
    migratedEditors.length
      ? `편집자 계정 이전: ${migratedEditors.join(', ')}`
      : '편집자 계정: 이전할 대상 없음 (이미 존재하거나 AUTH_USERS 없음)'
  )

  const legacyCount = await migrateLegacyNewsletterIndex(redis)
  console.log(`기존 뉴스레터 아카이브 이전: ${legacyCount}건 → ${LEGACY_OWNER_EMAIL}\n`)

  const subscribeIndex = await redis.get(SUBSCRIBE_INDEX_KEY)
  const list = Array.isArray(subscribeIndex) ? subscribeIndex : []

  const firstSeen = new Map()
  for (const rec of list) {
    const existing = firstSeen.get(rec.email)
    if (!existing || new Date(rec.appliedAt) < new Date(existing.appliedAt)) {
      firstSeen.set(rec.email, rec)
    }
  }
  const unique = [...firstSeen.values()].sort(
    (a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
  )

  console.log(`구독 신청 총 ${list.length}건 → 고유 이메일 ${unique.length}명\n`)

  let seq = 0
  const existingSeq = await redis.get(SEQ_KEY)
  if (typeof existingSeq === 'number') seq = existingSeq

  const created = []
  let skippedCount = 0

  for (const { email, appliedAt } of unique) {
    const existing = await redis.get(`user:${email}`)
    if (existing) {
      skippedCount += 1
      continue
    }

    const order = seq
    const password = formatPassword(order)
    console.log(`  [${dryRun ? 'DRY' : 'NEW'}] #${order}  ${email}  → 비밀번호 ${password}`)
    created.push({ email, order, password, appliedAt })
    seq += 1

    if (!dryRun) {
      const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_COST)
      await redis.set(`user:${email}`, {
        email,
        passwordHash,
        order,
        role: 'subscriber',
        createdAt: new Date().toISOString(),
        notifiedAt: null,
      })
    }
  }

  if (!dryRun) {
    await redis.set(SEQ_KEY, seq)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`신규 생성: ${created.length}명 / 이미 존재해서 건너뜀: ${skippedCount}명`)
  console.log(`다음 순번(user:seq:next): ${seq}`)
  console.log(`${'─'.repeat(60)}\n`)

  if (created.length) {
    const outDir = path.join(__dirname, '../../logs')
    fs.mkdirSync(outDir, { recursive: true })
    const outFile = path.join(outDir, `subscriber-accounts${dryRun ? '.dryrun' : ''}.csv`)
    const csv = [
      'email,order,password,appliedAt',
      ...created.map((c) => `${c.email},${c.order},${c.password},${c.appliedAt}`),
    ].join('\n')
    fs.writeFileSync(outFile, csv, 'utf-8')
    console.log(`결과 CSV 저장: ${outFile}  (logs/는 .gitignore 대상 — 커밋되지 않음)\n`)
  }

  if (dryRun) {
    console.log('ℹ dry-run: 실제 저장 없음. 실행하려면 --dry-run 없이 다시 실행하세요.\n')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
