import { format, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'

interface HeaderProps {
  lastUpdated: string
  latestReportId?: string
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
            마지막 업데이트: {format(updated, 'MM. dd. HH:mm', { locale: ko })}
          </time>
        )}
      </div>
    </header>
  )
}
