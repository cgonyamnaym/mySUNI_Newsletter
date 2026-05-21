---
template: plan
version: 2.4
feature: newsletter-dashboard
date: 2026-05-21
author: hyeokyeong@gmail.com
project: 에너지 뉴스레터 대시보드
---

# 뉴스레터 대시보드 v2 — Planning Document

> **Summary**: 26개 지정 소스(24활성, rss/scrape 2방식)로부터 수집·분류·요약하고, 기사 수집(/collect) → 연관성 스크리닝(/screening) → 뉴스레터 자동 생성(/generate) 워크플로를 제공하는 정적 웹 대시보드
>
> **Version**: 2.3 (v2.0 → v2.3: 소스 확장 + Sprint 4~6 추가)
> **Status**: In Progress

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | ① 크롤링 소스가 지정 소스가 아닌 임의 Google News 집계본으로 수집됨 ② 격주 기사를 담당자가 수동 선별·작성해 뉴스레터 제작에 시간 과다 소요 ③ 관련도/중요도 기반 기사 우선순위화 수단 없음 |
| **Solution** | 26개 지정 소스 RSS/스크래핑 직접 수집 + 6단계 품질 필터(관련성·본문 길이·AI 판별) + 다차원 연관성 스크리닝 + /collect → /screening → /generate 3단계 워크플로 |
| **Function/UX Effect** | 최근 14일 기사를 연관성 점수 순으로 스크리닝 → 체크박스 선택 → 6개 카테고리 뉴스레터 즉시 복사·인쇄 |
| **Core Value** | 뉴스레터 제작 시간을 시간 단위 → 분 단위로 단축, 지정 소스만 사용해 출처 신뢰도 확보 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 소스 신뢰도 + 뉴스레터 제작 자동화로 팀 생산성 향상 |
| **WHO** | 뉴스레터 편집 담당자(1~2명) + 구독 임직원 전체 |
| **RISK** | JS SPA 사이트 스크래핑 불가 → Google News site: 필터로 우회 / localStorage 용량 초과 |
| **SUCCESS** | 26개 소스 중 20개+ 정상 수집 / /collect·/screening·/generate 정상 동작 / 복사 버튼 동작 / 스크리닝 점수화 정상 작동 |
| **SCOPE** | Sprint 1~3: 크롤링·수집·생성 ✅ / Sprint 4~5: 품질 필터 ✅ / Sprint 6: 스크리닝 ✅ / Sprint 7: /collect 통합 + /newsletter-archive 신규 ✅ |

---

## 1. 소스 크롤링 아키텍처 (v2)

### 1.1 수집 방식

| 타입 | 설명 | 적용 소스 수 (활성) |
|------|------|------------|
| `rss` | 공식 RSS 피드 직접 파싱 (rss-parser) | 17개 (15개) |
| `scrape` | Cheerio HTML 스크래핑 (기사 목록 페이지) | 8개 |
| `pdf` | PDF 직접 URL 수집 | 1개 |

> google-news 방식 제거: Cloudflare·SPA 차단으로 신뢰 소스를 직접 RSS/스크래핑으로 대체

### 1.2 소스 현황 (sources.js 기준, 26개 / 24활성)

**글로벌 (13개 활성)**

| # | ID | 이름 | 타입 | 상태 |
|---|-----|------|------|------|
| 1 | energy-storage | Energy Storage News | rss | ✅ |
| 2 | canary-media | Canary Media | rss (키워드 필터) | ✅ |
| 3 | pv-magazine | PV Magazine | rss | ✅ |
| 4 | cleantechnica | CleanTechnica | rss | ✅ |
| 5 | electrek | Electrek | rss | ⛔ 비활성 (태양광 편향) |
| 6 | iea | IEA | scrape | ✅ |
| 7 | irena | IRENA | pdf | ✅ |
| 8 | bnef | BloombergNEF | rss | ✅ |
| 9 | windpower-monthly | WindPower Monthly | rss | ✅ |
| 10 | world-nuclear-news | World Nuclear News | rss | ✅ |
| 11 | carbon-brief | Carbon Brief | rss | ✅ |
| 12 | data-center-dynamics | Data Center Dynamics | rss | ✅ |
| 13 | utility-dive | Utility Dive | rss | ✅ |
| 14 | power-magazine | Power Magazine | rss (키워드 필터) | ✅ |
| — | hydrogen-central | Hydrogen Central | rss | ⛔ 비활성 (본문 짧음) |

