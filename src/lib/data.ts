import type { DailyData, BiweeklyData, MetaIndex, Article } from './types'
import { getDatesInPeriod } from './biweek'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data')

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return null
  }
}

export async function getMetaIndex(): Promise<MetaIndex> {
  const data = readJson<MetaIndex>(path.join(DATA_DIR, 'index.json'))
  return data ?? { lastUpdated: '', availableDates: [], availableReports: [], totalArticles: 0 }
}

export async function getDailyData(date: string): Promise<DailyData | null> {
  return readJson<DailyData>(path.join(DATA_DIR, 'daily', `${date}.json`))
}

export async function getBiweeklyReport(reportId: string): Promise<BiweeklyData | null> {
  if (!reportId) return null
  return readJson<BiweeklyData>(path.join(DATA_DIR, 'biweekly', `${reportId}.json`))
}

/** 2주 기간의 기사를 모두 불러와 id 기준 중복 제거 후 반환 */
export async function getPeriodArticles(periodStart: string, availableDates: string[]): Promise<Article[]> {
  const dates = getDatesInPeriod(periodStart, availableDates)
  const dailyArr = await Promise.all(dates.map((d) => getDailyData(d)))
  const seen = new Set<string>()
  return dailyArr
    .flatMap((d) => d?.articles ?? [])
    .filter((a) => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

export function getLatestDate(index: MetaIndex): string {
  return index.availableDates[0] ?? ''
}

export function getLatestReportId(index: MetaIndex): string {
  return index.availableReports[0] ?? ''
}
