'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[#37383c]">아이디</label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="아이디를 입력하세요"
          required
          className="px-4 py-2.5 rounded-xl border border-[rgba(112,115,124,0.3)] bg-[#F8F9FA] text-[14px] text-[#171719] placeholder-[rgba(55,56,60,0.4)] focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[#37383c]">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="px-4 py-2.5 rounded-xl border border-[rgba(112,115,124,0.3)] bg-[#F8F9FA] text-[14px] text-[#171719] placeholder-[rgba(55,56,60,0.4)] focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors"
        />
      </div>
      {error && (
        <p className="text-[12px] text-red-500 font-medium">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 px-4 py-2.5 font-bold text-[14px] text-white rounded-xl disabled:opacity-50 disabled:cursor-wait transition-colors shadow-sm"
        style={{ background: loading ? '#4D9FFF' : '#0066FF' }}
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="h-full flex items-center justify-center" style={{ background: '#F0F2F5' }}>
      <div className="bg-white rounded-2xl shadow-lg border border-[rgba(112,115,124,0.16)] p-8 w-full max-w-[360px]">
        <div className="text-center mb-2">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: 'rgba(0,102,255,0.08)' }}
          >
            <span
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-black"
              style={{ background: 'linear-gradient(135deg, #0066FF, #3385FF)' }}
            >
              E
            </span>
          </div>
          <h1 className="text-[20px] font-bold text-[#171719]">에너지 인사이트</h1>
          <p className="text-[13px] text-[rgba(55,56,60,0.6)] mt-1">편집자 전용 대시보드</p>
        </div>
        <Suspense fallback={<div className="h-48" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}