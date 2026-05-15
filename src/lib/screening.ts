import { TOPICS } from './constants'
import type { Article } from './types'

// 광범위 에너지 키워드 (TOPICS 외 추가)
const BROAD_KEYWORDS = [
  // 한국어
  '에너지', '전력', '발전소', '전기', '에너지전환', '탄소', '기후변화', '넷제로',
  '충전', '배전', '계통', '신재생', '원전', '태양', '풍력',
  // 영어 (미번역 기사 대응)
  'solar', 'wind', 'battery', 'storage', 'renewable', 'energy', 'power',
  'electricity', 'grid', 'carbon', 'hydrogen', 'nuclear', 'net zero',
  'emission', 'EV', 'clean energy', 'photovoltaic', 'offshore',
]

export interface ScoredArticle extends Article {
  relevanceScore: number
  matchedKeywords: string[]
}

export function screenArticles(articles: Article[], limit = 50): ScoredArticle[] {
  const now = Date.now()

  return articles
    .map((article): ScoredArticle => {
      const text = `${article.title} ${article.titleOriginal ?? ''} ${article.summary}`.toLowerCase()
      let score = 0
      const matchedKeywords: string[] = []

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

      // 최신성 가산 (최근 3일 +5, 7일 +3)
      const days = (now - new Date(article.publishedAt).getTime()) / 86_400_000
      if (days <= 3) score += 5
      else if (days <= 7) score += 3

      return { ...article, relevanceScore: score, matchedKeywords }
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
}

export function getScoreLabel(score: number): { label: string; bg: string; text: string } {
  if (score >= 40) return { label: '연관성 높음', bg: 'rgba(0,191,64,0.12)', text: '#00BF40' }
  if (score >= 20) return { label: '연관성 보통', bg: 'rgba(255,107,0,0.10)', text: '#FF6B00' }
  return { label: '연관성 낮음', bg: 'rgba(112,115,124,0.10)', text: '#70737C' }
}
