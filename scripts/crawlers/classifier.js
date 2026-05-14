/**
 * 키워드 기반 토픽 분류기
 * constants.ts의 6개 카테고리에 영/한 키워드를 확장해 매핑
 */

const TOPIC_RULES = [
  {
    id: '에너지원',
    ko: [
      'ess', '에너지저장', '배터리', '리튬', '전고체',
      '태양광', '태양전지', '페로브스카이트', '모듈', '솔라',
      '풍력', '해상풍력', '육상풍력', '터빈',
      '원자력', '원전', '핵발전', 'smr', '소형모듈원자로',
      '수소', '그린수소', '연료전지', '전해조',
      '재생에너지', '신재생', '바이오에너지', '바이오가스', '바이오매스',
      '지열', '조력', '파력', '수력',
      '전기차', 'ev', '충전', 'ai데이터센터 전력',
      '발전소', '발전기', '발전량', '발전 용량',
    ],
    en: [
      'solar', 'photovoltaic', 'pv panel', 'perovskite',
      'wind power', 'wind farm', 'wind turbine', 'offshore wind', 'onshore wind',
      'battery', 'lithium', 'energy storage', 'ess', 'bess',
      'nuclear', 'reactor', 'smr', 'small modular reactor',
      'hydrogen', 'green hydrogen', 'fuel cell', 'electrolyzer',
      'renewable energy', 'renewables', 'bioenergy', 'biomass', 'biogas',
      'geothermal', 'hydro power', 'tidal',
      'electric vehicle', 'ev charging', 'charging station',
      'power plant', 'generation capacity', 'gigawatt', 'megawatt',
    ],
  },
  {
    id: '전력 인프라',
    ko: [
      '계통', '송전', '배전', '송배전', '전력망', '계통망',
      '스마트그리드', '마이크로그리드', '분산자원', '분산전원',
      'vpp', '가상발전소', '에너지커뮤니티',
      '전력선', '변전소', '변압기', '인터커넥터',
      '충전소', '전기차 충전', 'ev 충전',
      '전력거래소', '전력거래', '전기사업', '전력공급',
      '한전', '한국전력', '전력계통',
    ],
    en: [
      'grid', 'power grid', 'transmission', 'distribution',
      'smart grid', 'microgrid', 'virtual power plant', 'vpp',
      'distributed energy', 'der', 'interconnector',
      'substation', 'transformer',
      'ev charging', 'charging station', 'charging infrastructure',
      'utility', 'electricity network', 'power system',
    ],
  },
  {
    id: '운영 최적화',
    ko: [
      'derms', '전력 수요 예측', '수요반응', '수요관리',
      '에너지관리시스템', 'ems', 'bems', 'fems',
      '최적화', '운영효율', '전력거래', '전력 시장',
      '피크 감축', '피크저감', '부하분산', '인공지능', 'ai 예측',
      '디지털전환', '디지털화', 'iot', '빅데이터',
    ],
    en: [
      'derms', 'demand response', 'demand management',
      'energy management system', 'ems',
      'optimization', 'operational efficiency',
      'electricity market', 'power trading',
      'peak reduction', 'load balancing',
      'ai forecast', 'machine learning energy',
      'digital twin', 'iot', 'big data energy',
    ],
  },
  {
    id: '정책·규제',
    ko: [
      '에너지 정책', '법령', '규제', '전력시장 제도',
      'ppa', '전력구매계약', 'rec', '신재생공급의무화',
      '탄소세', '온실가스', '배출권거래', 'ets',
      '보조금', '지원금', '인허가', '입법',
      '산업부', '에너지부', '환경부', '기재부',
      '전기요금', '요금제', '전기사업법',
      '정부 정책', '에너지전환',
      '허가', '승인', '고시', '시행령',
    ],
    en: [
      'energy policy', 'regulation', 'legislation',
      'power purchase agreement', 'ppa', 'renewable portfolio standard', 'rps',
      'carbon tax', 'emissions trading', 'ets', 'carbon credit',
      'subsidy', 'incentive', 'permit',
      'department of energy', 'ministry', 'ira', 'inflation reduction act',
      'electricity tariff', 'feed-in tariff', 'fit',
      'energy transition policy', 'net metering',
    ],
  },
  {
    id: 'ESG·탄소중립',
    ko: [
      '탄소중립', 'net zero', '넷제로', '탄소감축',
      're100', 'esg', '지속가능', '탄소발자국',
      '탄소시장', '탄소배출', '온실가스 감축', 'ndc',
      '기후변화', '기후 위기', '파리협정', 'cop',
      '녹색채권', '그린본드', '지속가능채권',
      '탄소흡수', 'ccus', 'ccs',
      '친환경', '저탄소', '탄소제로',
    ],
    en: [
      'carbon neutral', 'net zero', 'decarbonization',
      're100', 'esg', 'sustainability', 'carbon footprint',
      'carbon market', 'greenhouse gas', 'ghg', 'ndc',
      'climate change', 'climate crisis', 'paris agreement', 'cop',
      'green bond', 'sustainable finance',
      'carbon capture', 'ccus', 'ccs',
      'clean energy', 'low carbon',
    ],
  },
  {
    id: '시장·가격 동향',
    ko: [
      '에너지 가격', '전력 가격', '유가', '가스 가격', 'lng 가격',
      '전력 수급', '수급 전망', '투자 동향', '시장 규모',
      '증설', '설치 용량', '발전 용량',
      '글로벌 시장', '에너지 시장', '전력 시장 동향',
      'ipo', '기업공개', '인수합병', 'm&a', '투자 유치',
      '수출', '수입', '무역', '공급망',
      '수주', '계약', '투자', '펀딩',
    ],
    en: [
      'energy price', 'electricity price', 'oil price', 'gas price', 'lng price',
      'power supply', 'market outlook', 'investment trend', 'market size',
      'capacity addition', 'installed capacity', 'global market',
      'ipo', 'merger', 'acquisition', 'm&a', 'funding', 'investment',
      'export', 'import', 'trade', 'supply chain',
      'contract', 'deal', 'gw', 'mw',
    ],
  },
]

/**
 * 제목+요약 텍스트에서 토픽을 분류
 * @param {string} title
 * @param {string} summary
 * @param {string} lang  - 'ko' | 'en'
 * @returns {string[]}   - TopicId 배열 (최대 2개)
 */
function classifyTopics(title = '', summary = '', lang = 'ko') {
  const text = `${title} ${summary}`.toLowerCase()
  const scores = {}

  for (const rule of TOPIC_RULES) {
    const keywords = lang === 'en'
      ? [...rule.en, ...rule.ko]
      : [...rule.ko, ...rule.en]

    let score = 0
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score++
    }
    if (score > 0) scores[rule.id] = score
  }

  // 점수 내림차순 정렬, 최대 2개 반환
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id)

  return sorted.slice(0, 2)
}

module.exports = { classifyTopics }
