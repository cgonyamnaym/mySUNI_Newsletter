/**
 * 이미 수집한 URL을 기록 → 중복 수집 방지
 * 저장 위치: data/.crawled-urls.json
 */
const fs   = require('fs')
const path = require('path')

const TRACKER_FILE = path.join(__dirname, '../../data/.crawled-urls.json')

function load() {
  try {
    const raw = fs.readFileSync(TRACKER_FILE, 'utf-8')
    return new Set(JSON.parse(raw).urls)
  } catch {
    return new Set()
  }
}

function save(urlSet) {
  fs.writeFileSync(
    TRACKER_FILE,
    JSON.stringify({ urls: [...urlSet], updatedAt: new Date().toISOString() }, null, 2)
  )
}

/**
 * @param {string[]} urls
 * @param {object}   opts
 * @param {boolean}  opts.force - true면 트래커 무시하고 모두 신규로 처리
 * @returns {{ newUrls: string[], seen: Set<string> }}
 */
function filterNew(urls, { force = false } = {}) {
  if (force) return { newUrls: urls, seen: new Set() }
  const seen    = load()
  const newUrls = urls.filter(u => !seen.has(u))
  return { newUrls, seen }
}

/**
 * @param {string[]}  urls
 * @param {Set}       existingSeen
 * @param {object}    opts
 * @param {boolean}   opts.dryRun - true면 트래커를 디스크에 저장하지 않음
 */
function markSeen(urls, existingSeen, { dryRun = false } = {}) {
  if (dryRun) return  // dry-run: URL 트래커를 오염시키지 않음
  const merged = existingSeen ?? load()
  for (const u of urls) merged.add(u)
  save(merged)
}

/**
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function isUrlAccessible(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, signal: AbortSignal.timeout(10000) })
    if (res.ok) return true
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) })
      return getRes.ok
    }
    return false
  } catch (err) {
    return false
  }
}

module.exports = { filterNew, markSeen, isUrlAccessible }
