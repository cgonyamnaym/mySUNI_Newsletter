# 에너지 인사이트 뉴스레터 대시보드

## 프로젝트 개요
- **목적**: 26개 지정 에너지 소스(24개 활성) 자동 수집 → 스크리닝 → 격주 뉴스레터 생성
- **사용자**: 뉴스레터 편집 담당자 1~2명 (hyeokyeong@gmail.com)
- **현황**: Sprint 1~8+ 완료 / Gap Analysis 97% / Design v2.6

## 아키텍처 (4계층)

```
scripts/ (Node.js 크롤링)
  → public/data/ (정적 JSON)
  → src/ (Next.js 14, output: 'export')
  → Browser (CSR fetch)
```

- **런타임 서버 없음** — 빌드 시 SSG, 동적 페이지는 CSR fetch
- **배포**: Vercel (정적 내보내기)

## 핵심 명령어

```bash
npm run crawl           # 일일 크롤링 (sources.js 26개 소스)
npm run crawl:dry       # 드라이런 (저장 없음)
npm run collect         # collect.js 단독 실행
npm run biweekly        # 격주 리포트 생성
npm run dev             # 개발 서버 (Next.js)
npm run build           # 정적 빌드 → out/
npm run summarize:top   # 상위 30개 기사 자동 요약 (최근 14일)
npm run summarize:top:dry  # 드라이런 (저장 없음)
npm run newsletter:prep # 크롤링 + 자동 요약 연속 실행
node scripts/summarize-newsletter.js --ids=id1,id2  # 선택 ID 지정 요약
```

## 페이지 구조

| 경로 | 방식 | 설명 |
|------|------|------|
| `/` | SSG | 최신 기사 목록 |
| `/archive`, `/archive/[date]` | SSG | 날짜별 아카이브 |
| `/biweekly-report/[reportId]` | SSG | 격주 리포트 |
| `/collect` | CSR | 기사 선택 + 스크리닝 통합 |
| `/screening` | CSR | 연관성 스크리닝 (Sidebar 기본 진입점) |
| `/generate` | CSR | 뉴스레터 생성 |
| `/newsletter-archive` | CSR | 확정 뉴스레터 목록 |

## 핵심 규칙 / 주의사항

1. **데이터 경로**: `public/data/` (v1의 `data/`가 아님) — CSR fetch는 `/data/...`로 접근
2. **CSR 페이지**: `/collect`, `/screening`, `/generate`, `/newsletter-archive`는 반드시 `'use client'` — SSG 하이드레이션 오류 방지
3. **TypeScript Set 이터레이션**: `[...new Set()]` 대신 `Array.from(new Set())` 사용 (TS2802)
4. **Gemini API**: `GEMINI_API_KEY`는 `.env.local`에만 — 브라우저 노출 금지
5. **스크리닝**: `src/lib/screening.ts`의 `screenArticles()` — Pass 1(점수화) → Pass 2(중복 감점) → Pass 3(Greedy Diversity, 25점 미만 제외)
6. **EV 필터**: `relevance-filter.js` 4단계 Cascade — EV 소비자 콘텐츠는 전력망 맥락 없으면 제외
7. **WDS 토큰**: `src/lib/constants.ts`의 `chipBg/chipText` inline style 적용 (Tailwind 커스텀 아님)

## 주요 파일 위치

```
scripts/crawlers/sources.js         ← 26개 소스 설정 (수정 시 여기)
scripts/crawlers/relevance-filter.js ← 에너지 관련성 필터
scripts/newsletter/                  ← 뉴스레터 요약 파이프라인 (Sprint 8)
src/lib/screening.ts                 ← 다차원 연관성 점수화 (14개 차원)
src/lib/types.ts                     ← Article, ScoredArticle 타입
src/lib/constants.ts                 ← TOPICS, WDS 색상 토큰
public/data/daily/YYYY-MM-DD.json   ← 날짜별 수집 결과
```

## 스크리닝 점수 주요 항목 (Sprint 8 기준)

- AI 토픽 +15/개, 토픽 키워드 +5/개
- 최신성 3일 이내 +5, 7일 이내 +3
- 전략 중요도 최대 +30, SK 연관 +15
- 소스 Tier1(IEA/IRENA/BNEF) +10, Tier2(전문지) +5
- 수량 패턴(GW/억원/%) +10
- EV 소비자 콘텐츠 -25, 이벤트·홍보 -30
- 중복(Jaccard ≥ 0.4) -15

## 환경 변수

| 변수 | 용도 |
|------|------|
| `GEMINI_API_KEY` | Gemini AI (크롤링·요약 전용) |
| `ENABLE_PROMPT_CACHING_1H` | Claude Code 프롬프트 캐싱 (30~40% 토큰 절약) |

## PDCA 현황

- **bkit PDCA**: feature=newsletter-dashboard, phase=check, matchRate=98%
- **문서 위치**: `docs/01-plan/`, `docs/02-design/`, `docs/03-analysis/`
- **설계 버전**: Plan v2.5 / Design v2.5 (2026-06-04, Sprint 8 완료)
