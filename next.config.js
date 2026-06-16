/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    // Vercel 서버리스 번들에 scripts/ 디렉터리 포함
    // → /api/summarize에서 require(path.join(process.cwd(), 'scripts/...')) 사용 가능
    outputFileTracingIncludes: {
      '/api/summarize': ['./scripts/**/*'],
    },
  },
}

module.exports = nextConfig
