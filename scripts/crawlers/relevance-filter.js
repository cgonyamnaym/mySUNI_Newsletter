/**
 * 에너지 도메인 관련성 필터
 * isEnergyRelevant(title, summary, lang, sourceId) → boolean
 *
 * 처리 순서:
 * 1. 제외 키워드(EXCLUDE) 체크 — 신뢰 소스 포함 모든 소스에 적용
 * 2. 신뢰 소스(TRUSTED) 면제 — 제외 통과 시 무조건 통과
 * 3. 혼합 소스 키워드 매칭 — 제목 → 요약 순으로 확인
 */

// ── 제외 키워드: 이 패턴이 제목에 있으면 신뢰 소스 포함 모두 제외 ──────────
// 한국어 — 에너지와 무관한 명백한 토픽
const EXCLUDE_KW_KO = [
  '소설가',          // 문학·문화 행사
  '군수 후보',       // 지방선거 후보
  '시장 후보',       // 지방선거 후보
  '도지사 후보',     // 지방선거 후보
  '의원 후보',       // 총선/지선 후보
  '후보 개소식',     // 선거 사무소 개소식
  '유독가스',        // '가스' 키워드 오매칭 방지 (독성 가스 != 에너지원)
  '부동산 분양',     // 부동산
  '아파트 분양',     // 부동산
  '코스피',          // 주식 지수 (에너지 기업 주가가 아닌 지수 기사)
  '코스닥',          // 주식 지수
]

// 영어 — 소비자 리뷰·쇼핑·무관 콘텐츠
const EXCLUDE_KW_EN = [
  ' to lease',       // "costs $X a month to lease" 자동차 리스 가격 기사
  'bundle deal',     // e-bike·가전 쇼핑 딜 기사
  'hooligan bike',   // 아마존 자전거 기사
]

// 에너지 전문 매체: 제외 키워드 통과 후 키워드 검사 면제
const TRUSTED_ENERGY_SOURCES = new Set([
  'energy-storage', 'pv-magazine', 'windpower-monthly', 'bnef',
  'iea', 'irena',
  'electimes', 'e2news', 'energydaily', 'todayenergy', 'energytimes',
  'kea', 'igt',
])

const ENERGY_KW_KO = [
  // 전력·전기
  '전력', '전기', '발전', '전기요금', '전기사업', '전력계통', '전력시장',
  '계통', '송전', '송배전', '한전', '한국전력', '전력수요', '전력수급',
  // 데이터센터 전력
  'ai 데이터센터 전력', '데이터센터 전력 공급',
  // 전력망·그리드
  '전력망', '전력망 확충', '그리드', '마이크로그리드', '스마트그리드', '지능형 전력망', '그리드 유연성',
  // 재생에너지
  '에너지', '재생에너지', '신재생', '에너지전환', '태양광', '태양전지', '솔라',
  '풍력', '해상풍력', '육상풍력',
  // 원자력·수소
  '원자력', '원전', '핵발전', 'smr', '소형모듈원자로',
  '수소', '그린수소', '연료전지',
  // 저장·배터리
  'ess', '배터리', '에너지저장', 'bess',
  // 탄소·기후
  '탄소중립', '탄소배출', '온실가스', '기후변화', '기후위기', '넷제로', 'net zero',
  'cop', 're100', '탄소세', '배출권', 'ets', 'ccus', 'ccs', '탄소흡수',
  '탈탄소', '저탄소', '친환경에너지',
  // 정책·기관
  '에너지정책', '에너지법', '전력법', '전기사업법', '신재생공급의무화', '전력구매계약',
  // 효율·스마트
  '에너지효율', 'vpp', '가상발전소', '수요반응', '분산자원', '분산전원', '에너지관리',
  'derms', '전력 수요 예측',
]

const ENERGY_KW_EN = [
  // power/electricity — root forms first for broad matching
  'energy', 'electricity', 'electric', 'electrif',
  'power plant', 'power system', 'power supply', 'power purchase',
  'electric utility', 'electricity market', 'power demand',
  // data center power
  'ai data center power', 'data center power supply',
  // renewable
  'solar', 'photovoltaic', 'pv panel', 'wind power', 'wind farm',
  'offshore wind', 'onshore wind', 'renewable energy', 'renewables',
  // nuclear / hydrogen
  'nuclear', 'reactor', 'smr', 'small modular reactor',
  'hydrogen', 'green hydrogen', 'fuel cell',
  // storage / battery
  'battery', 'energy storage', 'ess', 'bess',
  // carbon / climate — root 'carbon' catches all variants
  'carbon', 'net zero', 'decarbonization', 'decarbonize',
  'emission', 'greenhouse gas', 'ghg', 'emissions trading',
  'ccus', 'climate change', 'climate crisis', 'paris agreement', 'cop', 're100',
  // grid / infrastructure
  'power grid', 'grid', 'grid expansion', 'grid flexibility', 'transmission', 'microgrid', 'smart grid',
  'virtual power plant', 'vpp', 'demand response', 'der', 'derms', 'power demand forecasting',
  // units / capacity
  'gigawatt', 'megawatt', 'kilowatt', 'gwh', 'mwh', 'kwh',
  // policy
  'energy policy', 'energy transition', 'ppa', 'power purchase agreement',
  'feed-in tariff', 'renewable portfolio', 'energy efficiency',
]

/**
 * 기사가 에너지 도메인과 관련 있는지 확인.
 * @param {string} title
 * @param {string} summary     빈 문자열 가능
 * @param {string} lang        'ko' | 'en'
 * @param {string} sourceId    sources.js의 id (신뢰 소스 면제용)
 * @returns {boolean}
 */
function isEnergyRelevant(title = '', summary = '', lang = 'ko', sourceId = '') {
  const titleLower = title.toLowerCase()

  // 1단계: 제외 키워드 체크 (신뢰 소스 포함 모든 소스에 적용)
  const excludeKw = lang === 'ko'
    ? EXCLUDE_KW_KO
    : [...EXCLUDE_KW_EN, ...EXCLUDE_KW_KO]
  if (excludeKw.some(kw => titleLower.includes(kw.toLowerCase()))) return false

  // 2단계: 에너지 전문 매체는 제외 통과 후 무조건 통과
  if (sourceId && TRUSTED_ENERGY_SOURCES.has(sourceId)) return true

  // 3단계: 혼합 소스 — 제목 키워드 매칭만 허용 (요약 매칭 제거)
  // 에너지가 주요 주제라면 제목에 반드시 키워드가 나타남
  const allKw = lang === 'en'
    ? [...ENERGY_KW_EN, ...ENERGY_KW_KO]
    : [...ENERGY_KW_KO, ...ENERGY_KW_EN]
  if (allKw.some(kw => titleLower.includes(kw))) return true

  return false
}

module.exports = { isEnergyRelevant }
