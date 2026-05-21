import { TOPICS } from './constants'
import type { Article } from './types'

// ── 전략 중요도 신호 ──────────────────────────────────────────────────────────
// 각 신호는 독립적으로 감지되며 bonus 합산 후 최대 +30 캡 적용
const STRATEGIC_SIGNALS = [
  {
    id: '대형 규모',
    bonus: 10,
    ko: ['조 원', '조원', 'gw급', '기가와트', '메가와트급', '대규모 투자', '수십억', '수조'],
    en: ['billion dollar', 'gigawatt', 'gw project', 'multi-billion', 'record-breaking', 'largest ever'],
  },
  {
    id: '정책·규제',
    bonus: 10,
    ko: ['법안 통과', '고시', '의무화', '시행령', '시행규칙', '법 개정', '제도 개편', '입법', '규제 강화'],
    en: ['signed into law', 'regulation passed', 'mandate', 'executive order', 'ira', 'ferc order', 'legislation'],
  },
  {
    id: '산업 구조',
    bonus: 8,
    ko: ['인수합병', 'm&a', '합작법인', '지분 인수', '합병', '전략적 제휴 체결', '파트너십 체결'],
    en: ['merger', 'acquisition', 'joint venture', 'stake acquisition', 'takeover', 'strategic deal'],
  },
  {
    id: '기술 전환점',
    bonus: 8,
    ko: ['최초 상용화', '세계 최초', '실증 완료', '상용화 성공', '파일럿 완료', '국내 최초', '기술 돌파'],
    en: ['first commercial', 'world first', 'demonstration completed', 'commercialized', 'pilot completed', 'breakthrough'],
  },
  {
    id: '시장 긴급',
    bonus: 6,
    ko: ['전력 부족', '블랙아웃', '비상', '전력 위기', '급등', '급락', '긴급 대책'],
    en: ['blackout', 'power shortage', 'grid emergency', 'energy crisis', 'price spike', 'emergency'],
  },
] as const

// ── SK 그룹 사업 연관성 ────────────────────────────────────────────────────────
const SK_GROUP_KW = [
  'sk이노베이션', 'sk innovation',
  'sk e&s', 'sk에너지솔루션', 'sk energy solutions',
  'sk에코플랜트', 'sk ecoplant',
  'sk온', 'sk on',
  'sk네트웍스', 'sk networks',
  'skc',
  'sk그룹', 'sk group',
  'sk하이닉스', 'sk hynix',
  'sk㈜', 'sk inc',
]

// ── 사업 연관성 ──────────────────────────────────────────────────────────────
// 소스 신뢰도 3단계: Tier1(국제기구) +10 / Tier2(전문지) +5 / 기타 0
const SOURCE_TIER1 = new Set(['iea', 'irena', 'bnef'])
const SOURCE_TIER2 = new Set([
  'energy-storage', 'pv-magazine', 'windpower-monthly', 'world-nuclear-news',
  'carbon-brief', 'data-center-dynamics', 'utility-dive', 'power-magazine',
  'canary-media', 'electimes', 'e2news', 'energydaily', 'todayenergy',
  'energytimes', 'ekn', 'kea', 'igt', 'kaif',
])

// 국내 직접 영향 (+8)
const DOMESTIC_IMPACT_KW = [
  '한국', '국내', '한전', '한국전력', '산업부', '산업통상자원부', '전력거래소', '에너지공단',
]

// 글로벌 파급력 (+5)
const GLOBAL_IMPACT_KW = [
  'iea', 'g7', 'g20', 'cop', '파리협정', 'eu taxonomy',
  'paris agreement', 'united nations', 'un climate',
]

// ── 정보 품질 ────────────────────────────────────────────────────────────────
// 공식 기관 언급 (+5)
const OFFICIAL_BODY_KW = [
  '정부', '산업통상자원부', '산업부', '기재부', '환경부', '과기부', '원안위',
  '한국전력', '전력거래소', '에너지공단', '한전',
  'department of energy', 'doe', 'ferc', 'eu commission', 'european commission',
]

// 숫자 + 에너지/금융 단위 패턴 (+5)
const QUANTITY_PATTERN = /\d+(\.\d+)?\s*(%|gw|mw|kw|gwh|mwh|kwh|조\s*원|억\s*원|백만\s*달러|billion|million|퍼센트)/i

const BROAD_KEYWORDS = [
  '에너지', '전력', '발전소', '전기', '에너지전환', '탄소', '기후변화', '넷제로',
  '배전', '계통', '신재생', '원전', '태양', '풍력',
  'solar', 'wind', 'battery', 'storage', 'renewable', 'energy', 'power',
  'electricity', 'grid', 'carbon', 'hydrogen', 'nuclear', 'net zero',
  'emission', 'clean energy', 'photovoltaic', 'offshore',
]

