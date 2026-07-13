import type { Article } from './types'
import type { NewsletterMeta, PublishedNewsletter } from '@/app/api/newsletter/publish/route'

export type NewsletterArchiveEntry = PublishedNewsletter

export interface SavedNewsletterMeta {
  id: string
  url: string
  confirmedAt: string
  articleCount: number
  title: string
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(path, init)
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

// 확정된 뉴스레터 목록 (메타데이터만, Redis newsletter:index 기반)
export async function getArchiveEntries(): Promise<NewsletterMeta[]> {
  const data = await fetchJson<{ entries: NewsletterMeta[] }>('/api/newsletter/archive')
  return data?.entries ?? []
}

// 최근 아카이브 기사 전체 (수요 키워드 분석용)
export async function getArchiveArticles(): Promise<Article[]> {
  const data = await fetchJson<{ articles: Article[] }>('/api/newsletter/archive?articles=1')
  return data?.articles ?? []
}

export async function saveArchiveEntry(articles: Article[]): Promise<SavedNewsletterMeta | null> {
  return fetchJson<SavedNewsletterMeta>('/api/newsletter/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles }),
  })
}

export async function deleteArchiveEntry(id: string): Promise<void> {
  await fetch(`/api/newsletter/archive/${id}`, { method: 'DELETE' })
}

export async function getArchiveEntry(id: string): Promise<NewsletterArchiveEntry | null> {
  return fetchJson<NewsletterArchiveEntry>(`/api/newsletter/archive/${id}`)
}