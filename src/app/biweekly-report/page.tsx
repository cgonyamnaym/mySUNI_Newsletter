import { getBiweeklyReport, getMetaIndex, getLatestReportId } from '@/lib/data'
import { Header } from '@/components/Header'
import { BiweeklyReport } from '@/components/BiweeklyReport'
import { Footer } from '@/components/Footer'

export const dynamic = 'force-static'

export default async function BiweeklyReportPage() {
  const index = await getMetaIndex()
  const latestId = getLatestReportId(index)
  const report = latestId ? await getBiweeklyReport(latestId) : null

  return (
    <div className="min-h-screen flex flex-col">
      <Header lastUpdated={index.lastUpdated} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {report ? (
          <BiweeklyReport data={report} allReportIds={index.availableReports} />
        ) : (
          <div className="text-center py-20 text-[rgba(55,56,60,0.40)]">
            <p className="text-[16px]">아직 격주 리포트가 없습니다.</p>
            <p className="text-[13px] mt-2">첫 리포트는 격주 크롤링 후 자동 생성됩니다.</p>
          </div>
        )}
      </main>
      <Footer latestReportId={latestId} />
    </div>
  )
}