const STOP_WORDS = new Set([
  // 한국어
  '있다', '하다', '이다', '되다', '했다', '있는', '하는', '이는', '되는', '된다',
  '라고', '에서', '에게', '으로', '에도', '또한', '그리고', '하지만', '그러나', '따라서',
  '통해', '위해', '관련', '대한', '지난', '이번', '위한', '향한', '뉴스', '기자', '기사',
  '보도', '올해', '내년', '이후', '이전', '현재', '향후', '예정', '발표', '설명', '강조',
  // 영어
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'this', 'that', 'these', 'those', 'it', 'its', 'and', 'or', 'but', 'not', 'so',
  'new', 'also', 'more', 'can', 'than', 'after', 'says', 'said', 'first', 'year',
  'which', 'over', 'about', 'just', 'up', 'out', 'now', 'two', 'one', 'all',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.\!\?\(\)\[\]\{\}"'\/·\-\n\t%:;]+/)
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !STOP_WORDS.has(t))
}

export interface ScoredArticle extends Article {
  relevanceScore: number
  matchedKeywords: string[]
  matchedDemandKeywords: string[]
  strategicSignals: string[]
  skRelevance: boolean
  isDuplicate: boolean
}

/**
 * 과거 확정 뉴스레터 기사들에서 자주 등장한 키워드를 추출한다.
 * 2회 이상 등장한 토큰만 포함, 빈도 내림차순 상위 50개 반환.
 */
function uniqueTokens(title: string): string[] {
  const seen: Record<string, boolean> = {}
  const result: string[] = []
  for (const t of tokenize(title)) {
    if (!seen[t]) { seen[t] = true; result.push(t) }
  }
  return result
}

function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 0
  const lookup: Record<string, boolean> = {}
  for (const t of tokensB) lookup[t] = true
  const intersection = tokensA.filter((t) => lookup[t]).length
  const union = tokensA.length + tokensB.length - intersection
  return union === 0 ? 0 : intersection / union
}

export function computeDemandKeywords(articles: Article[]): Map<string, number> {
  if (articles.length === 0) return new Map()
  const freq = new Map<string, number>()
  for (const a of articles) {
    const tokens = Array.from(new Set(tokenize(`${a.title} ${a.summary ?? ''}`)))
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1)
    }
  }
  return new Map(
    Array.from(freq.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
  )
}

export interface ScreeningOptions {
  limit?: number        // 총 선정 개수 (기본값 30)
  categoryMax?: number  // 카테고리(primaryTopic)당 최대 선정 수 (기본값 8)
  sourceMax?: number    // 동일 소스당 최대 선정 수 (기본값 4)
}