**국내 (11개 활성)**

| # | ID | 이름 | 타입 | 상태 |
|---|-----|------|------|------|
| 15 | ekn | 에너지경제신문 | scrape | ✅ |
| 16 | electimes | 전기신문 | rss | ✅ |
| 17 | etnews | 전자신문 (Energy) | rss | ✅ |
| 18 | e2news | 이투뉴스 | scrape (S1N4 섹션) | ✅ |
| 19 | energydaily | 에너지데일리 | rss | ✅ |
| 20 | todayenergy | 투데이에너지 | rss | ✅ |
| 21 | energytimes | 에너지타임즈 | rss | ✅ |
| 22 | greenpost | 그린포스트코리아 | rss | ✅ |
| 23 | kea | 한국에너지공단 | scrape | ✅ |
| 24 | igt | 녹색에너지연구원 | scrape | ✅ |
| 25 | kaif | 한국원자력산업협회 | scrape | ✅ |

### 1.3 크롤러 모듈 구조

```
scripts/
  run-crawl.js            ← 메인 진입점 (RSS → Scraping → PDF 순서)
  crawlers/
    sources.js            ← 26개 소스 설정 (rss / scrape / pdf)
    rss-crawler.js        ← RSS 수집
    scraper.js            ← Cheerio HTML 스크래핑
    pdf-crawler.js        ← IRENA PDF 수집
    body-fetcher.js       ← 본문 전문 수집 + 문장 수 판정 (Sprint 4)
    relevance-filter.js   ← 에너지 관련성 키워드 필터 (Sprint 5)
    classifier.js         ← 키워드 기반 토픽 분류 (6개 카테고리)
    summarizer.js         ← Gemini API 번역·요약·토픽 분류 + isEnergyMain 판별
    url-tracker.js        ← URL 중복 제거 (.crawled-urls.json)
```

**6단계 수집 파이프라인**:
```
날짜 필터 → URL 중복 제거 → 링크 유효성(404) → 에너지 관련성 → 본문 길이(≥10문장) → AI 판별(isEnergyMain)
```

### 1.4 데이터 경로

```
public/data/            ← 브라우저 fetch 가능 (Next.js public/)
  daily/YYYY-MM-DD.json ← 날짜별 수집 결과
  biweekly/{id}.json    ← 격주 리포트
  index.json            ← 메타 인덱스
  .crawled-urls.json    ← URL dedup tracker
```

> **변경 이력**: v1의 `data/` → v2에서 `public/data/`로 이동 (클라이언트 fetch 지원)

---

## 2. 기능 요구사항

### 2.1 기존 기능 (유지)

| ID | 요구사항 | 상태 |
|----|---------|------|
| FR-01 | 26개 지정 소스(24활성) 기반 수집 | ✅ 완료 |
| FR-02 | Gemini API 번역·요약 (3문장, 한국어) | ✅ |
| FR-03 | 6개 토픽 자동 분류 | ✅ |
| FR-04 | `public/data/daily/YYYY-MM-DD.json` 저장 | ✅ |
| FR-05 | URL 기준 중복 제거 | ✅ |
| FR-06 | 격주 리포트 생성 (`biweekly-report.js`) | ✅ |
| FR-07 | Fuse.js 클라이언트 검색 | ✅ |
| FR-08 | 토픽 필터 (URL searchParam) | ✅ |
| FR-09 | 날짜별 아카이브 페이지 | ✅ |
| FR-10 | 격주 리포트 상세 페이지 | ✅ |

