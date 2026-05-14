import Link from 'next/link'

interface FooterProps {
  latestReportId?: string
}

export function Footer({ latestReportId }: FooterProps) {
  return (
    <footer className="bg-white border-t border-[rgba(112,115,124,0.16)] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[12px] text-[rgba(55,56,60,0.40)] tracking-wide">
          © {new Date().getFullYear()} 에너지 인사이트 &nbsp;·&nbsp; 매일 오전 9시 자동 갱신
        </p>
        <nav className="flex items-center gap-0.5">
          <Link
            href="/collect"
            className="px-3 py-1.5 rounded-md text-[12px] font-medium text-[rgba(55,56,60,0.61)] hover:bg-[rgba(112,115,124,0.06)] hover:text-[#171719] transition-colors"
          >
            뉴스레터 생성
          </Link>
          <span className="text-[rgba(112,115,124,0.28)] text-xs select-none">·</span>
          <Link
            href="/archive"
            className="px-3 py-1.5 rounded-md text-[12px] font-medium text-[rgba(55,56,60,0.61)] hover:bg-[rgba(112,115,124,0.06)] hover:text-[#171719] transition-colors"
          >
            아카이브
          </Link>
          {latestReportId && (
            <>
              <span className="text-[rgba(112,115,124,0.28)] text-xs select-none">·</span>
              <Link
                href={`/biweekly-report/${latestReportId}`}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium text-[rgba(55,56,60,0.61)] hover:bg-[rgba(112,115,124,0.06)] hover:text-[#171719] transition-colors"
              >
                격주 리포트
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  )
}
