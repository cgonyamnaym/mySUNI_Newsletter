'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Stats {
  total: number
  today: number
  month: number
  daily: { date: string; views: number }[]
  hourly: { hour: string; views: number }[]
}

const VERCEL_FREE_BW_GB = 100

function StatCard({
  label,
  value,
  sub,
  live,
}: {
  label: string
  value: string | number
  sub?: string
  live?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-[rgba(112,115,124,0.16)] p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        )}
        <p className="text-[13px] text-[rgba(55,56,60,0.5)] font-medium">{label}</p>
      </div>
      <p className="text-[28px] font-bold text-[#171719] leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-[12px] text-[rgba(55,56,60,0.4)]">{sub}</p>}
    </div>
  )
}

export default function MonitorPage() {
  const [mounted, setMounted] = useState(false)
  const [concurrent, setConcurrent] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchConcurrent = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/presence')
      const data = await res.json()
      setConcurrent(data.count ?? 0)
      setLastUpdated(new Date())
    } catch {}
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/stats')
      const data = await res.json()
      setStats(data)
    } catch {}
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchConcurrent()
    fetchStats()

    const concurrentInterval = setInterval(fetchConcurrent, 15_000)
    const statsInterval = setInterval(fetchStats, 60_000)

    return () => {
      clearInterval(concurrentInterval)
      clearInterval(statsInterval)
    }
  }, [fetchConcurrent, fetchStats])

  // Estimate bandwidth: rough average ~50KB per page view
  const estimatedBwMB = stats ? Math.round((stats.month * 50) / 1024) : 0
  const bwPercent = Math.min(Math.round((estimatedBwMB / (VERCEL_FREE_BW_GB * 1024)) * 100), 100)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-14 flex items-center px-6 border-b border-[rgba(112,115,124,0.16)] bg-white shrink-0">
        <div>
          <h1 className="text-[16px] font-bold text-[#171719]">트래픽 모니터</h1>
          <p className="text-[12px] text-[rgba(55,56,60,0.4)]">
            실시간 접속자 및 사용량 현황
            {lastUpdated && (
              <span className="ml-2">
                · {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 기준
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="현재 접속자"
            value={concurrent ?? '—'}
            sub="15초마다 갱신"
            live
          />
          <StatCard
            label="오늘 페이지뷰"
            value={stats?.today ?? '—'}
            sub={new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
          />
          <StatCard
            label="이번달 누적"
            value={stats?.month ?? '—'}
            sub={new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
          />
          <StatCard
            label="전체 누적 뷰"
            value={stats?.total ?? '—'}
            sub="서비스 시작 이후"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[rgba(112,115,124,0.16)] p-5">
            <p className="text-[14px] font-semibold text-[#171719] mb-4">오늘 시간대별 페이지뷰</p>
            {mounted ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.hourly ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,115,124,0.1)" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11, fill: 'rgba(55,56,60,0.4)' }}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(55,56,60,0.4)' }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(112,115,124,0.2)' }}
                  />
                  <Bar dataKey="views" name="페이지뷰" fill="#0066FF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <span className="text-[13px] text-[rgba(55,56,60,0.3)]">로딩 중...</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[rgba(112,115,124,0.16)] p-5">
            <p className="text-[14px] font-semibold text-[#171719] mb-4">최근 7일 페이지뷰</p>
            {mounted ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.daily ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(112,115,124,0.1)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'rgba(55,56,60,0.4)' }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(55,56,60,0.4)' }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(112,115,124,0.2)' }}
                  />
                  <Bar dataKey="views" name="페이지뷰" fill="#3385FF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <span className="text-[13px] text-[rgba(55,56,60,0.3)]">로딩 중...</span>
              </div>
            )}
          </div>
        </div>

        {/* Vercel Bandwidth Info */}
        <div className="bg-white rounded-xl border border-[rgba(112,115,124,0.16)] p-5">
          <p className="text-[14px] font-semibold text-[#171719] mb-4">Vercel 대역폭 현황 (이번달 추정)</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[rgba(55,56,60,0.6)]">추정 사용량</span>
              <span className="font-semibold text-[#171719]">
                {estimatedBwMB >= 1024
                  ? `${(estimatedBwMB / 1024).toFixed(1)} GB`
                  : `${estimatedBwMB} MB`}
                <span className="font-normal text-[rgba(55,56,60,0.4)] ml-1">/ {VERCEL_FREE_BW_GB} GB</span>
              </span>
            </div>
            <div className="w-full h-2 bg-[rgba(112,115,124,0.1)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${bwPercent}%`,
                  background: bwPercent > 80 ? '#EF4444' : bwPercent > 50 ? '#F59E0B' : '#0066FF',
                }}
              />
            </div>
            <p className="text-[12px] text-[rgba(55,56,60,0.4)]">
              * 페이지뷰당 평균 50KB 기준 추정치입니다. 실제 사용량은 Vercel 대시보드에서 확인하세요.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-[rgba(112,115,124,0.08)] flex flex-wrap gap-3">
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[rgba(0,102,255,0.08)] text-[#0066FF] hover:bg-[rgba(0,102,255,0.14)] transition-colors"
            >
              Vercel 대시보드 열기 ↗
            </a>
            <div className="flex items-center gap-3 text-[12px] text-[rgba(55,56,60,0.4)]">
              <span>무료 플랜: 100GB/월</span>
              <span>·</span>
              <span>Serverless: 100GB/월</span>
              <span>·</span>
              <span>Edge: 500K req/월</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
