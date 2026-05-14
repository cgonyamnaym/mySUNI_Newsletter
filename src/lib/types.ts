export type TopicId =
  | '전력 인프라'
  | '에너지원'
  | '운영 최적화'
  | '정책·규제'
  | 'ESG·탄소중립'
  | '시장·가격 동향'

export interface Article {
  id: string
  source: string
  sourceId: string
  sourceOrigin: 'domestic' | 'global'
  originalLang: string
  isTranslated: boolean
  title: string
  titleOriginal: string | null
  summary: string
  topics: TopicId[]
  publishedAt: string
  originalUrl: string
  collectedAt: string
}

export interface DailyData {
  date: string
  generatedAt: string
  articleCount: number
  articles: Article[]
}

export interface TopIssue {
  rank: number
  title: string
  summary: string
}

export interface KeyPlayer {
  name: string
  summary: string
}

export interface TrendReport {
  headline: string
  topIssues: TopIssue[]
  topicSummaries: Partial<Record<TopicId, string>>
  keyPlayers: KeyPlayer[]
  nextPeriodWatch: string[]
}

export interface BiweeklyData {
  reportId: string
  startDate: string
  endDate: string
  generatedAt: string
  trendReport: TrendReport
}

export interface MetaIndex {
  lastUpdated: string
  availableDates: string[]
  availableReports: string[]
  totalArticles: number
}
