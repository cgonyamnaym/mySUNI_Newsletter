'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { TOPICS } from '@/lib/constants'

export function TopicFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeTopic = searchParams.get('topic') ?? 'all'

  const setTopic = (topicId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (topicId === 'all') {
      params.delete('topic')
    } else {
      params.set('topic', topicId)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <nav className="mb-6 overflow-x-auto -mx-4 px-4">
      <div className="flex gap-2 min-w-max pb-1">
        {/* 전체 chip */}
        <button
          onClick={() => setTopic('all')}
          className={`px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeTopic === 'all'
              ? 'bg-wds-gray-950 text-white'
              : 'bg-white border border-[rgba(112,115,124,0.22)] text-[rgba(46,47,51,0.88)] hover:border-[rgba(112,115,124,0.40)] hover:text-[#171719]'
          }`}
        >
          전체
        </button>

        {/* Topic chips */}
        {TOPICS.map((topic) => {
          const isActive = activeTopic === topic.id
          return (
            <button
              key={topic.id}
              onClick={() => setTopic(topic.id)}
              style={
                isActive
                  ? { backgroundColor: topic.chipBg, color: topic.chipText, borderColor: topic.chipText }
                  : {}
              }
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors border ${
                isActive
                  ? 'border-current'
                  : 'bg-white border-[rgba(112,115,124,0.22)] text-[rgba(46,47,51,0.88)] hover:border-[#0066FF] hover:text-[#0066FF]'
              }`}
            >
              {isActive && (
                <span
                  style={{ backgroundColor: topic.dotColor }}
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                />
              )}
              {topic.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
