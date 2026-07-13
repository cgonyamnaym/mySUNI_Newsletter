/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    // Vercel 서버리스 번들에 scripts/ 디렉터리 포함
    // → /api/summarize에서 require(path.join(process.cwd(), 'scripts/...')) 사용 가능
    //
    // scripts/*.js는 eval('require')로 로드되어 webpack 정적 분석 및 Next.js
    // 파일 트레이서(@vercel/nft) 양쪽 모두를 우회한다. 그 결과 scripts/ 자체는
    // 아래 글롭으로 포함되지만, scripts/가 require()하는 npm 패키지(cheerio,
    // @google/generative-ai)의 전이 의존성은 트레이싱되지 않아 Vercel 배포본에서
    // "Cannot find module 'cheerio'" 런타임 오류로 요약 생성이 항상 실패했다.
    // → cheerio·@google/generative-ai의 전체 의존성 트리를 명시적으로 포함.
    outputFileTracingIncludes: {
      '/api/summarize': [
        './scripts/**/*',
        './node_modules/cheerio/**/*',
        './node_modules/cheerio-select/**/*',
        './node_modules/css-select/**/*',
        './node_modules/css-what/**/*',
        './node_modules/dom-serializer/**/*',
        './node_modules/domelementtype/**/*',
        './node_modules/domhandler/**/*',
        './node_modules/domutils/**/*',
        './node_modules/encoding-sniffer/**/*',
        './node_modules/entities/**/*',
        './node_modules/htmlparser2/**/*',
        './node_modules/nth-check/**/*',
        './node_modules/parse5/**/*',
        './node_modules/parse5-htmlparser2-tree-adapter/**/*',
        './node_modules/parse5-parser-stream/**/*',
        './node_modules/undici/**/*',
        './node_modules/whatwg-mimetype/**/*',
        './node_modules/whatwg-encoding/**/*',
        './node_modules/iconv-lite/**/*',
        './node_modules/safer-buffer/**/*',
        './node_modules/boolbase/**/*',
        './node_modules/@google/generative-ai/**/*',
      ],
    },
  },
}

module.exports = nextConfig
