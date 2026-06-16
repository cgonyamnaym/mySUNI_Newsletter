/** @type {import('next').NextConfig} */
const nextConfig = {
  // STATIC_EXPORT=1 환경변수가 있을 때만 정적 내보내기 (Vercel 환경변수로 설정)
  // npm run dev 에서는 설정 없이 실행 → API 라우트(/api/summarize) 정상 작동
  ...(process.env.STATIC_EXPORT === '1' && { output: 'export' }),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
