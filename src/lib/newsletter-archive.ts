import type { Article } from './types'

const ARCHIVE_KEY = 'newsletter-archive'

export interface NewsletterArchiveEntry {
  id: string
  confirmedAt: string
  articleCount: number
  articles: Article[]
}

export function getArchiveEntries(): NewsletterArchiveEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    if (!raw) return []
    const entries = JSON.parse(raw) as NewsletterArchiveEntry[]
    return entries.sort((a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime())
  } catch {
    return []
  }
}

export function saveArchiveEntry(articles: Article[]): NewsletterArchiveEntry {
  const entry: NewsletterArchiveEntry = {
    id: Date.now().toString(),
    confirmedAt: new Date().toISOString(),
    articleCount: articles.length,
    articles,
  }
  const entries = getArchiveEntries()
  entries.unshift(entry)
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // 가장 오래된 항목 1개 제거 후 재시도
      const trimmed = entries.slice(0, entries.length - 1)
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(trimmed))
    } else {
      throw e
    }
  }
  return entry
}

export function deleteArchiveEntry(id: string): void {
  const entries = getArchiveEntries().filter((e) => e.id !== id)
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries))
  } catch {
    // 삭제 중 오류는 무시 (용량 문제 아님)
  }
}

export function getArchiveEntry(id: string): NewsletterArchiveEntry | null {
  return getArchiveEntries().find((e) => e.id === id) ?? null
}
