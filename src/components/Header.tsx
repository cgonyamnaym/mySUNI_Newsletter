import { isValid } from 'date-fns'

interface HeaderProps {
  lastUpdated: string
  latestReportId?: string
}

function formatKST(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const m: Record<string, string> = {}
  for (const p of parts) m[p.type] = p.value
  return `${m.month}. ${m.day}. ${m.hour}:${m.minute}`
}

export function Header({ lastUpdated }: HeaderProps) {
  const updated = new Date(lastUpdated)
  const hasDate = lastUpdated && isValid(updated)

  return (
    <header className="bg-white border-b border-wds-gray-200 sticky top-0 z-10">
      <div className="w-full px-6 h-14 flex items-center justify-end">
        {hasDate && (
          <time
            dateTime={lastUpdated}
            className="text-[13px] font-medium text-wds-gray-500 tabular-nums flex items-center gap-1.5 bg-wds-gray-50 px-3 py-1.5 rounded-lg border border-wds-gray-200"
          >
            <span className="w-2 h-2 rounded-full bg-wds-green-500"></span>
            마지막 업데이트: {formatKST(lastUpdated)}
          </time>
        )}
      </div>
    </header>
  )
}
