/**
 * screening.ts의 Node.js CommonJS 포트
 * 브라우저 의존성 없이 동일한 스크리닝 알고리즘 실행
 */

// ── TOPICS (constants.ts 동기화) ─────────────────────────────────────────────
const TOPICS = [
  { id: '전력 인프라', keywords: ['계통', '송배전', '스마트그리드', '전력망 확충', '분산자원', 'VPP'] },
  { id: '에너지원',    keywords: ['ESS', '에너지저장', '원자력', '연료전지', '원전', 'SMR', '태양광', '풍력', '수소', '바이오에너지', '재생에너지', '신재생', '그린수소', 'AI데이터센터 전력 공급'] },
  { id: '운영 최적화', keywords: ['DERMS', '전력 수요 예측', '전력', 'VPP 운영'] },
  { id: '정책·규제',   keywords: ['국내외 에너지 정책', '법령', '규제 변화', '전력 시장 제도', 'PPA'] },
  { id: 'ESG·탄소중립', keywords: ['탄소중립', 'RE100', '탄소시장', 'ESG 공시', 'NDC'] },
  { id: '시장·가격 동향', keywords: ['에너지 가격', '수급', '투자 동향'] },
]

const STRATEGIC_SIGNALS = [
  { id: '대형 규모', bonus: 10, ko: ['조 원', '조원', 'gw급', '기가와트', '메가와트급', '대규모 투자', '수십억', '수조'], en: ['billion dollar', 'gigawatt', 'gw project', 'multi-billion', 'record-breaking', 'largest ever'] },
  { id: '정책·규제', bonus: 10, ko: ['법안 통과', '고시', '의무화', '시행령', '시행규칙', '법 개정', '제도 개편', '입법', '규제 강화'], en: ['signed into law', 'regulation passed', 'mandate', 'executive order', 'ira', 'ferc order', 'legislation'] },
  { id: '산업 구조', bonus: 8,  ko: ['인수합병', 'm&a', '합작법인', '지분 인수', '합병', '전략적 제휴 체결', '파트너십 체결'], en: ['merger', 'acquisition', 'joint venture', 'stake acquisition', 'takeover', 'strategic deal'] },
  { id: '기술 전환점', bonus: 8, ko: ['최초 상용화', '세계 최초', '실증 완료', '상용화 성공', '파일럿 완료', '국내 최초', '기술 돌파'], en: ['first commercial', 'world first', 'demonstration completed', 'commercialized', 'pilot completed', 'breakthrough'] },
  { id: '시장 긴급', bonus: 6,  ko: ['전력 부족', '블랙아웃', '비상', '전력 위기', '급등', '급락', '긴급 대책'], en: ['blackout', 'power shortage', 'grid emergency', 'energy crisis', 'price spike', 'emergency'] },
]

const SK_GROUP_KW = ['sk이노베이션', 'sk innovation', 'sk e&s', 'sk에너지솔루션', 'sk ecoplant', 'sk에코플랜트', 'sk온', 'sk on', 'sk네트웍스', 'sk networks', 'skc', 'sk그룹', 'sk group', 'sk하이닉스', 'sk hynix', 'sk㈜', 'sk inc']

const SOURCE_TIER1 = new Set(['iea', 'irena', 'bnef'])
const SOURCE_TIER2 = new Set(['energy-storage', 'pv-magazine', 'windpower-monthly', 'world-nuclear-news', 'carbon-brief', 'data-center-dynamics', 'utility-dive', 'power-magazine', 'canary-media', 'cleantechnica', 'electimes', 'e2news', 'energydaily', 'todayenergy', 'energytimes', 'ekn', 'kea', 'igt', 'kaif'])

const DOMESTIC_IMPACT_KW = ['한국', '국내', '한전', '한국전력', '산업부', '산업통상자원부', '전력거래소', '에너지공단']
const GLOBAL_IMPACT_KW   = ['iea', 'g7', 'g20', 'cop', '파리협정', 'eu taxonomy', 'paris agreement', 'united nations', 'un climate']
const OFFICIAL_BODY_KW   = ['정부', '산업통상자원부', '산업부', '기재부', '환경부', '과기부', '원안위', '한국전력', '전력거래소', '에너지공단', '한전', 'department of energy', 'doe', 'ferc', 'eu commission', 'european commission']
const BROAD_KEYWORDS     = ['에너지', '전력', '발전소', '전기', '에너지전환', '탄소', '기후변화', '넷제로', '배전', '계통', '신재생', '원전', '태양', '풍력', 'solar', 'wind', 'battery', 'storage', 'renewable', 'energy', 'power', 'electricity', 'grid', 'carbon', 'hydrogen', 'nuclear', 'net zero', 'emission', 'clean energy', 'photovoltaic', 'offshore']

const EV_CONSUMER_PENALTY_KW = ['ev sales', 'electric vehicle sales', 'electric car sales', 'ev market share', 'ev adoption', 'ev range', 'ev review', 'home charging', 'best ev', 'ev comparison', '전기차 판매량', '전기차 보급률', '전기차 가격', '전기차 리뷰', '전기자전거', '전동킥보드']
const CONSUMER_EVENT_PENALTY_KW = ['giveaway', 'sweepstakes', 'raffle', 'enter to win', '경품 추첨', '경품 당첨', '경품 행사']

const QUANTITY_PATTERN = /\d+(\.\d+)?\s*(%|gw|mw|kw|gwh|mwh|kwh|조\s*원|억\s*원|백만\s*달러|billion|million|퍼센트)/i

