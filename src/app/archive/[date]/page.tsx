import { getPeriodArticles, getMetaIndex } from '@/lib/data'
import { groupByPeriod, formatPeriodLabel, getPeriodEnd } from '@/lib/biweek'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { TopicFilter } from '@/components/TopicFilter'
import { NewsGrid } from '@/components/NewsGrid'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  const index = await getMetaIndex()
  const byPeriod = groupByPeriod(index.availableDates)
  return Object.keys(byPeriod).map((periodStart) => ({ date: periodStart }))
}

export default async function ArchivePeriodPage({ params }: { params: { date: string } }) {
  const index = await getMetaIndex()
  const byPeriod = groupByPeriod(index.availableDates)
  const periodStarts = Object.keys(byPeriod).sort().reverse()

  const periodStart = params.date
  const articles = await getPeriodArticles(periodStart, index.availableDates)

  const currentIdx = periodStarts.indexOf(periodStart)
  const prevPeriod = currentIdx < periodStarts.length - 1 ? periodStarts[currentIdx + 1] : null
  const nextPeriod = currentIdx > 0 ? periodStarts[currentIdx - 1] : null

  const label   = formatPeriodLabel(periodStart)
  const endDate = getPeriodEnd(periodStart)

  return (
    <div className="flex flex-col h-full bg-wds-gray-50 relative">
      <Header lastUpdated={index.lastUpdated} latestReportId={index.availableReports[0]} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">

        {/* 기간 네비게이션 */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-wds-gray-200 shadow-wds-xs">
          <div>
            {prevPeriod ? (
              <Link
                href={`/archive/${prevPeriod}`}
                className="flex items-center gap-1 text-[13px] font-bold text-wds-gray-500 hover:text-wds-blue-500 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                {formatPeriodLabel(prevPeriod)}
              </Link>
            ) : (
              <span className="text-[13px] font-bold text-wds-gray-300">이전 기간 없음</span>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-[18px] font-bold text-wds-gray-950">{label}</h1>
            <p className="text-[13px] text-wds-gray-500 mt-0.5">
              {periodStart} ~ {endDate} &nbsp;·&nbsp; 총 {articles.length}건
            </p>
          </div>

          <div>
            {nextPeriod ? (
              <Link
                href={`/archive/${nextPeriod}`}
                className="flex items-center gap-1 text-[13px] font-bold text-wds-gray-500 hover:text-wds-blue-500 transition-colors"
              >
                {formatPeriodLabel(nextPeriod)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ) : (
              <span className="text-[13px] font-bold text-wds-gray-300">다음 기간 없음</span>
            )}
          </div>
        </div>

        <TopicFilter />
        <div className="mt-4">
          <NewsGrid articles={articles} />
        </div>
      </main>
    </div>
  )
}
