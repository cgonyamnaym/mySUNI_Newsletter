'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Archive, Trash2, Eye } from 'lucide-react'
import { Header } from '@/components/Header'
import { getArchiveEntries, deleteArchiveEntry } from '@/lib/newsletter-archive'
import type { NewsletterArchiveEntry } from '@/lib/newsletter-archive'

function formatDate(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

export default function NewsletterArchivePage() {
  const [entries, setEntries] = useState<NewsletterArchiveEntry[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setEntries(getArchiveEntries())
    setMounted(true)
  }, [])

  function handleDelete(id: string) {
    if (!confirm('이 뉴스레터를 아카이브에서 삭제할까요?')) return
    deleteArchiveEntry(id)
    setEntries(getArchiveEntries())
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-full bg-wds-gray-50">
      <Header lastUpdated="" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Archive size={22} className="text-wds-blue-500" />
          <h1 className="text-2xl font-bold text-wds-gray-950">뉴스레터 아카이브</h1>
        </div>

        {entries.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-wds-gray-200 shadow-sm">
            <Archive size={36} className="text-wds-gray-300 mx-auto mb-4" />
            <p className="text-[15px] font-semibold text-wds-gray-500 mb-1">저장된 뉴스레터가 없습니다.</p>
            <p className="text-[13px] text-wds-gray-400 mb-6">뉴스레터 미리보기에서 <strong>확정</strong> 버튼을 눌러 저장하세요.</p>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-wds-blue-500 text-white font-bold rounded-xl hover:bg-wds-blue-600 transition-colors shadow-sm text-[13px]"
            >
              뉴스레터 생성하기
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry, idx) => {
              const { date, time } = formatDate(entry.confirmedAt)
              return (
                <li
                  key={entry.id}
                  className="bg-white rounded-2xl border border-wds-gray-200 shadow-sm px-6 py-5 flex items-center justify-between gap-4 hover:border-wds-gray-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* 순번 */}
                    <span className="text-[13px] font-bold text-wds-gray-300 tabular-nums shrink-0 w-6 text-right">
                      #{entries.length - idx}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-wds-gray-950 truncate">
                        {date}
                      </p>
                      <p className="text-[12px] text-wds-gray-400 mt-0.5">
                        {time} 확정&nbsp;·&nbsp;
                        <span className="font-semibold text-wds-blue-500">{entry.articleCount}건</span> 기사 포함
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/newsletter-archive/${entry.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold bg-wds-gray-100 text-wds-gray-700 hover:bg-wds-gray-200 transition-colors"
                    >
                      <Eye size={14} />
                      보기
                    </Link>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold text-wds-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