### 2.2 신규 기능 (v2)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| FR-20 | `/collect` 페이지: 최근 14일 기사 목록 + 체크박스 선택 | High | ✅ 완료 |
| FR-21 | `/collect`: 토픽 필터 버튼 | High | ✅ |
| FR-22 | `/collect`: 체크박스 + localStorage 저장 | High | ✅ |
| FR-23 | `/collect`: 전체 선택/해제 | Medium | ✅ |
| FR-24 | `/collect`: 선택 초기화 버튼 | Medium | ✅ |
| FR-25 | `/generate` 페이지: 선택 기사 뉴스레터 렌더링 | High | ✅ 완료 |
| FR-26 | `/generate`: 6개 토픽 이모지 + 카테고리 구분 | High | ✅ |
| FR-27 | `/generate`: 전체 복사 (plain text) | High | ✅ |
| FR-28 | `/generate`: 인쇄 CSS | Low | ✅ |
| FR-29 | `/generate`: 뒤로 가기 (선택 상태 유지) | Medium | ✅ |
| FR-30 | 기사 본문 10문장 이상 품질 필터 (`body-fetcher.js`) | High | ✅ 완료 |
| FR-31 | 에너지 관련성 키워드 필터 (`relevance-filter.js`) | High | ✅ 완료 |
| FR-32 | `/screening`·`/collect` 페이지: 연관성 다차원 점수화 + 순위 표시 | High | ✅ 완료 |
| FR-33 | `/screening`·`/collect`: 전략 중요도·SK 연관성·중복 감점 배지 | Medium | ✅ |
| FR-34 | `/screening`·`/collect`: 수요 키워드 (아카이브 기반 학습) | Medium | ✅ |
| FR-35 | `/screening`: 표시 개수 선택 (30/50/100/전체, default 30) | Low | ✅ |
| FR-36 | `/collect`: 스크리닝 통합 (screenArticles + 배지 표시) | High | ✅ 완료 |
| FR-37 | `/newsletter-archive`: 확정 뉴스레터 아카이브 목록 | Medium | ✅ 완료 |

---

## 3. Next.js 페이지 구조

### 3.1 전체 라우트

| 경로 | 파일 | 렌더링 | 설명 |
|------|------|--------|------|
| `/` | `app/page.tsx` | SSG | 최신 날짜 기사 목록 |
| `/archive` | `app/archive/page.tsx` | SSG | 날짜 목록 |
| `/archive/[date]` | `app/archive/[date]/page.tsx` | SSG | 날짜별 기사 |
| `/biweekly-report/[id]` | `app/biweekly-report/[reportId]/page.tsx` | SSG | 격주 리포트 |
| `/collect` | `app/collect/page.tsx` | **CSR** | 기사 선택+스크리닝 통합 |
| `/screening` | `app/screening/page.tsx` | **CSR** | 연관성 스크리닝 (Sidebar 진입점) |
| `/generate` | `app/generate/page.tsx` | **CSR** | 뉴스레터 생성 |
| `/newsletter-archive` | `app/newsletter-archive/page.tsx` | **CSR** | 뉴스레터 아카이브 (Sprint 7 신규) |

### 3.2 CSR 페이지 데이터 플로우

```
/collect  (Sprint 7: 스크리닝 통합)
  mount → fetch /data/index.json
        → fetch /data/daily/{date}.json × 14 (최근 14일)
        → screenArticles() 점수화 + 정렬 (screening.ts — 스크리닝 통합)
        → getArchiveEntries() 수요 키워드 분석
        → 기사 목록 렌더링 (연관성 점수·배지·체크박스)
  표시 개수 선택 (50/100/전체)
  토픽 필터 클릭 → 해당 토픽 기사만 표시
  체크박스 클릭 → localStorage 저장
  [선택 초기화] → localStorage 선택 항목 초기화
  [뉴스레터 생성하기 →] → /generate  (스크리닝 경유 제거)

/screening  (Sidebar "기사 선택" 기본 진입점)
  mount → fetch /data/index.json
        → fetch /data/daily/{date}.json × 14
        → screenArticles({limit:30, categoryMax:8, sourceMax:4}) 점수화 + 정렬
        → getArchiveEntries() 수요 키워드 분석
  표시 개수 선택 (30/50/100/전체)
  기사 클릭 → 선택/해제, localStorage 저장
  [뉴스레터 생성하기 →] → /generate

/generate
  mount → localStorage 읽기 (selectedIds)
        → fetch /data/index.json
        → fetch /data/daily/{date}.json × 14
        → selectedIds 기준 필터링
        → 토픽별 그룹핑 렌더링
  [복사] → navigator.clipboard.writeText(plainText)
  [← 기사 선택으로] → /collect (localStorage 상태 유지)
```

### 3.3 localStorage 스키마

```typescript
// Key: 'newsletter-selection'
interface NewsletterSelection {
  reportId: string       // 'YYYY-BW##'
  selectedIds: string[]  // article.id 배열
  updatedAt: string      // ISO8601
}
```

### 3.4 토픽 카테고리

