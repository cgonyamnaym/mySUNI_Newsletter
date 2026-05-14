---
template: design
version: 2.0
feature: newsletter-dashboard
date: 2026-04-30
author: hyeokyeong@gmail.com
project: 에너지 뉴스레터 대시보드
---

# 뉴스레터 대시보드 v2 — Design Document

> **Summary**: 19개 지정 소스(rss/google-news/scrape 3방식) 수집 파이프라인 + Next.js SSG/CSR 혼합 아키텍처. 기사 선택(/select) → 뉴스레터 자동 생성(/newsletter) 2-페이지 워크플로 포함.
>
> **Project**: 에너지 뉴스레터 대시보드
> **Version**: 2.0
> **Author**: hyeokyeong@gmail.com
> **Date**: 2026-04-30
> **Status**: In Progress
> **Planning Doc**: [newsletter-dashboard.plan.md](../../01-plan/features/newsletter-dashboard.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 소스 신뢰도 + 뉴스레터 제작 자동화로 팀 생산성 향상 (격주 작업 시간: 시간 단위 → 분 단위) |
| **WHO** | 뉴스레터 편집 담당자(1~2명) + 구독 임직원 전체 |
| **RISK** | JS SPA 스크래핑 불가 → Google News site: 우회 / localStorage 용량 초과 / CSS 셀렉터 변경 |
| **SUCCESS** | 19개 소스 중 15개+ 정상 수집 / /select·/newsletter 정상 동작 / 복사 버튼 동작 |
| **SCOPE** | Sprint 1: 크롤링 수정 ✅ / Sprint 2: /select ✅ / Sprint 3: /newsletter ✅ |

---

## 1. Overview

### 1.1 Design Goals

- **소스 정확도**: `source_websites.csv` 19개 지정 소스만 수집. rss/google-news/scrape 3방식 혼합
- **뉴스레터 워크플로**: 브라우저에서 기사 선택 → 6개 카테고리 뉴스레터 즉시 생성·복사
- **Zero Server**: 런타임 서버 없음. 크롤링 JSON → `public/data/` → CSR fetch
- **WDS 컴플라이언스**: `design_base/` Wanted Design System 토큰 100% 준수 (Pretendard, `#0066FF`, `rgba(112,115,124,0.16)` 보더 등)

### 1.2 Design Principles

- **URL-First State**: 필터·검색은 URL searchParams, 선택 상태는 localStorage
- **CSR for Interactivity**: `/select`, `/newsletter`는 완전 CSR (`'use client'`) — SSG 하이드레이션 오류 방지
- **Graceful Degradation**: localStorage 없음/만료 → 빈 선택으로 초기화, fetch 실패 → 해당 날짜 skip

### 1.3 Design System Reference

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#0066FF` (wds-blue-500) | 버튼, 링크, 선택 강조 |
| Primary Hover | `#005EEB` (wds-blue-600) | 버튼 hover |
| Primary Subtle | `#EAF2FE` (wds-blue-50) | 선택된 카드 배경 |
| Text Strong | `#000` / `#171719` | 제목 |
| Text Alt | `rgba(55,56,60,0.61)` | 캡션, 날짜 |
| Text Disabled | `rgba(55,56,60,0.28)` | 비활성 |
| Border Subtle | `rgba(112,115,124,0.16)` | 카드 테두리 |
| Border Normal | `rgba(112,115,124,0.22)` | 선택된 칩 테두리 |
| Radius MD | `12px` | 버튼 |
| Radius LG | `16px` | 카드 |
| Radius Full | `9999px` | 칩, 뱃지 |
| Shadow LG | `0 12px 32px rgba(23,23,23,0.10)` | 플로팅 카드 |
| Font | Pretendard (700/600/500) | 전체 |

---

## 2. Architecture

### 2.1 Selected Architecture — Pragmatic (Option C)

**4계층 분리**: `scripts/` (크롤링) → `public/data/` (정적 JSON) → `src/` (프론트엔드) → Browser

```
┌─────────────────────────────────────────────────────────────────┐
│                   크롤링 파이프라인 (Node.js)                     │
│                                                                  │
│  Windows Task Scheduler → scripts/run-crawl.js                  │
│         │                                                        │
│         ├─► rss-crawler.js   (type: rss, google-news)           │
│         ├─► scraper.js       (type: scrape, Cheerio)            │
│         └─► pdf-crawler.js   (미사용)                            │
│                  │                                               │
│         summarizer.js (Gemini 번역·요약·분류)                    │
│                  │                                               │
│         url-tracker.js (URL dedup)                               │
│                  │                                               │
│         public/data/daily/YYYY-MM-DD.json                       │
│         public/data/biweekly/{id}.json                          │
│         public/data/index.json                                   │
└─────────────────────────────────────────────────────────────────┘
                             │ Vercel 배포
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js 14 (output: export)                    │
│                                                                  │
│  SSG 페이지 (빌드 타임 fs.readFileSync):                          │
│    /                  → app/page.tsx                            │
│    /archive           → app/archive/page.tsx                    │
│    /archive/[date]    → app/archive/[date]/page.tsx             │
│    /biweekly-report/[id] → app/biweekly-report/[reportId]/      │
│                                                                  │
│  CSR 페이지 ('use client', 브라우저 fetch):                       │
│    /collect           → app/collect/page.tsx                    │
│    /generate          → app/generate/page.tsx                   │
│                              │                                   │
│                    localStorage (선택 상태)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 크롤러 모듈 구조

```
scripts/
  run-crawl.js            ← 진입점: RSS/GNews → Scrape 순서 실행
  reclassify-articles.js  ← 기존 기사 토픽 재분류 마이그레이션
  biweekly-report.js      ← 격주 리포트 생성
  crawlers/
    sources.js            ← 19개 소스 설정 배열 (rss/google-news/scrape)
    rss-crawler.js        ← crawlRss(): rss + google-news 타입 처리
    scraper.js            ← crawlScrape(): Cheerio 멀티셀렉터 지원
    classifier.js         ← 키워드 기반 토픽 분류 (6개 카테고리, 한/영)
    body-fetcher.js       ← fetchBodyText(url): 본문 전문 수집 + countSentences()
    relevance-filter.js   ← isEnergyRelevant(title, summary, lang): 에너지 관련성 필터
    summarizer.js         ← gemini-2.5-flash 번역·요약·분류 (rate limit/fallback)
    url-tracker.js        ← filterNew({force}) / markSeen({dryRun}) / isUrlAccessible()
    pdf-crawler.js        ← IRENA 등 기관 PDF 수집
```

**소스 타입 분류** (sources.js):

| 타입 | 수집 방식 | 소스 수 |
|------|---------|--------|
| `rss` | 공식 RSS 피드 직접 파싱 (rss-parser) | 3개 |
| `google-news` | `https://news.google.com/rss/search?q=site:{domain}` | 8개 |
| `scrape` | Cheerio HTML 파싱 + CSS 셀렉터 | 7개 |

**scraper.js 핵심 동작**:
```js
// 멀티셀렉터: 쉼표로 구분된 여러 셀렉터를 순서대로 시도
const selectors = cfg.titleSelector.split(',').map(s => s.trim())
// href 없는 요소: 가장 가까운 <a> 조상으로 fallback
const href = $(el).attr('href') || $(el).closest('a').attr('href')
```

### 2.4 에너지 관련성 필터 (키워드 기반)

RSS·스크래핑 소스는 에너지 전문지라도 무관 기사를 포함한다 (에너지경제신문 선거·금융, Electrek 자동차 전반, 그린포스트코리아 일반 뉴스). 수집 단계에서 에너지 키워드가 하나도 없는 기사를 **제목 기준**으로 필터링한다.

**적용 위치**: `isUrlAccessible()` 이후, `isBodyLongEnough()` 이전 (불필요한 본문 fetch 방지)

```
수집된 후보 URL 목록
        │
filterNew()                ← URL dedup
        │
isUrlAccessible()          ← 404·접속불가 제외
        │
isEnergyRelevant(title)    ← 에너지 키워드 1개 이상 포함?  ← § 2.4 (신규)
  NO   → skip              (markSeen 호출 안 함)
  YES  →
        │
isBodyLongEnough(url)      ← 본문 10문장 이상?            ← § 2.5
  NO   → skip
  YES  → summarize() → markSeen() → 저장
```

**`relevance-filter.js` 명세**:

```js
// 에너지 도메인 핵심 키워드 (한/영 공통)
const ENERGY_KW_KO = [
  '에너지', '전력', '전기', '발전', '재생에너지', '신재생', '태양광', '태양전지',
  '풍력', '해상풍력', '원자력', '원전', 'smr', '수소', '그린수소', '연료전지',
  '배터리', 'ess', '에너지저장', '전기차', '충전', 'ev충전', '계통', '송전', '배전',
  '스마트그리드', '한전', '한국전력', '전기요금', '전기사업', '에너지전환',
  '탄소중립', '탄소배출', '온실가스', '기후변화', '넷제로', 'cop', 're100',
  'lng', 'lpg', 'cng', '석유', '유가', '원유', '가스', '도시가스', '연료', '화력',
  '열에너지', '집단에너지', '지열', '조력', '수력', '바이오에너지',
  '에너지정책', '전력시장', '발전소', '변전소', '전력망', '전력계통',
  '국제에너지기구', 'iea', 'irena', '석탄', '탈탄소', '에너지효율',
]
const ENERGY_KW_EN = [
  'energy', 'electricity', 'power', 'solar', 'wind', 'nuclear', 'hydrogen',
  'battery', 'storage', 'ess', 'bess', 'grid', 'renewable', 'bioenergy',
  'geothermal', 'fuel', 'gas', 'lng', 'lpg', 'oil', 'carbon', 'emission',
  'climate', 'net zero', 'decarbonization', 're100', 'ev charging',
  'photovoltaic', 'turbine', 'reactor', 'smr', 'electrolyzer',
  'transmission', 'distribution', 'substation', 'microgrid',
  'kilowatt', 'megawatt', 'gigawatt', 'kwh', 'mwh', 'gwh',
]

/**
 * 제목(+요약)에 에너지 관련 키워드가 1개 이상 포함되는지 확인.
 * @param {string} title
 * @param {string} summary  - 없으면 ''
 * @param {string} lang     - 'ko' | 'en'
 * @returns {boolean}
 */
function isEnergyRelevant(title, summary = '', lang = 'ko') { ... }
```

**판정 기준**:
- 제목에서 먼저 검사 (필수)
- 제목 미매칭 시 요약(summary)까지 추가 검사
- 한국어 소스: `ENERGY_KW_KO` 우선, 영어 보완
- 영어 소스: `ENERGY_KW_EN` 우선, 한국어 보완
- 키워드 1개 이상 → 통과 / 0개 → skip

**주요 필터링 대상 (사례)**:
| 소스 | 제목 예시 | 판정 |
|------|----------|------|
| 에너지경제신문 | "BTS 귀환에 하이브 강세" | ❌ skip |
| 에너지경제신문 | "전기요금 인상 논의 본격화" | ✅ 통과 |
| 그린포스트코리아 | "게임 마케팅 크리에이터가 흥행 가른다" | ❌ skip |
| 그린포스트코리아 | "탄소배출 감축 목표 상향" | ✅ 통과 |
| Electrek | "BYD drop-top electric hypercar images" | ❌ skip |
| Electrek | "EV charging infrastructure expands" | ✅ 통과 |

### 2.5 기사 본문 길이 필터 (10문장 이상)

크롤링 파이프라인에서 본문이 충분히 긴 기사만 저장하는 품질 필터.

**적용 위치**: `filterNew()` 이후, `markSeen()` 이전, `summarize()` 이전

```
수집된 후보 URL 목록
        │
filterNew()                ← 이미 수집된 URL 제외
        │
fetchBodyText(url)         ← Cheerio로 본문 전문 가져오기 (timeout: 8s)
        │
countSentences(text) ≥ 10? ← 문장 수 판정
  NO   → 해당 기사 skip    (markSeen 호출 안 함 → 다음 실행에서 재시도 없이 영구 skip)
  YES  → summarize()
              │
         markSeen()        ← URL dedup 등록
              │
         daily JSON 저장
```

**`body-fetcher.js` 명세**:

```js
const BODY_SELECTORS = [
  'article', '[role="main"]', '.article-body', '.post-content',
  '.entry-content', '.news-body', '#articleBody', 'main p'
]
const TIMEOUT_MS = 8000

/**
 * 주어진 URL의 기사 본문 텍스트를 수집.
 * @returns {Promise<string>} 본문 텍스트 (수집 실패 시 빈 문자열)
 */
async function fetchBodyText(url) { ... }

/**
 * 텍스트에서 문장 수를 반환.
 * 구분자: '.', '?', '!', '。', '？', '！'
 * 공백·특수문자만 있는 토큰은 제외.
 */
function countSentences(text) { ... }

/**
 * 해당 URL 기사가 본문 최소 길이 조건을 충족하는지 반환.
 * @param {string} url
 * @param {number} minSentences 기본값: 10
 */
async function isBodyLongEnough(url, minSentences = 10) { ... }
```

**실패 케이스 처리**:

| 케이스 | countSentences 결과 | 최종 처리 |
|--------|-------------------|---------|
| fetch timeout (8s 초과) | 0 | skip |
| 페이월 / 로그인 필요 (body 없음) | 0 | skip |
| JS SPA (Cheerio 파싱 불가) | 0 | skip |
| PDF URL | 0 | skip |
| 정상 기사 (10문장 이상) | ≥ 10 | 저장 |
| 짧은 기사 (브리핑, 속보) | < 10 | skip |

> **성능**: 기사당 HTTP 요청 1회 추가 (~1–3s). `BODY_CHECK_TIMEOUT_MS` 환경변수로 조정 가능.
> 소스당 기사 수가 많을 경우 `Promise.allSettled` 병렬 처리로 전체 실행 시간 최소화.

### 2.3 CSR 데이터 플로우

```
/collect
  mount → fetch /data/index.json          (MetaIndex)
        → fetch /data/daily/{date}.json × 14 (최근 14일 DailyData)
        → 기사 목록 렌더링 (토픽 필터, 체크박스)
  체크박스 클릭 → localStorage 'newsletter-selection' 저장
  [뉴스레터 생성하기] 버튼 → Link href="/generate"

/generate
  mount → localStorage.getItem('newsletter-selection')
        → fetch /data/index.json
        → fetch /data/daily/{date}.json × 14
        → selectedIds로 필터링
        → TOPICS 순서대로 그룹핑·렌더링 (미분류 → '기타' 섹션)
  [HTML 복사] → navigator.clipboard.write(HTML Blob)
  [인쇄] → window.print()
  [← 기사 선택] → Link href="/collect"
```

---

## 3. Data Model

### 3.1 Article 타입 (v2)

```typescript
// src/lib/types.ts

export type TopicId =
  | '전력 인프라'
  | '에너지원'
  | '운영 최적화'
  | '정책·규제'
  | 'ESG·탄소중립'
  | '시장·가격 동향'

export interface Article {
  id: string                          // crypto.randomUUID()
  source: string                      // 소스 이름 (예: "에너지경제신문")
  sourceId: string                    // sources.js의 id
  sourceOrigin: 'domestic' | 'global' // v2 추가: 국내/해외 구분
  originalLang: string                // 'ko' | 'en'
  isTranslated: boolean
  title: string                       // 한국어 제목
  titleOriginal: string | null        // 원문 제목 (번역 시)
  summary: string                     // AI 한국어 요약 (3문장)
  topics: TopicId[]                   // 분류 토픽 (최대 3개)
  publishedAt: string                 // ISO8601
  originalUrl: string                 // 원문 URL
  collectedAt: string                 // 수집 시각 ISO8601
}
```

### 3.2 파일 저장 스키마 (v2: public/data/)

```
public/data/                          ← Next.js static serving (/data/...)
  index.json                          ← MetaIndex
  daily/
    2026-04-30.json                   ← DailyData
    ...
  biweekly/
    2026-BW08.json                    ← BiweeklyData
    ...
  .crawled-urls.json                  ← URL dedup (scraping 제외)
```

> **v1 → v2 변경**: `data/` → `public/data/` (CSR fetch 지원, Next.js static serving 활용)

### 3.3 localStorage 스키마

```typescript
// Key: 'newsletter-selection'
interface NewsletterSelection {
  reportId: string       // 'YYYY-BW##'
  selectedIds: string[]  // article.id 배열 (최대 200개)
  updatedAt: string      // ISO8601
}
```

### 3.4 sources.js 스키마

```typescript
interface Source {
  id: string
  name: string
  lang: 'ko' | 'en'
  origin: 'domestic' | 'global'
  type: 'rss' | 'google-news' | 'scrape'
  enabled: boolean
  // type='rss' | 'google-news':
  rssUrl?: string
  keywords?: string[]
  // type='scrape':
  baseUrl?: string
  scrapeConfig?: {
    listUrl: string
    titleSelector: string     // 쉼표로 멀티셀렉터 지원
    linkSelector?: string
    baseUrl?: string
  }
}
```

---

## 4. API Specification

> 런타임 서버 API 없음. SSG는 빌드 타임 fs.readFileSync, CSR은 브라우저 fetch.

### 4.1 정적 JSON Endpoints

| Method | Path | Used By | 비고 |
|--------|------|---------|------|
| GET | `/data/index.json` | SSG generateStaticParams + CSR /select | MetaIndex |
| GET | `/data/daily/YYYY-MM-DD.json` | SSG 페이지 + CSR /select,/newsletter | DailyData |
| GET | `/data/biweekly/YYYY-BWnn.json` | SSG 격주 리포트 + CSR /select,/newsletter | BiweeklyData |

### 4.2 SSG Data Fetcher (`src/lib/data.ts`)

```typescript
// fs.readFileSync 기반 — next build 타임에만 실행
const DATA_DIR = path.join(process.cwd(), 'public', 'data')  // v2: public/data/

async function getMetaIndex(): Promise<MetaIndex>
async function getDailyData(date: string): Promise<DailyData | null>
async function getBiweeklyReport(reportId: string): Promise<BiweeklyData | null>
function getLatestDate(index: MetaIndex): string
function getLatestReportId(index: MetaIndex): string | undefined
```

### 4.3 CSR Fetch 패턴 (`/select`, `/newsletter`)

```typescript
// /select, /newsletter 공통 패턴
const res = await fetch(`/data/biweekly/${reportId}.json`)
if (!res.ok) return null
const data: BiweeklyData = await res.json()

// 날짜 범위 병렬 fetch
const dailyResults = await Promise.all(
  dates.map(date =>
    fetch(`/data/daily/${date}.json`)
      .then(r => r.ok ? r.json() as Promise<DailyData> : null)
      .catch(() => null)
  )
)
```

### 4.4 Gemini API Integration

| 함수 | 모델 | 입력 | 출력 |
|------|------|------|------|
| `summarize(ko)` | gemini-2.5-flash | title + content(1500자) | `{titleKo, summary, topics}` |
| `summarize(en)` | gemini-2.5-flash | title + content(1500자) | `{titleKo, titleOriginal, summary, topics}` |
| `generateReport` | gemini-2.5-flash | 최대 80개 기사 요약 | `TrendReport` JSON |

**Rate Limit**: 6500ms min, 429 → Retry-After 헤더, 503 → 8s fixed
**Fallback Chain**: `gemini-2.5-flash` → `gemini-1.5-flash-latest` → keyword 분류

---

## 5. UI/UX Design

### 5.1 페이지별 레이아웃

#### 메인 페이지 (`/`)

```
┌─────────────────────────────────────────────────────┐
│ Header [sticky, h-14]                                │
│  E 에너지 인사이트 | [뉴스레터 생성↗] [격주 리포트] 업데이트 SearchBar │
├─────────────────────────────────────────────────────┤
│ max-w-7xl mx-auto px-4 pt-6 pb-10                   │
│                                                      │
│  TopicFilter (chip 7개)                              │
│  [전체] [⚡전력 인프라] [☀️에너지원] ...              │
│                                                      │
│  NewsGrid (3col → 2col → 1col)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ NewsCard │ │ NewsCard │ │ NewsCard │            │
│  │ source · date        │                          │
│  │ [번역]               │                          │
│  │ title (font-bold)    │                          │
│  │ summary (text-sm)    │                          │
│  │ [토픽칩] [원문→]     │                          │
│  └──────────┘           │                          │
├─────────────────────────────────────────────────────┤
│ Footer                                               │
│  ⚡ 에너지 인사이트 · 뉴스레터 생성 → · 격주 리포트 → │
└─────────────────────────────────────────────────────┘
```

#### 기사 선택 페이지 (`/select`) — CSR

```
┌─────────────────────────────────────────────────────┐
│ Header [sticky]                                      │
├─────────────────────────────────────────────────────┤
│ max-w-5xl mx-auto px-4                              │
│                                                      │
│ 격주 기간 선택 [드롭다운 ▼]                           │
│                                                      │
│ 토픽 필터 (chip 7개) + 전체선택/해제                  │
│                                                      │
│ 기사 목록 (체크박스 + 카드)                           │
│ ┌─────────────────────────────────────┐             │
│ │ ☑ source · date · [토픽]           │             │
│ │   title (font-semibold)            │             │
│ │   summary (text-sm, 2줄 truncate)  │             │
│ └─────────────────────────────────────┘             │
│ ...                                                  │
│                                                      │
│ [sticky bottom] N개 기사 선택됨 [뉴스레터 생성 →]   │
└─────────────────────────────────────────────────────┘
```

#### 뉴스레터 생성 페이지 (`/newsletter`) — CSR

```
┌─────────────────────────────────────────────────────┐
│ [sticky bar] [← 기사 선택으로] [복사] [인쇄]         │
├─────────────────────────────────────────────────────┤
│ max-w-3xl mx-auto px-4                              │
│                                                      │
│ 에너지 인사이트 뉴스레터                              │
│ 2026. MM. DD. ~ 2026. MM. DD.                       │
│                                                      │
│ ⚡ 전력 인프라                                        │
│ ─────────────────────────                           │
│ • [기사 제목] (출처)                                  │
│   요약 텍스트...                                      │
│   원문: URL                                          │
│                                                      │
│ ☀️ 에너지원 ...                                      │
│ 📋 운영 최적화 ...                                   │
│ ...                                                  │
└─────────────────────────────────────────────────────┘
```

### 5.2 토픽 카테고리 & 이모지

| 이모지 | TopicId | chipBg | chipText |
|-------|---------|--------|----------|
| ⚡ | 전력 인프라 | `#EAF2FE` (wds-blue-50) | `#0066FF` (wds-blue-500) |
| ☀️ | 에너지원 | `#F0ECFE` (wds-violet-50) | `#9747FF` (wds-violet-500) |
| 📋 | 운영 최적화 | `rgba(0,152,178,0.08)` | `#0098B2` (wds-teal-500) |
| 📋 | 정책·규제 | `rgba(112,115,124,0.08)` | `#37383C` (wds-gray-700) |
| 🌿 | ESG·탄소중립 | `rgba(0,191,64,0.08)` | `#00BF40` (wds-green-500) |
| 📈 | 시장·가격 동향 | `rgba(255,66,66,0.08)` | `#FF4242` (wds-red-500) |

> 색상은 `src/lib/constants.ts`의 `TopicConfig.chipBg/chipText`에서 inline style로 적용.

> **WDS 원칙**: 이모지는 뉴스레터 출력용으로만 사용. UI 내부 아이콘은 SVG 아이콘 사용 (design_base/assets/icons/).

### 5.3 User Flow

```
메인 (/) ─────────────────────────────────────────────────────
  → [뉴스레터 생성] 버튼 (Header/Footer) → /select

/select ───────────────────────────────────────────────────────
  → 격주 기간 드롭다운 (availableReports)
  → 토픽 필터 클릭 → 해당 토픽 기사만 표시
  → 체크박스 클릭 → localStorage 저장
  → [전체 선택/해제] 토글
  → [뉴스레터 생성 →] 버튼 → /newsletter

/newsletter ───────────────────────────────────────────────────
  → localStorage 읽기 → 선택 기사 렌더링 (6개 카테고리)
  → [복사] → navigator.clipboard.writeText(plainText)
  → [인쇄] → window.print()
  → [← 기사 선택으로] → router.back()

메인 기존 플로우 ──────────────────────────────────────────────
  → 토픽 필터 → URL?topic=...
  → 검색 → URL?q=...
  → NewsCard → 원문 URL 새 탭
  → /archive/[date] → 날짜별 기사
  → /biweekly-report/[reportId] → 격주 리포트
```

### 5.4 Component List

| Component | Location | 'use client' | Responsibility |
|-----------|----------|:---:|----------------|
| `Header` | `src/components/Header.tsx` | ❌ | 로고, 날짜, 뉴스레터 버튼, SearchBar |
| `Footer` | `src/components/Footer.tsx` | ❌ | 저작권, 뉴스레터 링크, 리포트 링크 |
| `SearchBar` | `src/components/SearchBar.tsx` | ✅ | 검색 입력, URL ?q 관리 |
| `TopicFilter` | `src/components/TopicFilter.tsx` | ✅ | 6+1 토픽 필터 칩, URL searchParam |
| `NewsGrid` | `src/components/NewsGrid.tsx` | ✅ | 기사 목록, Fuse.js 검색·필터 적용 |
| `NewsCard` | `src/components/NewsCard.tsx` | ❌ | 기사 카드 (소스, 날짜, 제목, 요약, 링크) |
| `TopicBadge` | `src/components/TopicBadge.tsx` | ❌ | 토픽 칩 (색상 코딩) |
| `TranslationBadge` | `src/components/TranslationBadge.tsx` | ❌ | "번역" 뱃지 |
| `BiweeklyReport` | `src/components/BiweeklyReport.tsx` | ❌ | 격주 리포트 전체 렌더링 |
| `ArchiveList` | `src/components/ArchiveList.tsx` | ❌ | 아카이브 날짜 목록 |

**CSR 페이지 (컴포넌트 아님):**

| Page | Location | Data Source |
|------|----------|------------|
| `/select` | `src/app/select/page.tsx` | CSR fetch + localStorage |
| `/newsletter` | `src/app/newsletter/page.tsx` | localStorage + CSR fetch |

### 5.5 Page UI Checklist

#### 메인 (`/`)

- [x] Header: 서비스 로고/제목 (에너지 인사이트)
- [x] Header: 마지막 업데이트 날짜 (MM. DD. HH:mm 형식)
- [x] Header: "뉴스레터 생성" 파란 버튼 → /select
- [x] Header: 최신 격주 리포트 링크 (있을 때만)
- [x] Header: SearchBar
- [x] TopicFilter: "전체" + 6개 토픽 칩 (선택 시 강조)
- [x] NewsGrid: 기사 카드 목록
- [x] NewsCard: 소스명, 날짜, 제목, TranslationBadge, 요약, TopicBadge, 원문 링크
- [x] Footer: 저작권, 뉴스레터 생성 링크, 격주 리포트 링크

#### 기사 선택 (`/select`)

- [x] 격주 기간 드롭다운 (availableReports 기반)
- [x] 토픽 필터 버튼 (전체 + 6개)
- [x] 전체 선택 / 전체 해제 버튼
- [x] 기사 카드 + 체크박스 (체크 시 배경색 변경)
- [x] 선택 개수 표시 (sticky 하단 바)
- [x] localStorage 저장 (새로고침 후 선택 유지)
- [x] "뉴스레터 생성" CTA 버튼 → /newsletter

#### 뉴스레터 생성 (`/newsletter`)

- [x] sticky 상단: 뒤로 가기, 복사, 인쇄 버튼
- [x] 기간 표시 (startDate ~ endDate)
- [x] 6개 카테고리 섹션 (이모지 + 토픽명)
- [x] 각 섹션: 기사 제목, 출처, 요약, 원문 URL
- [x] 선택 기사 없는 카테고리는 표시 안 함
- [x] 복사: plain text 형식 (navigator.clipboard.writeText)
- [x] 인쇄: window.print() + `@media print` CSS

#### 날짜별 아카이브 (`/archive/[date]`)

- [x] 날짜 표시, 이전/다음 날짜 네비게이션
- [x] TopicFilter + NewsGrid
- [x] 메인으로 돌아가기 링크

#### 격주 리포트 (`/biweekly-report/[reportId]`)

- [x] 리포트 ID, 기간 표시
- [x] 헤드라인, Top 5 이슈, 토픽별 동향 6개, 주목 기업/기관, 다음 기간 관심사
- [x] 과거 리포트 링크 목록

---

## 6. Error Handling

### 6.1 크롤링 파이프라인

| 상황 | 처리 | 영향 |
|------|------|------|
| RSS/GNews fetch 실패 | `console.warn` + 소스 skip | 해당 소스만 skip |
| Cheerio 셀렉터 매칭 0건 | `console.warn` "기사 파싱 결과 없음" | 해당 소스 skip |
| href 없는 엘리먼트 | `$(el).closest('a').attr('href')` fallback | 정상 수집 |
| Gemini API 실패 | try/catch → fallback keyword 분류 | 요약 없음, 분류 fallback |
| URL 이미 수집됨 | filterNew() → skip | 중복 없음 |
| 에너지 키워드 미매칭 | `isEnergyRelevant()` → false → skip (markSeen 미호출) | 무관 기사 미저장 |
| 본문 fetch timeout | `fetchBodyText()` → 빈 문자열 반환 → countSentences() = 0 → skip | 해당 기사 미저장 |
| 본문 문장 수 < 10 | `isBodyLongEnough()` → false → skip (markSeen 미호출) | 해당 기사 미저장, 다음 실행에서 재시도 |

### 6.2 CSR 페이지

| 상황 | 처리 | UI |
|------|------|-----|
| localStorage 없음/만료 | 빈 선택으로 초기화 | 기사 선택 필요 안내 |
| fetch 실패 (daily) | Promise.allSettled → null → skip | 해당 날짜 기사 미표시 |
| fetch 실패 (biweekly) | null → 빈 상태 렌더링 | 로딩 실패 메시지 |
| 선택 기사 0개 | /newsletter에서 빈 화면 | "선택된 기사 없음" |
| localStorage 200개 초과 | 제한 없음 (현재), 필요 시 slice | — |

### 6.3 SSG 빌드

| 상황 | 처리 | 결과 |
|------|------|------|
| getDailyData null | 빈 기사 배열 | "데이터 없음" |
| getBiweeklyReport null | notFound() | 404 |
| index.json 없음 | 기본값 `{availableDates:[], ...}` | 빈 홈 |

---

## 7. Security

- [x] `GEMINI_API_KEY` — `.env` 로컬 / 서버 환경변수만. 브라우저 노출 없음
- [x] 외부 링크 `target="_blank" rel="noopener noreferrer"`
- [x] 검색: 클라이언트 사이드 Fuse.js — 서버 쿼리 없음
- [x] localStorage: 기사 ID만 저장 (개인정보 없음)
- [x] CSR fetch: 같은 도메인 `/data/` 경로만 — CORS 이슈 없음

---

## 8. Test Plan

### 8.1 L1: 크롤링 단위

| # | 함수 | 테스트 | 기대값 |
|---|------|--------|--------|
| 1 | `crawlRss(sources)` | rss 타입 소스 | articles[] 반환 (length > 0) |
| 2 | `crawlRss(sources)` | google-news 타입 소스 | GNews RSS 파싱 정상 |
| 3 | `crawlScrape(sources)` | scrape 타입 소스 (IEA) | `.m-news-detailed-listing__hover` 셀렉터 매칭 |
| 4 | `filterNew(urls)` | 이미 수집된 URL | `newUrls.length === 0` |
| 5 | `summarize({lang:'en'})` | 영어 기사 | `titleKo` 한국어, `titleOriginal` 영어 |
| 6 | `isRecent(pubDate, 14)` | 13일 전 날짜 | true |
| 7 | `isEnergyRelevant(title, '', 'ko')` | "전기요금 인상 논의" | `true` |
| 8 | `isEnergyRelevant(title, '', 'ko')` | "BTS 귀환에 하이브 강세" | `false` |
| 9 | `isEnergyRelevant(title, '', 'en')` | "ev charging infrastructure expands" | `true` |
| 10 | `isEnergyRelevant(title, '', 'en')` | "BYD drop-top electric hypercar" | `false` |
| 11 | `countSentences(text)` | 10문장 텍스트 | `10` |
| 8 | `countSentences(text)` | 9문장 텍스트 | `9` |
| 9 | `countSentences('')` | 빈 문자열 | `0` |
| 10 | `isBodyLongEnough(url)` | 정상 기사 URL (≥ 10문장) | `true` |
| 11 | `isBodyLongEnough(url)` | 짧은 브리핑 URL (< 10문장) | `false` |
| 12 | `isBodyLongEnough(url)` | fetch timeout 발생 URL | `false` |

### 8.2 L2: UI Action

| # | 페이지 | 액션 | 기대값 |
|---|--------|------|--------|
| 1 | `/` | 로드 | Header + TopicFilter + NewsGrid 표시 |
| 2 | `/` | "에너지원" 필터 클릭 | URL `?topic=에너지원`, 해당 토픽만 표시 |
| 3 | `/select` | 로드 | 격주 드롭다운 + 기사 목록 표시 |
| 4 | `/select` | 체크박스 클릭 | 카드 배경 변경, 하단 카운트 업데이트 |
| 5 | `/select` | 새로고침 | localStorage에서 선택 복원 |
| 6 | `/newsletter` | 로드 | 6개 카테고리 섹션 렌더링 (선택된 토픽만) |
| 7 | `/newsletter` | [복사] 클릭 | 클립보드에 plain text 복사 |

### 8.3 L3: E2E 시나리오

| # | 시나리오 | Steps | 성공 기준 |
|---|----------|-------|---------|
| 1 | 뉴스레터 생성 전체 플로우 | / → /select → 기사 선택 → /newsletter → 복사 | 선택 기사가 뉴스레터에 카테고리별 표시 |
| 2 | 선택 상태 유지 | /select 선택 → /newsletter → ← 뒤로 | localStorage 선택 복원됨 |
| 3 | 토픽 필터 | /select → 토픽 클릭 → 해당 토픽만 표시 | 다른 토픽 기사 미표시 |
| 4 | 기존 열람 플로우 | / → 토픽 필터 → 검색 → 원문 클릭 | URL searchParam 업데이트, 원문 새 탭 |

---

## 9. Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | 페이지, UI 컴포넌트 | `src/app/`, `src/components/` |
| **Application** | CSR fetch, localStorage, Fuse.js 검색 | `src/lib/data.ts`, `src/lib/search.ts` |
| **Domain** | 타입 정의, TOPICS 상수 | `src/lib/types.ts`, `src/lib/constants.ts` |
| **Infrastructure** | 크롤링 스크립트, Gemini API | `scripts/` |
| **Static Store** | JSON 데이터 파일 | `public/data/` |

---

## 10. Coding Convention

### 10.1 Naming

| 대상 | 규칙 | 예시 |
|------|------|------|
| Components | PascalCase | `NewsCard`, `TopicFilter` |
| Pages (CSR) | `'use client'` + PascalCase 파일 | `select/page.tsx` |
| Functions | camelCase | `getDailyData()`, `loadSelection()` |
| Constants | UPPER_SNAKE 또는 camelCase 객체 | `TOPICS`, `TOPIC_EMOJI` |
| Types/Interfaces | PascalCase | `Article`, `NewsletterSelection` |

### 10.2 'use client' 경계

| 파일 | use client | 이유 |
|------|:----------:|------|
| `TopicFilter` | ✅ | `useRouter`, `useSearchParams` |
| `NewsGrid` | ✅ | `useSearchParams`, Fuse.js |
| `SearchBar` | ✅ | `useRouter`, `useSearchParams` |
| `select/page.tsx` | ✅ | localStorage, fetch, useState |
| `newsletter/page.tsx` | ✅ | localStorage, fetch, navigator.clipboard |
| `NewsCard`, `Header`, `Footer` | ❌ | 순수 props 렌더링 |
| `page.tsx` (SSG) | ❌ | RSC, fs.readFileSync |

### 10.3 TypeScript Set 이터레이션

```typescript
// ❌ TS2802 오류 (target이 ES2015 미만일 때)
const next = new Set(prev)
return [...next]

// ✅ 안전한 패턴
return Array.from(next)
```

### 10.4 환경 변수

| 변수 | 용도 | 범위 |
|------|------|------|
| `GEMINI_API_KEY` | Gemini AI 인증 | 크롤링 스크립트 전용 (.env / 서버 환경변수) |

---

## 11. Implementation Guide

### 11.1 파일 구조 (v2)

```
c:/Users/mysuni_newsletter_pjt2/
├── public/
│   ├── data/                          ← 브라우저 fetch: /data/...
│   │   ├── index.json                 ✅ MetaIndex
│   │   ├── daily/YYYY-MM-DD.json      ✅ DailyData
│   │   ├── biweekly/{id}.json         ✅ BiweeklyData
│   │   └── .crawled-urls.json         ✅ URL dedup
│   └── fonts/                         ✅ Pretendard OTF (9 weights)
├── scripts/
│   ├── run-crawl.js                   ✅ 진입점 (RSS/GNews/Scrape 3단계)
│   ├── biweekly-report.js             ✅ 격주 리포트 생성
│   ├── crawl.bat                      ✅ Windows Task Scheduler 래퍼
│   └── crawlers/
│       ├── sources.js                 ✅ 19개 소스 (rss/google-news/scrape)
│       ├── rss-crawler.js             ✅ RSS + GNews 수집
│       ├── scraper.js                 ✅ Cheerio HTML 스크래핑 (v2 신규)
│       ├── body-fetcher.js            ✅ 본문 수집 + 문장 수 필터
│       ├── relevance-filter.js        🔲 에너지 관련성 키워드 필터 (신규)
│       ├── summarizer.js              ✅ Gemini rate limit + fallback
│       └── url-tracker.js             ✅ URL dedup
├── src/
│   ├── app/
│   │   ├── globals.css                ✅ WDS 토큰 + Pretendard @font-face
│   │   ├── layout.tsx                 ✅ RootLayout
│   │   ├── page.tsx                   ✅ 메인 (SSG RSC)
│   │   ├── archive/
│   │   │   ├── page.tsx               ✅ 아카이브 목록 (SSG)
│   │   │   └── [date]/page.tsx        ✅ 날짜별 기사 (SSG)
│   │   ├── biweekly-report/
│   │   │   ├── page.tsx               ✅ 최신 리포트 redirect
│   │   │   └── [reportId]/page.tsx    ✅ 격주 리포트 (SSG)
│   │   ├── select/
│   │   │   └── page.tsx               ✅ 기사 선택 (CSR) — v2 신규
│   │   └── newsletter/
│   │       └── page.tsx               ✅ 뉴스레터 생성 (CSR) — v2 신규
│   ├── components/
│   │   ├── Header.tsx                 ✅ + 뉴스레터 버튼 (v2 수정)
│   │   ├── Footer.tsx                 ✅ + 뉴스레터 링크 (v2 수정)
│   │   ├── TopicFilter.tsx            ✅
│   │   ├── NewsGrid.tsx               ✅
│   │   ├── NewsCard.tsx               ✅
│   │   ├── TopicBadge.tsx             ✅
│   │   ├── TranslationBadge.tsx       ✅
│   │   ├── BiweeklyReport.tsx         ✅
│   │   └── ArchiveList.tsx            ✅
│   └── lib/
│       ├── types.ts                   ✅ + sourceOrigin (v2 수정)
│       ├── constants.ts               ✅ TOPICS, TOPIC_MAP
│       ├── data.ts                    ✅ public/data/ 경로 (v2 수정)
│       └── search.ts                  ✅ Fuse.js singleton
├── design_base/                       ✅ Wanted Design System 참조
├── next.config.js                     ✅ output: 'export'
├── tailwind.config.ts                 ✅ WDS 토큰 Tailwind 통합
└── tsconfig.json                      ✅
```

### 11.2 구현 완료 현황

| Sprint | 범위 | 상태 |
|--------|------|------|
| Sprint 1 | 크롤링 수정 (sources.js 재작성, scraper.js 신규, 7개 소스 수정, public/data/ 이동) | ✅ 완료 |
| Sprint 2 | `/select` 페이지 (CSR, 격주 드롭다운, 체크박스, localStorage) | ✅ 완료 |
| Sprint 3 | `/newsletter` 페이지 (CSR, 6카테고리, 복사, 인쇄) | ✅ 완료 |
| 공통 | Article.sourceOrigin, Header/Footer 뉴스레터 버튼, WDS 디자인 시스템 통합 | ✅ 완료 |
| Sprint 4 | 기사 본문 길이 필터: `body-fetcher.js` 신규, `rss-crawler.js` + `scraper.js` 연동 | ✅ 완료 |
| Sprint 5 | 에너지 관련성 필터: `relevance-filter.js` 신규, 크롤러 연동, 기존 데이터 소급 제거 | 🔲 예정 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-04-27 | 초안 (Plan Plus + PDCA 설계) |
| 0.2 | 2026-04-29 | 구현 반영: scripts/crawlers/, gemini-2.5-flash, Windows Task Scheduler |
| 0.3 | 2026-04-29 | Gap 분석 반영: §4.2 fs 기반, SearchBar·ArchiveList 추가 |
| 2.0 | 2026-04-30 | v2 전면 개정: design_base WDS 통합, scraper.js, /select·/newsletter, public/data/ 경로, sourceOrigin |
| 2.1 | 2026-05-12 | §2.4→2.5 재번호: 본문 10문장 필터 (body-fetcher.js), 아카이브 2주 단위 개편 반영 |
| 2.2 | 2026-05-12 | §2.4 신규: 에너지 관련성 키워드 필터 (relevance-filter.js), 소급 제거 스크립트 |
