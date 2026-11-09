import type { Article } from './types'

/** 공개 링크 제목을 구성하는 연도·월·회차 */
export interface NewsletterEdition {
  year: number
  month: number
  edition: number
}

/** 회차는 월 기준 1~3 (격주 발행이므로 통상 1~2, 예외적으로 3) */
export const EDITION_OPTIONS = [1, 2, 3]

/** 연도 선택 범위: 기준 연도 ±1 (기본값이 범위 밖이면 함께 포함) */
export function yearOptions(selected: number, now = new Date()): number[] {
  const base = now.getFullYear()
  const years = new Set([base - 1, base, base + 1, selected])
  return Array.from(years).sort((a, b) => a - b)
}

/** `2026년 11월 2회차 Energy Newsletter` 형식으로 조립한다. */
export function buildEditionTitle({ year, month, edition }: NewsletterEdition): string {
  return `${year}년 ${month}월 ${edition}회차 Energy Newsletter`
}

/**
 * 선택된 기사 중 가장 최근 publishedAt을 기준으로 연도·월·회차 기본값을 정한다.
 * 회차는 격주 발행 기준으로 1~15일이면 1회차, 16일 이후면 2회차.
 */
export function defaultEdition(articles: Article[], now = new Date()): NewsletterEdition {
  const dates = articles
    .map((a) => new Date(a.publishedAt))
    .filter((d) => !isNaN(d.getTime()))
  const latest = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : now

  return {
    year: latest.getFullYear(),
    month: latest.getMonth() + 1,
    edition: latest.getDate() <= 15 ? 1 : 2,
  }
}

/**
 * 발행 기사들의 publishedAt 최소~최대값으로 격주 발행 기간(주차 범위) 라벨을 만든다.
 * 제목이 저장되지 않은 기존 발행본(/n/[id])의 헤더 폴백으로만 쓰인다.
 */
export function buildDefaultNewsletterTitle(articles: Article[]): string {
  const publishedDates = articles
    .map((a) => new Date(a.publishedAt))
    .filter((d) => !isNaN(d.getTime()))
  const now = new Date()
  const minDate = publishedDates.length ? new Date(Math.min(...publishedDates.map((d) => d.getTime()))) : now
  const maxDate = publishedDates.length ? new Date(Math.max(...publishedDates.map((d) => d.getTime()))) : now

  const weekOf = (d: Date) => Math.ceil(d.getDate() / 7)
  const sameMonth = minDate.getFullYear() === maxDate.getFullYear() && minDate.getMonth() === maxDate.getMonth()
  const sameWeek = sameMonth && weekOf(minDate) === weekOf(maxDate)
  const sameYear = minDate.getFullYear() === maxDate.getFullYear()

  const rangeLabel = sameWeek
    ? `${maxDate.getFullYear()}년 ${maxDate.getMonth() + 1}월 ${weekOf(maxDate)}주차`
    : sameMonth
      ? `${minDate.getFullYear()}년 ${minDate.getMonth() + 1}월 ${weekOf(minDate)}주차~${weekOf(maxDate)}주차`
      : `${minDate.getFullYear()}년 ${minDate.getMonth() + 1}월 ${weekOf(minDate)}주차~${sameYear ? '' : `${maxDate.getFullYear()}년 `}${maxDate.getMonth() + 1}월 ${weekOf(maxDate)}주차`

  return `${rangeLabel} Energy Newsletter`
}
