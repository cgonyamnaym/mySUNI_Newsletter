import type { BiweeklyData } from '@/lib/types'
import { TOPICS } from '@/lib/constants'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface BiweeklyReportProps {
  data: BiweeklyData
  allReportIds: string[]
}

export function BiweeklyReport({ data, allReportIds }: BiweeklyReportProps) {
  const { trendReport, startDate, endDate, reportId } = data
  const start = format(new Date(startDate), 'MM. dd.', { locale: ko })
  const end = format(new Date(endDate), 'MM. dd.', { locale: ko })

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-[12px] text-[rgba(55,56,60,0.40)] tracking-widest uppercase mb-2">
          Bi-weekly Energy Trend Report
        </p>
        <h1 className="text-[24px] font-bold tracking-[-0.023em] text-[#000] leading-tight">
          {start} – {end}
        </h1>
        <p className="mt-3 text-[15px] font-semibold text-[rgba(46,47,51,0.88)] leading-[1.5] border-l-[3px] border-wds-gray-950 pl-3.5">
          {trendReport.headline}
        </p>
      </div>

      {/* 핵심 이슈 Top 5 */}
      <section>
        <h2 className="text-[18px] font-bold tracking-snug text-[#000] mb-4 pb-2.5 border-b-[3px] border-[#000] inline-block">
          핵심 이슈 Top 5
        </h2>
        <ol className="space-y-3 mt-4">
          {trendReport.topIssues.map((issue) => (
            <li
              key={issue.rank}
              className="flex gap-4 bg-white rounded-lg border border-[rgba(112,115,124,0.16)] p-4 hover:shadow-[0_2px_6px_rgba(23,23,23,0.07)] transition-shadow"
            >
              <span className="text-[22px] font-black text-[#0066FF] leading-none w-7 shrink-0 mt-0.5">
                {issue.rank}
              </span>
              <div>
                <p className="text-[14px] font-bold tracking-[-0.010em] text-[#000]">
                  {issue.title}
                </p>
                <p className="text-[13px] text-[rgba(55,56,60,0.61)] mt-1.5 leading-[1.54]">
                  {issue.summary}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 토픽별 동향 */}
      <section>
        <h2 className="text-[18px] font-bold tracking-snug text-[#000] mb-4 pb-2.5 border-b-[3px] border-[#000] inline-block">
          토픽별 동향 요약
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {TOPICS.map((topic) => {
            const summary = trendReport.topicSummaries[topic.id]
            if (!summary) return null
            return (
              <div
                key={topic.id}
                className="bg-white rounded-lg border border-[rgba(112,115,124,0.16)] p-4"
              >
                <p
                  className="text-[12px] font-semibold tracking-wider mb-2"
                  style={{ color: topic.chipText }}
                >
                  <span
                    style={{ backgroundColor: topic.dotColor }}
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                  />
                  {topic.label}
                </p>
                <p className="text-[13px] text-[rgba(55,56,60,0.61)] leading-[1.54]">
                  {summary}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 주목할 기업·기관 */}
      {trendReport.keyPlayers.length > 0 && (
        <section>
          <h2 className="text-[18px] font-bold tracking-snug text-[#000] mb-4 pb-2.5 border-b-[3px] border-[#000] inline-block">
            주목할 기업·기관
          </h2>
          <ul className="space-y-2 mt-4">
            {trendReport.keyPlayers.map((player, i) => (
              <li
                key={i}
                className="bg-white rounded-lg border border-[rgba(112,115,124,0.16)] px-4 py-3 text-[13px]"
              >
                <span className="font-bold text-[#000]">{player.name}</span>
                <span className="text-[rgba(55,56,60,0.61)]"> — {player.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 다음 기간 주목 이슈 */}
      {trendReport.nextPeriodWatch.length > 0 && (
        <section>
          <h2 className="text-[18px] font-bold tracking-snug text-[#000] mb-4 pb-2.5 border-b-[3px] border-[#000] inline-block">
            다음 2주 주목 이슈
          </h2>
          <ul className="space-y-2 mt-4">
            {trendReport.nextPeriodWatch.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[14px] text-[rgba(46,47,51,0.88)]"
              >
                <span className="text-[#0066FF] font-bold shrink-0 mt-0.5">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 과거 리포트 */}
      <section className="pt-6 border-t border-[rgba(112,115,124,0.16)]">
        <p className="text-[12px] text-[rgba(55,56,60,0.40)] tracking-wider mb-3">과거 리포트</p>
        <div className="flex flex-wrap gap-2">
          {allReportIds.map((id) => (
            <Link
              key={id}
              href={`/biweekly-report/${id}`}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                id === reportId
                  ? 'bg-[#0066FF] text-white border-[#0066FF]'
                  : 'bg-white text-[rgba(55,56,60,0.61)] border-[rgba(112,115,124,0.22)] hover:border-[#0066FF] hover:text-[#0066FF]'
              }`}
            >
              {id}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
