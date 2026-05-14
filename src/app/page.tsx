import Link from 'next/link'
import { getMetaIndex, getLatestDate, getDailyData } from '@/lib/data'
import { Header } from '@/components/Header'
import { CategoryPieChart, DailyTrendChart } from '@/components/DashboardCharts'
import { DailyArticlesFeed } from '@/components/DailyArticlesFeed'
import { Activity, BookOpen, Layers, Rss, ArrowRight } from 'lucide-react'
import type { Article } from '@/lib/types'

export const dynamic = 'force-static'
export const revalidate = false

export default async function HomePage() {
  const index = await getMetaIndex()
  const latestDate = getLatestDate(index)
  const daily = latestDate ? await getDailyData(latestDate) : null

  // 차트용 데이터 가공 (최근 7일 연속된 날짜)
  const trendData = []
  let thisWeekTotal = 0
  const allRecentArticles: Article[] = []

  if (latestDate) {
    const endDate = new Date(latestDate)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate)
      d.setDate(d.getDate() - i)
      // 한국 시간에 맞게 날짜 문자열(YYYY-MM-DD) 추출
      // 간단히 ISOString에서 추출하되 Timezone Offset을 고려
      const offset = d.getTimezoneOffset() * 60000
      const localDate = new Date(d.getTime() - offset)
      const dateStr = localDate.toISOString().split('T')[0]
      
      const data = await getDailyData(dateStr)
      const count = data?.articleCount || 0
      
      trendData.push({ date: dateStr.slice(5), count }) // "04-28"
      thisWeekTotal += count
      if (data?.articles) allRecentArticles.push(...data.articles)
    }
  }

  // 카테고리 분포 가공 (최근 7일 전체 기사 대상)
  const categoryCount: Record<string, number> = {}
  allRecentArticles.forEach(article => {
    article.topics.forEach(topic => {
      categoryCount[topic] = (categoryCount[topic] || 0) + 1
    })
  })
  const categoryData = Object.entries(categoryCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // 상위 5개만

  // 상위 출처 가공
  const sourceCount: Record<string, number> = {}
  allRecentArticles.forEach(a => {
    sourceCount[a.source] = (sourceCount[a.source] || 0) + 1
  })
  const topSources = Object.entries(sourceCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="min-h-screen flex flex-col bg-wds-gray-50">
      <Header lastUpdated={daily?.generatedAt ?? index.lastUpdated} latestReportId={index.availableReports[0]} />
      
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-wds-gray-950 tracking-tight">뉴스레터 성과 대시보드</h1>
            <p className="text-wds-gray-500 mt-1 text-sm font-medium">에너지 산업 최신 트렌드를 모니터링하고 인사이트를 도출합니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/archive" className="px-4 py-2 bg-white border border-wds-gray-200 text-wds-gray-700 rounded-lg text-[13px] font-bold hover:bg-wds-gray-100 transition-colors shadow-wds-xs">
              전체 데이터 보기
            </Link>
            <Link href="/collect" className="px-5 py-2 bg-wds-blue-500 text-white rounded-lg text-[13px] font-bold hover:bg-wds-blue-600 transition-colors shadow-wds-xs flex items-center gap-1.5">
              <span>뉴스레터 생성</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-wds-gray-200 shadow-wds-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-wds-gray-500">오늘 수집된 기사</h3>
              <div className="w-8 h-8 rounded-full bg-wds-blue-50 flex items-center justify-center text-wds-blue-500">
                <BookOpen size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-wds-gray-950">{daily?.articleCount || 0}</span>
              <span className="text-[13px] font-semibold text-wds-gray-400">건</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-wds-gray-200 shadow-wds-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-wds-gray-500">최근 7일 수집량</h3>
              <div className="w-8 h-8 rounded-full bg-[#F0ECFE] flex items-center justify-center text-[#9747FF]">
                <Activity size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-wds-gray-950">{thisWeekTotal}</span>
              <span className="text-[13px] font-semibold text-wds-gray-400">건</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-wds-gray-200 shadow-wds-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-wds-gray-500">누적 수집 기사</h3>
              <div className="w-8 h-8 rounded-full bg-[#E5F7EB] flex items-center justify-center text-[#00BF40]">
                <Layers size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-wds-gray-950">{index.totalArticles.toLocaleString()}</span>
              <span className="text-[13px] font-semibold text-wds-gray-400">건</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-wds-gray-200 shadow-wds-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-wds-gray-500">모니터링 출처</h3>
              <div className="w-8 h-8 rounded-full bg-[#E6F5F8] flex items-center justify-center text-[#0098B2]">
                <Rss size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-wds-gray-950">{Object.keys(sourceCount).length}</span>
              <span className="text-[13px] font-semibold text-wds-gray-400">개 매체</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Trend Chart (Takes 2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-wds-gray-200 shadow-wds-xs flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[16px] font-bold text-wds-gray-950">주간 기사 수집 트렌드</h2>
                <p className="text-[12px] text-wds-gray-400 mt-0.5">최근 7일간의 매체 크롤링 수집 현황</p>
              </div>
            </div>
            <div className="flex-1 min-h-[250px]">
              {trendData.length > 0 ? (
                <DailyTrendChart data={trendData} />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-wds-gray-400">데이터가 없습니다.</div>
              )}
            </div>
          </div>

          {/* Category Pie Chart (Takes 1/3 width) */}
          <div className="bg-white rounded-2xl p-6 border border-wds-gray-200 shadow-wds-xs flex flex-col">
            <div className="mb-2">
              <h2 className="text-[16px] font-bold text-wds-gray-950">카테고리 비중</h2>
              <p className="text-[12px] text-wds-gray-400 mt-0.5">최근 7일 수집 기준</p>
            </div>
            <div className="flex-1 min-h-[200px] relative">
              {categoryData.length > 0 ? (
                <CategoryPieChart data={categoryData} />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-wds-gray-400">데이터가 없습니다.</div>
              )}
              {/* 도넛 중앙 텍스트 */}
              {categoryData.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[24px] font-black text-wds-gray-950 leading-none">{thisWeekTotal}</span>
                  <span className="text-[11px] font-semibold text-wds-gray-400 mt-1">Total</span>
                </div>
              )}
            </div>
            {/* 범례 */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#0066FF', '#3385FF', '#9747FF', '#0098B2', '#00BF40'][i % 5] }}></span>
                  <span className="text-[11px] font-medium text-wds-gray-600">{c.name} ({c.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Lists Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Articles — 날짜 필터 포함 CSR 컴포넌트 */}
          <DailyArticlesFeed
            availableDates={index.availableDates.slice(0, 7)}
            initialDate={latestDate}
            initialArticles={daily?.articles?.slice(0, 5) ?? []}
            initialCount={daily?.articleCount ?? 0}
          />

          {/* Top Sources */}
          <div className="bg-white rounded-2xl p-6 border border-wds-gray-200 shadow-wds-xs">
            <h2 className="text-[16px] font-bold text-wds-gray-950 mb-5">수집 출처 순위 (최근 7일)</h2>
            <div className="flex flex-col">
              {topSources.map((source, idx) => (
                <div key={source.name} className="flex items-center justify-between py-3 border-b border-wds-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="text-[13px] font-black text-wds-gray-400 w-4 text-center">{idx + 1}</div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wds-blue-50 to-wds-gray-100 flex items-center justify-center border border-wds-gray-200">
                      <span className="text-[10px] font-black text-wds-gray-700">{source.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <span className="text-[14px] font-bold text-wds-gray-900">{source.name}</span>
                  </div>
                  <div className="text-[13px] font-bold text-wds-gray-500 tabular-nums bg-wds-gray-50 px-2.5 py-1 rounded-md">
                    {source.count}건
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