export function screenArticles(
  articles: Article[],
  options?: ScreeningOptions | number,  // 하위 호환: 숫자로 limit만 넘길 수도 있음
  demandKeywords?: Map<string, number>
): ScoredArticle[] {
  // 하위 호환: 숫자를 넘기면 { limit: n }으로 변환
  const opts: ScreeningOptions = typeof options === 'number'
    ? { limit: options }
    : (options ?? {})

  const LIMIT        = opts.limit       ?? 30
  const CATEGORY_MAX = opts.categoryMax ?? 8
  const SOURCE_MAX   = opts.sourceMax   ?? 4

  const now = Date.now()

  const scored = articles.map((article): ScoredArticle => {
    const text = `${article.title} ${article.titleOriginal ?? ''} ${article.summary ?? ''}`.toLowerCase()
    let score = 0
    const matchedKeywords: string[] = []
    const matchedDemandKeywords: string[] = []

    // AI 분류 토픽 (가장 강한 신호)
    score += article.topics.length * 15

    // 토픽 키워드 매칭
    for (const topic of TOPICS) {
      for (const kw of topic.keywords) {
        if (text.includes(kw.toLowerCase())) {
          score += 5
          if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw)
        }
      }
    }

    // 광범위 에너지 키워드
    for (const kw of BROAD_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) score += 1
    }

    // 요약 품질 가산
    if (article.summary && article.summary.length > 100) score += 3

    // 최신성 가산
    const days = (now - new Date(article.publishedAt).getTime()) / 86_400_000
    if (days <= 3) score += 5
    else if (days <= 7) score += 3

    // 수요 키워드 보너스 (최대 +15)
    if (demandKeywords && demandKeywords.size > 0) {
      const tokens = tokenize(text)
      let demandBonus = 0
      for (const token of tokens) {
        if (matchedDemandKeywords.includes(token)) continue
        const freq = demandKeywords.get(token)
        if (freq) {
          demandBonus += Math.min(freq, 3) * 2
          matchedDemandKeywords.push(token)
        }
      }
      score += Math.min(demandBonus, 15)
    }

    // 전략 중요도 (최대 +30)
    const strategicSignals: string[] = []
    let strategicBonus = 0
    for (const signal of STRATEGIC_SIGNALS) {
      const allKw = [...signal.ko, ...signal.en]
      if (allKw.some((kw) => text.includes(kw.toLowerCase()))) {
        strategicSignals.push(signal.id)
        strategicBonus += signal.bonus
      }
    }
    score += Math.min(strategicBonus, 30)

    // SK 그룹 사업 연관성 (+15)
    const skRelevance = SK_GROUP_KW.some((kw) => text.includes(kw.toLowerCase()))
    if (skRelevance) score += 15

    // 사업 연관성 (최대 +20)
    let bizBonus = 0
    if (SOURCE_TIER1.has(article.sourceId))       bizBonus += 10
    else if (SOURCE_TIER2.has(article.sourceId))  bizBonus += 5
    if (DOMESTIC_IMPACT_KW.some((kw) => text.includes(kw))) bizBonus += 8
    if (GLOBAL_IMPACT_KW.some((kw) => text.includes(kw)))   bizBonus += 5
    score += Math.min(bizBonus, 20)

    // 정보 품질 (최대 +10)
    let qualityBonus = 0
    if (QUANTITY_PATTERN.test(text)) qualityBonus += 5
    if (OFFICIAL_BODY_KW.some((kw) => text.includes(kw.toLowerCase()))) qualityBonus += 5
    score += Math.min(qualityBonus, 10)

    return { ...article, relevanceScore: score, matchedKeywords, matchedDemandKeywords, strategicSignals, skRelevance, isDuplicate: false }
  })

  // ── Pass 1 정렬 ──────────────────────────────────────────────────────────
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // ── Pass 2: 중복 패널티 (상위 200개 대상, Jaccard ≥ 0.4 → 후순위 -15) ──
  const compareRange = Math.min(scored.length, 200)
  const tokenSets = scored.slice(0, compareRange).map((a) => uniqueTokens(a.title))
  for (let i = 0; i < compareRange; i++) {
    for (let j = i + 1; j < compareRange; j++) {
      if (scored[j].isDuplicate) continue
      if (jaccardSimilarity(tokenSets[i], tokenSets[j]) >= 0.4) {
        scored[j].relevanceScore = Math.max(0, scored[j].relevanceScore - 15)
        scored[j].isDuplicate = true
      }
    }
  }

  // ── Pass 2 후 재정렬 ──────────────────────────────────────────────────────
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // ── Pass 3: Greedy Diversity Selection ───────────────────────────────────
  // primaryTopic 기준 카테고리 cap + sourceId 기준 소스 cap 적용
  const categoryCount: Record<string, number> = {}
  const sourceCount:   Record<string, number> = {}
  const selected: ScoredArticle[] = []

  function tryAdd(article: ScoredArticle, ignoreCategoryCap: boolean, ignoreSourceCap: boolean): boolean {
    const cat = article.primaryTopic ?? article.topics[0] ?? '__uncategorized__'
    const src = article.sourceId

    const catOk = ignoreCategoryCap || (categoryCount[cat] ?? 0) < CATEGORY_MAX
    const srcOk = ignoreSourceCap   || (sourceCount[src]   ?? 0) < SOURCE_MAX

    if (catOk && srcOk) {
      selected.push(article)
      categoryCount[cat] = (categoryCount[cat] ?? 0) + 1
      sourceCount[src]   = (sourceCount[src]   ?? 0) + 1
      return true
    }
    return false
  }

  // Pass 3-A: 카테고리 cap + 소스 cap 모두 적용
  for (const article of scored) {
    if (selected.length >= LIMIT) break
    tryAdd(article, false, false)
  }

  // Pass 3-B: 부족하면 카테고리 cap 무시, 소스 cap만 유지
  if (selected.length < LIMIT) {
    const selectedIds = new Set(selected.map(a => a.id))
    for (const article of scored) {
      if (selected.length >= LIMIT) break
      if (selectedIds.has(article.id)) continue
      tryAdd(article, true, false)
    }
  }

  // Pass 3-C: 그래도 부족하면 모든 cap 무시하고 점수순으로 채움
  if (selected.length < LIMIT) {
    const selectedIds = new Set(selected.map(a => a.id))
    for (const article of scored) {
      if (selected.length >= LIMIT) break
      if (selectedIds.has(article.id)) continue
      selected.push(article)
    }
  }

  return selected
}

export function getScoreLabel(score: number): { label: string; bg: string; text: string } {
  if (score >= 75) return { label: '연관성 높음', bg: 'rgba(0,191,64,0.12)', text: '#00BF40' }
  if (score >= 45) return { label: '연관성 보통', bg: 'rgba(255,107,0,0.10)', text: '#FF6B00' }
  return { label: '연관성 낮음', bg: 'rgba(112,115,124,0.10)', text: '#70737C' }
}