const STOP_WORDS = new Set([
  '있다', '하다', '이다', '되다', '했다', '있는', '하는', '이는', '되는', '된다', '라고', '에서', '에게', '으로', '에도', '또한', '그리고', '하지만', '그러나', '따라서', '통해', '위해', '관련', '대한', '지난', '이번', '위한', '향한', '뉴스', '기자', '기사', '보도', '올해', '내년', '이후', '이전', '현재', '향후', '예정', '발표', '설명', '강조',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'this', 'that', 'these', 'those', 'it', 'its', 'and', 'or', 'but', 'not', 'so', 'new', 'also', 'more', 'can', 'than', 'after', 'says', 'said', 'first', 'year', 'which', 'over', 'about', 'just', 'up', 'out', 'now', 'two', 'one', 'all',
])

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[\s,.\!\?\(\)\[\]\{\}"'\/·\-\n\t%:;]+/)
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !STOP_WORDS.has(t))
}

function uniqueTokens(title) {
  const seen = {}
  const result = []
  for (const t of tokenize(title)) {
    if (!seen[t]) { seen[t] = true; result.push(t) }
  }
  return result
}

function jaccardSimilarity(tokensA, tokensB) {
  if (tokensA.length === 0 && tokensB.length === 0) return 0
  const lookup = {}
  for (const t of tokensB) lookup[t] = true
  const intersection = tokensA.filter((t) => lookup[t]).length
  const union = tokensA.length + tokensB.length - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * @param {object[]} articles
 * @param {{ limit?: number, categoryMax?: number, sourceMax?: number }} [options]
 */
function screenArticles(articles, options = {}) {
  const LIMIT        = options.limit       ?? 30
  const CATEGORY_MAX = options.categoryMax ?? 8
  const SOURCE_MAX   = options.sourceMax   ?? 4
  const now = Date.now()

  const scored = articles.map((article) => {
    const text = `${article.title} ${article.titleOriginal ?? ''} ${article.summary ?? ''}`.toLowerCase()
    let score = 0

    // AI 분류 토픽
    score += (article.topics?.length ?? 0) * 15

    // 토픽 키워드 매칭
    for (const topic of TOPICS) {
      for (const kw of topic.keywords) {
        if (text.includes(kw.toLowerCase())) score += 5
      }
    }

    // 광범위 에너지 키워드
    for (const kw of BROAD_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) score += 1
    }

    // 요약 품질
    if (article.summary && article.summary.length > 100) score += 3

    // 최신성
    const days = (now - new Date(article.publishedAt).getTime()) / 86_400_000
    if (days <= 3)      score += 5
    else if (days <= 7) score += 3

    // 전략 중요도 (최대 +30)
    let strategicBonus = 0
    for (const signal of STRATEGIC_SIGNALS) {
      const allKw = [...signal.ko, ...signal.en]
      if (allKw.some((kw) => text.includes(kw.toLowerCase()))) {
        strategicBonus += signal.bonus
      }
    }
    score += Math.min(strategicBonus, 30)

    // SK 그룹 연관성 (+15)
    if (SK_GROUP_KW.some((kw) => text.includes(kw.toLowerCase()))) score += 15

    // 사업 연관성 (최대 +20)
    let bizBonus = 0
    if (SOURCE_TIER1.has(article.sourceId))      bizBonus += 10
    else if (SOURCE_TIER2.has(article.sourceId)) bizBonus += 5
    if (DOMESTIC_IMPACT_KW.some((kw) => text.includes(kw))) bizBonus += 8
    if (GLOBAL_IMPACT_KW.some((kw) => text.includes(kw)))   bizBonus += 5
    score += Math.min(bizBonus, 20)

    // 정보 품질 (최대 +15)
    let qualityBonus = 0
    if (QUANTITY_PATTERN.test(text))                                              qualityBonus += 10
    if (OFFICIAL_BODY_KW.some((kw) => text.includes(kw.toLowerCase())))          qualityBonus += 5
    score += Math.min(qualityBonus, 15)

    // 감점
    if (EV_CONSUMER_PENALTY_KW.some((kw) => text.includes(kw)))      score -= 25
    if (CONSUMER_EVENT_PENALTY_KW.some((kw) => text.includes(kw)))   score -= 30

    return { ...article, relevanceScore: score, isDuplicate: false }
  })

  // Pass 1: 점수 정렬
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Pass 2: 중복 패널티 (상위 200개, Jaccard ≥ 0.4 → -15)
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

  // Pass 2 후 재정렬
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Pass 3: Greedy Diversity Selection
  const categoryCount = {}
  const sourceCount   = {}
  const selected = []
  const MIN_SCORE_THRESHOLD = 25

  function tryAdd(article, ignoreCategoryCap, ignoreSourceCap) {
    const cat = article.primaryTopic ?? article.topics?.[0] ?? '__uncategorized__'
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

  for (const article of scored) {
    if (selected.length >= LIMIT) break
    tryAdd(article, false, false)
  }

  if (selected.length < LIMIT) {
    const selectedIds = new Set(selected.map(a => a.id))
    for (const article of scored) {
      if (selected.length >= LIMIT) break
      if (selectedIds.has(article.id)) continue
      tryAdd(article, true, false)
    }
  }

  if (selected.length < LIMIT) {
    const selectedIds = new Set(selected.map(a => a.id))
    for (const article of scored) {
      if (selected.length >= LIMIT) break
      if (selectedIds.has(article.id)) continue
      if (article.relevanceScore < MIN_SCORE_THRESHOLD) continue
      selected.push(article)
    }
  }

  return selected
}

module.exports = { screenArticles }