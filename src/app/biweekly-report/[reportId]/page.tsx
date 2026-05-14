import { getBiweeklyReport, getMetaIndex } from '@/lib/data'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { BiweeklyReport } from '@/components/BiweeklyReport'
import { Footer } from '@/components/Footer'
import Link from 'next/link'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  const index = await getMetaIndex()
  return index.availableReports.map((reportId) => ({ reportId }))
}

export default async function BiweeklyReportDetailPage({
  params,
}: {
  params: { reportId: string }
}) {
  const [report, index] = await Promise.all([
    getBiweeklyReport(params.reportId),
    getMetaIndex(),
  ])

  if (!report) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <Header lastUpdated={index.lastUpdated} latestReportId={index.availableReports[0]} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <BiweeklyReport data={report} allReportIds={index.availableReports} />
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-[13px] text-[rgba(55,56,60,0.61)] hover:text-[#0066FF] transition-colors"
          >
            ← 메인으로 돌아가기
          </Link>
        </div>
      </main>
      <Footer latestReportId={index.availableReports[0]} />
    </div>
  )
}
