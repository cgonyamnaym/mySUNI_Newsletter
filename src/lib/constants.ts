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
    keywords: ['계통', '송배전', '스마트그리드', '전력망 확충', '분산자원', 'VPP'],
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
    ],
    chipBg:   '#F0ECFE',
    chipText: '#9747FF',
    dotColor: '#9747FF',
  },
  {
    id: '운영 최적화',
    label: '운영 최적화',
    keywords: ['DERMS', '전력 수요 예측', '전력', 'VPP 운영'],
    chipBg:   'rgba(0,152,178,0.08)',
    chipText: '#0098B2',
    dotColor: '#0098B2',
  },
  {
    id: '정책·규제',
    label: '정책·규제',
    keywords: ['국내외 에너지 정책', '법령', '규제 변화', '전력 시장 제도', 'PPA'],
    chipBg:   'rgba(112,115,124,0.08)',
    chipText: '#37383C',
    dotColor: '#70737C',
  },
  {
    id: 'ESG·탄소중립',
    label: 'ESG·탄소중립',
    keywords: ['탄소중립', 'RE100', '탄소시장', 'ESG 공시', 'NDC'],
    chipBg:   'rgba(0,191,64,0.08)',
    chipText: '#00BF40',
    dotColor: '#00BF40',
  },
  {
    id: '시장·가격 동향',
    label: '시장·가격 동향',
    keywords: ['에너지 가격', '수급', '투자 동향'],
    chipBg:   'rgba(255,66,66,0.08)',
    chipText: '#FF4242',
    dotColor: '#FF4242',
  },
]

export const TOPIC_MAP = Object.fromEntries(
  TOPICS.map((t) => [t.id, t])
) as Record<TopicId, TopicConfig>
