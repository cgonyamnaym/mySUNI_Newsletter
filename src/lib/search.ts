import Fuse from 'fuse.js'
import type { Article } from './types'

let fuseInstance: Fuse<Article> | null = null

export function initSearch(articles: Article[]): void {
  fuseInstance = new Fuse(articles, {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'summary', weight: 0.3 },
    ],
    threshold: 0.4,
    minMatchCharLength: 2,
  })
}

export function search(query: string, articles: Article[]): Article[] {
  if (!query || query.length < 2) return articles

  if (!fuseInstance) initSearch(articles)

  return fuseInstance!.search(query).map((r) => r.item)
}