| 이모지 | 카테고리 | TopicId |
|-------|---------|---------|
| ⚡ | 전력 인프라 | `전력 인프라` |
| ☀️ | 에너지원 | `에너지원` |
| 📋 | 운영 최적화 | `운영 최적화` |
| 📋 | 정책·규제 | `정책·규제` |
| 🌿 | ESG·탄소중립 | `ESG·탄소중립` |
| 📈 | 시장·가격 동향 | `시장·가격 동향` |

---

## 4. 컴포넌트 구조

```
src/
  app/
    page.tsx                        ← SSG 홈 (최신 기사)
    archive/
      page.tsx                      ← SSG 아카이브 목록
      [date]/page.tsx               ← SSG 날짜별 기사
    biweekly-report/
      [reportId]/page.tsx           ← SSG 격주 리포트
    collect/
      page.tsx                      ← CSR 기사 선택 ('use client')
    screening/
      page.tsx                      ← CSR 연관성 스크리닝 ('use client') — Sprint 6
    generate/
      page.tsx                      ← CSR 뉴스레터 생성 ('use client')
    layout.tsx
  components/
    Header.tsx                      ← 헤더 (뉴스레터 생성 버튼 포함)
    Footer.tsx                      ← 푸터 (링크 포함)
    Sidebar.tsx                     ← 좌측 네비게이션
    NewsCard.tsx                    ← 기사 카드
    NewsGrid.tsx                    ← 기사 그리드
    TopicFilter.tsx                 ← 토픽 필터 칩
    TopicBadge.tsx                  ← 토픽 뱃지
    TranslationBadge.tsx            ← 번역 뱃지
    SearchBar.tsx                   ← 검색바
    BiweeklyReport.tsx              ← 격주 리포트 컴포넌트
    ArchiveList.tsx                 ← 아카이브 목록
  lib/
    types.ts                        ← 타입 정의 (Article, ScoredArticle 등)
    data.ts                         ← 서버사이드 data fetcher (fs 기반)
    constants.ts                    ← TOPICS 정의
    screening.ts                    ← screenArticles(), computeDemandKeywords() — Sprint 6
    newsletter-archive.ts           ← getArchiveEntries() — 수요 키워드 분석용
    search.ts                       ← Fuse.js 검색
```

---

## 5. Article 타입 (v2)

```typescript
interface Article {
  id: string
  source: string
  sourceId: string
  sourceOrigin: 'domestic' | 'global'  // v2 추가
  originalLang: string
  isTranslated: boolean
  title: string
  titleOriginal: string | null
  summary: string
  topics: TopicId[]
  publishedAt: string
  originalUrl: string
  collectedAt: string
}
```

---

## 6. 성공 기준

### 6.1 크롤링

- [x] 수집 기사의 `sourceId`가 sources.js ID와 매칭
- [x] 26개 소스 중 20개 이상 정상 수집
- [x] 에너지 관련성 필터 정상 동작 (무관 기사 제외)
- [x] 본문 10문장 이상 품질 필터 정상 동작

### 6.2 `/collect`

- [x] 최근 14일 기사 목록 표시
- [x] 토픽 필터 + 체크박스 선택 동작
- [x] localStorage 저장 → 새로고침 후 선택 유지
- [x] 선택 초기화 버튼 동작

### 6.3 `/screening`

- [x] 연관성 점수 순 정렬 표시
- [x] 전략 중요도·SK 연관성·중복 감점 배지 표시
- [x] 수요 키워드 (아카이브 기반) 활성화
- [x] 표시 개수 선택 (50/100/전체)

### 6.4 `/generate`

- [x] 선택 기사가 6개 카테고리로 분류됨
- [x] 이모지 + 카테고리명 표시
- [x] 복사 버튼으로 뉴스레터 전문 클립보드 복사
- [x] 인쇄 버튼 동작

---

## 7. 리스크

| 리스크 | 대응 |
|-------|------|
| CSS 셀렉터 변경으로 스크래핑 실패 | 소스별 개별 검증, warn 로그로 빠른 감지 |
| Cloudflare/SPA 차단 소스 | RSS 또는 직접 스크래핑으로 대체 (google-news 방식 제거) |
| localStorage 용량 초과 | 최대 200개 ID 제한 (필요 시 추가) |
| SSG + CSR 혼용 하이드레이션 | /collect, /screening, /generate는 `'use client'`로 완전 CSR |
| daily 파일 없을 때 | 클라이언트 fetch로 graceful 처리 (null 반환 무시) |
| 스크리닝 점수 오배정 | TOPICS 키워드·STRATEGIC_SIGNALS 주기적 검토 및 업데이트 |

