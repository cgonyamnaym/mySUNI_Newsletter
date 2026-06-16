import type { TopicId } from './types'

export interface TopicConfig {
  id: TopicId
  label: string
  keywords: string[]
  chipBg: string
  chipText: string
  dotColor: string
}

export const TOPICS: TopicConfig[] = [
  {
    id: '전력 인프라',
    label: '전력 인프라',
    keywords: [
      '계통', '송배전', '스마트그리드', '전력망 확충', '분산자원', 'VPP',
      '송전', '배전', '그리드', 'HVDC', '전력망',
      'AI DC', 'AI 데이터센터', 'UPS', '슈퍼커패시터', 'supercapacitor',
    ],
    chipBg:   '#EAF2FE',
    chipText: '#0066FF',
    dotColor: '#0066FF',
  },
  {
    id: '에너지원',
    label: '에너지원',
    keywords: [
      'ESS', '에너지저장', '원자력', '연료전지', '원전', 'SMR',
      '태양광', '풍력', '수소', '바이오에너지', '재생에너지',
      '신재생', '그린수소', 'AI데이터센터 전력 공급',
      '지열', 'geothermal energy', 'CCUS',
    ],
    chipBg:   '#F0ECFE',
    chipText: '#9747FF',
    dotColor: '#9747FF',
  },
  {
    id: '운영 최적화',
    label: '운영 최적화',
    keywords: [
      'DERMS', '전력 수요 예측', '전력', 'VPP 운영',
      '전력수급', '수급 균형', 'EMS', 'BEMS', 'FEMS',
      '수요반응', 'DR', 'O&M', '전력 최적화', '부하 예측',
      '에너지 효율', '디지털트윈',
    ],
    chipBg:   'rgba(0,152,178,0.08)',
    chipText: '#0098B2',
    dotColor: '#0098B2',
  },
  {
    id: '정책·규제',
    label: '정책·규제',
    keywords: [
      '국내외 에너지 정책', '법령', '규제 변화', '전력 시장 제도', 'PPA',
      '정책', '규제', '법안', '지침', '고시', '의무화', '전기사업법', 'RPS',
    ],
    chipBg:   'rgba(112,115,124,0.08)',
    chipText: '#37383C',
    dotColor: '#70737C',
  },
  {
    id: 'ESG·탄소중립',
    label: 'ESG·탄소중립',
    keywords: [
      '탄소중립', 'RE100', '탄소시장', 'ESG 공시', 'NDC',
      'EU택소노미', '탄소세', '배출권', 'CFE', '탄소배출권거래제',
      'ETS', '넷제로', '온실가스', '탄소발자국', 'CBAM',
      'carbon footprint', 'decarbonization', 'carbon neutral', 'GHG',
      'net zero', 'green bond',
    ],
    chipBg:   'rgba(0,191,64,0.08)',
    chipText: '#00BF40',
    dotColor: '#00BF40',
  },
  {
    id: '시장·가격 동향',
    label: '시장·가격 동향',
    keywords: [
      '에너지 가격', '수급', '투자 동향',
      '전력 가격', '전기요금', '전력 도매 가격', 'SMP', 'REC 가격',
      '원자재', 'LNG 가격', '투자', 'M&A', '시장동향', '수주', 'IPO',
      'electricity price', 'power market', 'energy market',
    ],
    chipBg:   'rgba(255,66,66,0.08)',
    chipText: '#FF4242',
    dotColor: '#FF4242',
  },
]

export const TOPIC_MAP = Object.fromEntries(
  TOPICS.map((t) => [t.id, t])
) as Record<TopicId, TopicConfig>
