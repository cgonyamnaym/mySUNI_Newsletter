import { getMetaIndex } from '@/lib/data'
import { Header } from '@/components/Header'
import { ArchiveList } from '@/components/ArchiveList'
import { Footer } from '@/components/Footer'

export const dynamic = 'force-static'

export default async function ArchivePage() {
  const index = await getMetaIndex()

  return (
    <div className="flex flex-col h-full bg-wds-gray-50 relative">
      <Header lastUpdated={index.lastUpdated} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-8">
        <div className="mb-6 pb-4 border-b border-wds-gray-200">
          <h1 className="text-2xl font-bold text-wds-gray-950">뉴스레터 아카이브</h1>
          <p className="text-sm text-wds-gray-500 mt-2">과거에 수집된 날짜별 기사 전체 목록을 확인할 수 있습니다.</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-wds-gray-200 shadow-wds-sm">
          <ArchiveList dates={index.availableDates} />
        </div>
      </main>
    </div>
  )
}
