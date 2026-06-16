import type { TopicId } from './types'
import type { ScoredArticle } from './screening'

export interface CategoryKeyword {
  term: string
  bonus: number
}

export interface CategoryProfile {
  categoryId: TopicId
  label: string
  topicMatchBonus: number   // AI 분류가 이 카테고리와 일치할 때 추가 보너스
  bonusCap: number          // 카테고리 보너스 합산 최대값
  keywords: CategoryKeyword[]
}

export const CATEGORY_PROFILES: CategoryProfile[] = [
  {
    categoryId: '전력 인프라',
    label: '전력 인프라',
    topicMatchBonus: 20,
    bonusCap: 55,
    keywords: [
      // 계통·망 구조
      { term: '계통 혼잡',     bonus: 15 },
      { term: '계통 포화',     bonus: 15 },
      { term: '접속 대기',     bonus: 15 },
      { term: '계통 안정',     bonus: 12 },
      { term: '계통 연계',     bonus: 12 },
      { term: '계통',          bonus: 10 },
      { term: '송배전',        bonus: 12 },
      { term: '송전선로',      bonus: 12 },
      { term: '배전망',        bonus: 12 },
      { term: '전력망',        bonus: 10 },
      { term: '전력망 확충',   bonus: 15 },
      { term: '지중화',        bonus: 10 },
      { term: '변전소',        bonus:  8 },
      // 전력 품질·안정성
      { term: '주파수',        bonus: 15 },
      { term: '전압',          bonus: 15 },
      { term: '블랙아웃',      bonus: 15 },
      { term: '마이크로그리드',bonus: 15 },
      // 기술
      { term: 'HVDC',          bonus: 12 },
      { term: '초고압',        bonus: 10 },
      { term: '스마트그리드',  bonus: 12 },
      { term: '분산자원',      bonus: 10 },
      { term: 'VPP',           bonus: 10 },
      // 영어
      { term: 'grid congestion',    bonus: 15 },
      { term: 'grid stability',     bonus: 15 },
      { term: 'blackout',           bonus: 15 },
      { term: 'microgrid',          bonus: 15 },
      { term: 'frequency',          bonus: 12 },
      { term: 'voltage',            bonus: 12 },
      { term: 'transmission',       bonus: 10 },
      { term: 'distribution grid',  bonus: 10 },
      { term: 'smart grid',         bonus: 10 },
      { term: 'interconnection',    bonus: 10 },
    ],
  },

  {
    categoryId: '에너지원',
    label: '에너지원',
    topicMatchBonus: 20,
    bonusCap: 55,
    keywords: [
      // 에너지원 총괄
      { term: '재생에너지',     bonus: 15 },
      { term: '신재생',         bonus: 15 },
      { term: '에너지원',       bonus: 15 },
      { term: '발전원',         bonus: 15 },
      // 재생에너지 세부
      { term: '해상풍력',       bonus: 15 },
      { term: '육상풍력',       bonus: 10 },
      { term: '태양광 발전',    bonus: 12 },
      { term: '태양광',         bonus:  8 },
      { term: '풍력 발전',      bonus: 12 },
      { term: '지열',           bonus: 10 },
      // 원자력
      { term: 'SMR',            bonus: 15 },
      { term: '소형모듈원전',   bonus: 15 },
      { term: '원자력 발전',    bonus: 12 },
      { term: '원전 건설',      bonus: 12 },
      { term: '원전',           bonus:  8 },
      // 저장·수소·탄소
      { term: 'ESS',            bonus: 12 },
      { term: '에너지저장장치', bonus: 12 },
      { term: '그린수소',       bonus: 12 },
      { term: '수소 생산',      bonus: 12 },
      { term: '블루수소',       bonus: 10 },
      { term: '연료전지',       bonus: 12 },
      { term: '바이오가스',     bonus: 10 },
      { term: 'CCUS',           bonus: 12 },
      // 영어
      { term: 'renewable',           bonus: 15 },
      { term: 'energy source',       bonus: 15 },
      { term: 'generation mix',      bonus: 15 },
      { term: 'offshore wind',       bonus: 15 },
      { term: 'onshore wind',        bonus: 10 },
      { term: 'solar power',         bonus: 10 },
      { term: 'battery storage',     bonus: 12 },
      { term: 'green hydrogen',      bonus: 12 },
      { term: 'fuel cell',           bonus: 12 },
      { term: 'nuclear',             bonus:  8 },
      { term: 'small modular reactor', bonus: 15 },
      { term: 'geothermal',          bonus: 10 },
      { term: 'carbon capture',      bonus: 12 },
    ],
  },

  {
    categoryId: '운영 최적화',
    label: '운영 최적화',
    topicMatchBonus: 20,
    bonusCap: 55,
    keywords: [
      // 고보너스 — 운영 특화 (constants.ts에 없는 차별화 키워드)
      { term: '효율화',           bonus: 15 },
      { term: '자동제어',         bonus: 15 },
      { term: '에너지 절감',      bonus: 15 },
      { term: '실시간 모니터링',  bonus: 15 },
      // 수요·예측 (constants에 없는 세부 표현)
      { term: '수요 예측',        bonus: 12 },
      { term: '전력 수요 관리',   bonus: 12 },
      // 계통 운영
      { term: '주파수 조정',      bonus: 12 },
      { term: '예비력',           bonus: 12 },
      { term: '가상 발전소',      bonus: 12 },
      { term: '계통 운영',        bonus: 10 },
      { term: '실시간 운영',      bonus: 10 },
      // 시스템
      { term: 'SCADA',            bonus: 10 },
      { term: 'AI 예측',          bonus: 10 },
      // 영어
      { term: 'demand response',      bonus: 15 },
      { term: 'demand forecasting',   bonus: 12 },
      { term: 'frequency regulation', bonus: 12 },
      { term: 'ancillary services',   bonus: 12 },
      { term: 'virtual power plant',  bonus: 12 },
      { term: 'real-time dispatch',   bonus: 10 },
      { term: 'energy optimization',  bonus: 12 },
      { term: 'digital twin',         bonus: 12 },
    ],
  },

  {
    categoryId: '정책·규제',
    label: '정책·규제',
    topicMatchBonus: 20,
    bonusCap: 55,
    keywords: [
      // 고보너스 — 주요 기관 (정책 주체)
      { term: '산업부',               bonus: 15 },
      { term: '환경부',               bonus: 15 },
      { term: '국토부',               bonus: 15 },
      { term: '한전',                 bonus: 15 },
      { term: '전력거래소',           bonus: 15 },
      { term: 'DOE',                   bonus: 15 },
      { term: 'IEA',                   bonus: 15 },
      { term: 'IRENA',                 bonus: 15 },
      { term: '유럽의회',             bonus: 15 },
      // 고보너스 — 제도·절차
      { term: '인허가',               bonus: 15 },
      { term: '규제샌드박스',         bonus: 15 },
      { term: '요금제',               bonus: 15 },
      { term: '보조금',               bonus: 15 },
      // 법령·제도 (constants에 없는 세부 표현)
      { term: '전력시장운영규칙',     bonus: 15 },
      { term: '직접 PPA',             bonus: 15 },
      { term: '에너지 법안',          bonus: 12 },
      { term: '법령 개정',            bonus: 12 },
      { term: '전기요금 체계',        bonus: 12 },
      { term: '계시별 요금',          bonus: 12 },
      { term: 'REC',                   bonus: 10 },
      { term: '규제 완화',            bonus: 10 },
      { term: '환경 영향 평가',       bonus: 10 },
      { term: '에너지 전환 정책',     bonus: 12 },
      { term: '그린뉴딜',             bonus: 10 },
      { term: '지원금',               bonus:  8 },
      // 해외 정책
      { term: 'IRA',                   bonus: 12 },
      { term: 'REPowerEU',             bonus: 12 },
      { term: 'FERC',                  bonus: 12 },
      // 영어
      { term: 'electricity market reform', bonus: 12 },
      { term: 'energy legislation',        bonus: 12 },
      { term: 'clean energy standard',     bonus: 10 },
      { term: 'carbon tax',                bonus: 10 },
      { term: 'permitting',                bonus: 10 },
      { term: 'subsidy',                   bonus:  8 },
    ],
  },

  {
    categoryId: 'ESG·탄소중립',
    label: 'ESG·탄소중립',
    topicMatchBonus: 20,
    bonusCap: 55,
    keywords: [
      // 고보너스 — 신규 (constants에 없는 차별화 키워드)
      { term: '탄소감축',               bonus: 15 },
      { term: '그린워싱',               bonus: 15 },
      { term: '공시',                   bonus: 15 },
      { term: '지속가능경영',           bonus: 15 },
      // 탄소 시장·규제 (constants에 없는 세부 표현)
      { term: '탄소국경조정',           bonus: 15 },
      { term: '탄소 배출권',            bonus: 12 },
      { term: '배출권 거래제',          bonus: 12 },
      { term: '국가 온실가스 감축',     bonus: 12 },
      { term: '2050',                   bonus:  8 },
      // 기업·공시 (constants에 없는 세부 표현)
      { term: 'TCFD',                   bonus: 12 },
      { term: 'SBTi',                   bonus: 12 },
      { term: '기후공시',               bonus: 12 },
      { term: 'ESG 경영',               bonus: 10 },
      { term: 'SASB',                   bonus: 10 },
      // 분류체계
      { term: '녹색 분류체계',          bonus: 12 },
      { term: 'K-taxonomy',             bonus: 12 },
      // 영어
      { term: 'carbon credit',              bonus: 15 },
      { term: 'renewable energy certificate', bonus: 15 },
      { term: 'carbon border adjustment',   bonus: 15 },
      { term: 'carbon neutrality',          bonus: 12 },
      { term: 'emissions trading',          bonus: 12 },
      { term: 'science based targets',      bonus: 12 },
      { term: 'climate disclosure',         bonus: 12 },
      { term: 'green taxonomy',             bonus: 10 },
    ],
  },

  {
    categoryId: '시장·가격 동향',
    label: '시장·가격 동향',
    topicMatchBonus: 20,
    bonusCap: 55,
    keywords: [
      // 고보너스 — 시장 특화 (constants에 없는 차별화 키워드)
      { term: '전력거래',         bonus: 15 },
      { term: 'PPA가격',          bonus: 15 },
      { term: '현물시장',         bonus: 15 },
      { term: '용량시장',         bonus: 15 },
      { term: '수익성',           bonus: 15 },
      { term: '마진',             bonus: 15 },
      { term: 'EBITDA',           bonus: 15 },
      { term: '밸류에이션',       bonus: 15 },
      { term: '시장전망',         bonus: 15 },
      // 가격·수급 (constants에 없는 세부 표현)
      { term: '수급 불균형',      bonus: 15 },
      { term: '전력 가격 급등',   bonus: 15 },
      { term: '정산 가격',        bonus: 12 },
      { term: '전력 수급',        bonus: 12 },
      { term: '에너지 수급',      bonus: 12 },
      { term: '천연가스 가격',    bonus: 12 },
      { term: '용량요금',         bonus: 10 },
      { term: '유가',             bonus: 10 },
      // 투자·거래 (constants에 없는 세부 표현)
      { term: '에너지 투자',      bonus: 12 },
      { term: '투자 유치',        bonus: 10 },
      { term: '합작법인',         bonus: 10 },
      { term: '펀드 조성',        bonus: 10 },
      { term: '에너지 스타트업',  bonus:  8 },
      // 영어
      { term: 'spot price',        bonus: 15 },
      { term: 'capacity market',   bonus: 15 },
      { term: 'revenue',           bonus: 15 },
      { term: 'investment',        bonus: 15 },
      { term: 'energy prices',     bonus: 15 },
      { term: 'wholesale price',   bonus: 12 },
      { term: 'LNG price',         bonus: 12 },
      { term: 'energy investment', bonus: 12 },
    ],
  },
]

// categoryId → profile 빠른 조회
export const CATEGORY_PROFILE_MAP = new Map<string, CategoryProfile>(
  CATEGORY_PROFILES.map((p) => [p.categoryId, p])
)

/**
 * 후보 기사에 카테고리 보너스를 적용하고 상위 limit개를 반환한다.
 * screenArticles()의 출력을 입력으로 받으며, 원본 함수는 수정하지 않는다.
 */
export function applyCategoryBonus(
  candidates: ScoredArticle[],
  profile: CategoryProfile,
  limit = 30
): ScoredArticle[] {
  const boosted = candidates.map((article) => {
    const text = `${article.title} ${article.titleOriginal ?? ''} ${article.summary ?? ''}`.toLowerCase()

    let bonus = 0

    // 1. 카테고리 특화 키워드 보너스
    for (const { term, bonus: b } of profile.keywords) {
      if (text.includes(term.toLowerCase())) bonus += b
    }

    // 2. AI 분류 일치 보너스
    if (article.topics.includes(profile.categoryId)) bonus += profile.topicMatchBonus

    // 3. bonusCap 적용
    bonus = Math.min(bonus, profile.bonusCap)

    return { ...article, relevanceScore: article.relevanceScore + bonus }
  })

  return boosted
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
}