---

## 8. 구현 체크리스트

### Sprint 1 — 크롤링 수정 ✅

- [x] `sources.js` 재작성 (26개 소스, rss/scrape/pdf 타입)
- [x] `scraper.js` 신규 개발 (Cheerio, 멀티 셀렉터, onclick 패턴 지원)
- [x] `rss-crawler.js` 수정 (enabled 필터, sourceOrigin 필드)
- [x] `run-crawl.js` 수정 (소스 타입별 분기)
- [x] `data/` → `public/data/` 이동 (클라이언트 fetch 지원)

### Sprint 2 — `/collect` ✅

- [x] `src/app/collect/page.tsx` 구현 (`'use client'`)
- [x] 최근 14일 기사 목록 표시
- [x] 토픽 필터 버튼
- [x] 기사 카드 + 체크박스
- [x] localStorage 선택 상태 저장/복원
- [x] 선택 초기화 버튼

### Sprint 3 — `/generate` ✅

- [x] `src/app/generate/page.tsx` 구현 (`'use client'`)
- [x] localStorage에서 선택 기사 로드
- [x] 6개 토픽 이모지 + 카테고리 섹션
- [x] plain text 복사 버튼
- [x] 인쇄 CSS

### Sprint 4 — 본문 길이 필터 ✅

- [x] `body-fetcher.js` 신규 개발 (Cheerio 본문 수집, countSentences)
- [x] `rss-crawler.js` + `scraper.js` 연동 (10문장 미만 제외)

### Sprint 5 — 에너지 관련성 필터 ✅

- [x] `relevance-filter.js` 신규 개발 (ENERGY_KW_KO/EN, TRUSTED_ENERGY_SOURCES)
- [x] `rss-crawler.js` + `scraper.js` 연동 (isEnergyRelevant 필터)
- [x] EXCLUDE_KW (선거·부동산·쇼핑 기사 제외)

### Sprint 6 — 연관성 스크리닝 ✅

- [x] `src/lib/screening.ts` 신규 개발 (screenArticles, computeDemandKeywords)
- [x] 14개 차원 점수화: AI 토픽·키워드·최신성·수요·전략 신호·SK 연관·소스 신뢰도·수량 패턴
- [x] 중복 감점 (Jaccard ≥ 0.4 → -15점)
- [x] `src/app/screening/page.tsx` 구현 (배지·순위·표시 개수 선택)

### Sprint 7 — /collect 스크리닝 통합 + /newsletter-archive 신규 ✅

- [x] `/collect` 페이지에 screenArticles() 통합 (점수·배지·순위 표시)
- [x] `/collect` CTA를 "/generate" 직접 연결로 변경 (screening 경유 제거)
- [x] `/screening` LimitOption에 30 추가 (기본값 30으로 변경)
- [x] `screenArticles` ScreeningOptions API 확장 + Pass 3 Greedy Diversity Selection
- [x] `Article.primaryTopic` 필드 추가 (types.ts)
- [x] `isEnergyRelevant` sourceId 파라미터 추가 + TRUSTED_ENERGY_SOURCES bypass
- [x] `/newsletter-archive` 페이지 신규 구현
- [x] `Sidebar` 네비게이션 재구성: "기사 선택" → /screening, "뉴스레터 아카이브" 추가

### 공통

- [x] `Article.sourceOrigin` 타입 추가
- [x] `Header` / `Footer` / `Sidebar` 네비게이션 링크
- [x] WDS 디자인 시스템 통합 (Pretendard, #0066FF 등)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-27 | 초안 (Plan Plus 브레인스토밍) |
| 1.3 | 2026-04-29 | v1 구현 완료 상태 반영 |
| 2.0 | 2026-04-30 | v2 전면 개정: 소스 수정 + /select·/newsletter 추가, data→public/data 이동 |
| 2.3 | 2026-05-18 | 구현 현황 반영: 26개 소스, google-news 제거, /collect·/screening·/generate, Sprint 4~6, 6단계 파이프라인 |
| 2.4 | 2026-05-21 | Sprint 7 반영: /collect 스크리닝 통합, /newsletter-archive 신규 라우트, FR-36·FR-37 추가, FR-35 옵션 30 추가, Sidebar 재구성, Sprint 7 체크리스트 |
