'use client'

import { Suspense, useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

function SearchBarInner() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const router = useRouter()
  const pathname = usePathname()

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const params = new URLSearchParams(searchParams.toString())
      if (query.trim().length >= 2) {
        params.set('q', query.trim())
      } else {
        params.delete('q')
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [query, router, pathname, searchParams]
  )

  const handleClear = () => {
    setQuery('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full sm:w-60">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <img src="/icons/search.svg" alt="" width={16} height={16} style={{ opacity: 0.35 }} />
      </span>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="뉴스 검색..."
        className="w-full rounded-md pl-9 pr-8 py-[7px] text-[13px] bg-[rgba(112,115,124,0.05)] border border-[rgba(112,115,124,0.16)] text-[#171719] placeholder:text-[rgba(55,56,60,0.28)] focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[rgba(0,102,255,0.12)] focus:bg-white transition-all"
      />

      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgba(55,56,60,0.40)] hover:text-[rgba(55,56,60,0.88)] transition-colors"
          aria-label="검색어 지우기"
        >
          <img src="/icons/close.svg" alt="" width={14} height={14} />
        </button>
      )}
    </form>
  )
}

export function SearchBar() {
  return (
    <Suspense fallback={
      <div className="relative w-full sm:w-60">
        <input
          type="search"
          placeholder="뉴스 검색..."
          disabled
          className="w-full rounded-md pl-9 pr-8 py-[7px] text-[13px] bg-[rgba(112,115,124,0.05)] border border-[rgba(112,115,124,0.16)] text-[#171719] placeholder:text-[rgba(55,56,60,0.28)]"
        />
      </div>
    }>
      <SearchBarInner />
    </Suspense>
  )
}
