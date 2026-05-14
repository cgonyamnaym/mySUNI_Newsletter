import Link from 'next/link'
import { groupByPeriod, formatPeriodLabel, getPeriodEnd } from '@/lib/biweek'

interface ArchiveListProps {
  dates: string[]
}

/** period 시작일들을 연-월 기준으로 그룹화 */
function groupByMonth(periods: string[]): Record<string, string[]> {
  return periods.reduce<Record<string, string[]>>((acc, ps) => {
    const month = ps.slice(0, 7)
    if (!acc[month]) acc[month] = []
    acc[month].push(ps)
    return acc
  }, {})
}

export function ArchiveList({ dates }: ArchiveListProps) {
  const byPeriod  = groupByPeriod(dates)            // { periodStart: dates[] }
  const periodStarts = Object.keys(byPeriod).sort().reverse()
  const byMonth = groupByMonth(periodStarts)

  return (
    <div className="space-y-8">
      {Object.entries(byMonth).map(([month, periods]) => {
        const [year, mon] = month.split('-')
        return (
          <section key={month}>
            <h2 className="text-[13px] font-bold text-[rgba(55,56,60,0.40)] tracking-widest uppercase mb-3 pb-2 border-b border-[rgba(112,115,124,0.16)]">
              {year}년 {parseInt(mon, 10)}월
            </h2>
            <ul className="space-y-2">
              {periods.map((ps) => {
                const articleCount = byPeriod[ps].length
                const label = formatPeriodLabel(ps)
                const endDate = getPeriodEnd(ps)
                return (
                  <li key={ps}>
                    <Link
                      href={`/archive/${ps}`}
                      className="flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-[rgba(112,115,124,0.16)] hover:border-[#0066FF] hover:shadow-sm transition-all group"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-bold text-[rgba(23,23,25,0.88)] group-hover:text-[#0066FF] transition-colors">
                          {label}
                        </span>
                        <span className="text-[12px] text-[rgba(55,56,60,0.45)]">
                          {ps} ~ {endDate} · 수집일 {articleCount}일
                        </span>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[rgba(112,115,124,0.30)] group-hover:text-[#0066FF] transition-colors shrink-0">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
