/**
 * 2주 단위 기간 유틸
 * - 1일~15일 / 16일~말일 두 구간으로 분할
 */

/** "2026-04-28" → "2026-04-16" (기간 시작일) */
export function getPeriodStart(date: string): string {
  const day = parseInt(date.slice(8, 10), 10)
  return day <= 15 ? date.slice(0, 8) + '01' : date.slice(0, 8) + '16'
}

/** "2026-04-16" → "2026-04-30" (기간 종료일) */
export function getPeriodEnd(periodStart: string): string {
  const year  = parseInt(periodStart.slice(0, 4), 10)
  const month = parseInt(periodStart.slice(5, 7), 10)
  const day   = parseInt(periodStart.slice(8, 10), 10)
  if (day === 1) return periodStart.slice(0, 8) + '15'
  const lastDay = new Date(year, month, 0).getDate() // month 번째 달의 마지막 날
  return periodStart.slice(0, 8) + String(lastDay).padStart(2, '0')
}

/** 날짜 배열 → { periodStart: dates[] } */
export function groupByPeriod(dates: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const date of dates) {
    const ps = getPeriodStart(date)
    if (!result[ps]) result[ps] = []
    result[ps].push(date)
  }
  return result
}

/** periodStart 기준으로 해당 2주 안에 있는 날짜만 필터 */
export function getDatesInPeriod(periodStart: string, availableDates: string[]): string[] {
  const end = getPeriodEnd(periodStart)
  return availableDates.filter((d) => d >= periodStart && d <= end)
}

/** "2026-04-16" → "2026년 4월 16일 ~ 30일" */
export function formatPeriodLabel(periodStart: string): string {
  const year  = parseInt(periodStart.slice(0, 4), 10)
  const month = parseInt(periodStart.slice(5, 7), 10)
  const startDay = parseInt(periodStart.slice(8, 10), 10)
  const endDay   = parseInt(getPeriodEnd(periodStart).slice(8, 10), 10)
  return `${year}년 ${month}월 ${startDay}일 ~ ${endDay}일`
}
