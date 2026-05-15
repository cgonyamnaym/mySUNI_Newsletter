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
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries))
  return entry
}

export function deleteArchiveEntry(id: string): void {
  const entries = getArchiveEntries().filter((e) => e.id !== id)
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries))
}

export function getArchiveEntry(id: string): NewsletterArchiveEntry | null {
  return getArchiveEntries().find((e) => e.id === id) ?? null
}
