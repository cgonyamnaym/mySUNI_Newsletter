'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Sidebar() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: '홈' },
    { href: '/collect', label: '기사 선택 및 수집' },
    { href: '/generate', label: '뉴스레터 생성' },
    { href: '/newsletter-archive', label: '뉴스레터 아카이브' },
    { href: '/archive', label: '과거 아카이브' },
  ]

  return (
    <aside className="w-64 bg-white border-r border-[rgba(112,115,124,0.16)] flex flex-col h-full shrink-0">
      <div className="h-14 flex items-center px-6 border-b border-[rgba(112,115,124,0.16)]">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-black"
            style={{ background: 'linear-gradient(135deg, #0066FF, #3385FF)' }}
          >
            E
          </span>
          <p className="text-[15px] font-bold tracking-tight text-[#171719] group-hover:text-[#0066FF] transition-colors">
            에너지 인사이트
          </p>
        </Link>
      </div>
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        {links.map((link) => {
          // /screening은 /collect의 하위 플로우이므로 collect를 활성으로 표시
        const effectivePath = pathname.startsWith('/screening') ? '/collect' : pathname
        const active = effectivePath === link.href || (link.href !== '/' && effectivePath.startsWith(link.href))
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2.5 rounded-lg text-[14px] font-semibold transition-colors ${
                active
                  ? 'bg-[rgba(0,102,255,0.08)] text-[#0066FF]'
                  : 'text-[rgba(55,56,60,0.61)] hover:bg-[rgba(112,115,124,0.05)] hover:text-[#171719]'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-[rgba(112,115,124,0.16)]">
        <p className="text-[12px] text-[rgba(55,56,60,0.40)]">© 2026 Energy Insight</p>
      </div>
    </aside>
  )
}
