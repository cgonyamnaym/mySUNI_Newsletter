---
template: plan
version: 2.0
feature: newsletter-dashboard
date: 2026-04-30
author: hyeokyeong@gmail.com
project: 에너지 뉴스레터 대시보드
---

# 뉴스레터 대시보드 v2 — Planning Document

> **Summary**: 지정 소스(source_websites.csv) 19개로부터만 수집·분류·요약하고, 기사 선택 UI(Page 1) → 뉴스레터 자동 생성(Page 2) 워크플로를 제공하는 정적 웹 대시보드
>
> **Version**: 2.0 (v1 → v2: 소스 정확도 수정 + 2-페이지 뉴스레터 워크플로 추가)
> **Status**: In Progress

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | ① 크롤링 소스가 source_websites.csv 지정 소스가 아닌 임의 Google News 집계본으로 수집됨 ② 격주 기사를 담당자가 수동 선별·작성해 뉴스레터 제작에 시간 과다 소요 |
| **Solution** | source_websites.csv 기반 RSS/스크래핑/Google-News-site 3방식 혼합 수집 + 기사 선택 UI(Page 1) → 카테고리별 뉴스레터 자동 생성(Page 2) |
| **Function/UX Effect** | 격주 기사를 브라우저에서 체크박스 선택 → 6개 카테고리·이모지 뉴스레터를 즉시 복사·인쇄 가능한 형태로 생성 |
| **Core Value** | 뉴스레터 제작 시간을 시간 단위 → 분 단위로 단축, 지정 소스만 사용해 출처 신뢰도 확보 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 소스 신뢰도 + 뉴스레터 제작 자동화로 팀 생산성 향상 |
| **WHO** | 뉴스레터 편집 담당자(1~2명) + 구독 임직원 전체 |
| **RISK** | JS SPA 사이트 스크래핑 불가 → Google News site: 필터로 우회 / localStorage 용량 초과 |
| **SUCCESS** | 19개 소스 중 15개+ 정상 수집(75%+) / /select·/newsletter 페이지 정상 동작 / 복사 버튼 동작 |
| **SCOPE** | Sprint 1: 크롤링 수정 / Sprint 2: Page 1(/select) / Sprint 3: Page 2(/newsletter) |

---

## 1. 소스 크롤링 아키텍처 (v2)

### 1.1 수집 방식 3종

| 타입 | 설명 | 적용 소스 수 |
|------|------|------------|
| `rss` | 공식 RSS 피드 직접 파싱 (rss-parser) | 3개 |
| `google-news` | Google News `site:` 필터 RSS (JS SPA / RSS 차단 소스) | 8개 |
| `scrape` | Cheerio HTML 스크래핑 (기사 목록 페이지) | 8개 |

### 1.2 소스 현황 (sources.js 기준)

| # | ID | 이름 | 타입 | 상태 |
|---|-----|------|------|------|
| 1 | energy-storage-news | Energy Storage News | rss | ✅ |
| 2 | canary-media | Canary Media | rss | ✅ |
| 3 | pv-magazine | PV Magazine | rss | ✅ |
| 4 | reuters-energy | Reuters Energy | google-news | ✅ |
| 5 | bloombergnef | BloombergNEF | google-news | ✅ |
| 6 | irena | IRENA | google-news | ✅ |
| 7 | renewables-now | Renewables Now | google-news | ✅ |
| 8 | motie | 산업통상자원부 | google-news | ✅ |
| 9 | etnews | 전자신문 | google-news | ✅ |
| 10 | news1-energy | 뉴스1 | google-news | ✅ |
| 11 | kea | 한국에너지공단 | google-news | ✅ |
| 12 | iea | IEA | scrape | ✅ `.m-news-detailed-listing__hover` |
| 13 | ekn | 에너지경제신문 | scrape | ✅ |
| 14 | electimes | 전기신문 | scrape | ✅ `.titles a` |
| 15 | e2news | 이투뉴스 | scrape | ✅ `.titles a` |
| 16 | todayenergy | 투데이에너지 | scrape | ✅ `.titles a` |
| 17 | energytimes | 에너지타임즈 | scrape | ✅ `div.list-titles a` |
| 18 | igt | 녹색에너지연구원 | scrape | ✅ `a.item-subject` |
| — | slowly-beautiful | Slowly Beautiful | — | ⛔ 비활성화 (콘텐츠 없음) |

### 1.3 크롤러 모듈 구조

```
scripts/
  run-crawl.js          ← 메인 진입점 (RSS/GNews → Scraping → PDF 순서)
  crawlers/
    sources.js          ← 19개 소스 설정 (rss / google-news / scrape)
    rss-crawler.js      ← RSS + Google News 수집
    scraper.js          ← Cheerio HTML 스크래핑 (신규)
    pdf-crawler.js      ← PDF 파싱 (미사용)
    summarizer.js       ← Gemini API 번역·요약·토픽 분류
    url-tracker.js      ← URL 중복 제거 (.crawled-urls.json)
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
| FR-01 | source_websites.csv 19개 지정 소스 기반 수집 | ✅ 완료 (v2 수정) |
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
| FR-20 | `/select` 페이지: 격주 기사 목록 + 체크박스 선택 | High | ✅ 완료 |
| FR-21 | `/select`: 격주 기간 드롭다운 | High | ✅ |
| FR-22 | `/select`: 체크박스 + localStorage 저장 | High | ✅ |
| FR-23 | `/select`: 전체 선택/해제 | Medium | ✅ |
| FR-24 | `/select`: 토픽 필터 | Medium | ✅ |
| FR-25 | `/newsletter` 페이지: 선택 기사 뉴스레터 렌더링 | High | ✅ 완료 |
| FR-26 | `/newsletter`: 6개 토픽 이모지 + 카테고리 구분 | High | ✅ |
| FR-27 | `/newsletter`: 전체 복사 (plain text) | High | ✅ |
| FR-28 | `/newsletter`: 인쇄 CSS | Low | ✅ |
| FR-29 | `/newsletter`: 뒤로 가기 (선택 상태 유지) | Medium | ✅ |

---

## 3. Next.js 페이지 구조

### 3.1 전체 라우트

| 경로 | 파일 | 렌더링 | 설명 |
|------|------|--------|------|
| `/` | `app/page.tsx` | SSG | 최신 날짜 기사 목록 |
| `/archive` | `app/archive/page.tsx` | SSG | 날짜 목록 |
| `/archive/[date]` | `app/archive/[date]/page.tsx` | SSG | 날짜별 기사 |
| `/biweekly-report/[id]` | `app/biweekly-report/[reportId]/page.tsx` | SSG | 격주 리포트 |
| `/select` | `app/select/page.tsx` | **CSR** | 기사 선택 UI |
| `/newsletter` | `app/newsletter/page.tsx` | **CSR** | 뉴스레터 생성 |

### 3.2 CSR 페이지 데이터 플로우

```
/select
  mount → fetch /data/index.json
        → fetch /data/biweekly/{id}.json  (선택된 reportId)
        → fetch /data/daily/{date}.json × N  (날짜 범위)
        → 기사 목록 렌더링
  체크박스 클릭 → localStorage 저장
  [뉴스레터 생성 →] → /newsletter

/newsletter
  mount → localStorage 읽기 (selectedIds, reportId)
        → fetch /data/biweekly/{id}.json
        → fetch /data/daily/{date}.json × N
        → selectedIds 기준 필터링
        → 토픽별 그룹핑 렌더링
  [복사] → navigator.clipboard.writeText(plainText)
  [← 기사 선택으로] → /select (localStorage 상태 유지)
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
    select/
      page.tsx                      ← CSR 기사 선택 ('use client')
    newsletter/
      page.tsx                      ← CSR 뉴스레터 생성 ('use client')
    layout.tsx
  components/
    Header.tsx                      ← 헤더 (뉴스레터 생성 버튼 포함)
    Footer.tsx                      ← 푸터 (뉴스레터 생성 링크 포함)
    NewsCard.tsx                    ← 기사 카드
    NewsGrid.tsx                    ← 기사 그리드
    TopicFilter.tsx                 ← 토픽 필터 칩
    TopicBadge.tsx                  ← 토픽 뱃지
    TranslationBadge.tsx            ← 번역 뱃지
    SearchBar.tsx                   ← 검색바
    BiweeklyReport.tsx              ← 격주 리포트 컴포넌트
    ArchiveList.tsx                 ← 아카이브 목록
  lib/
    types.ts                        ← 타입 정의 (Article, BiweeklyData 등)
    data.ts                         ← 서버사이드 data fetcher (fs 기반)
    constants.ts                    ← TOPICS 정의
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
- [x] 19개 소스 중 15개 이상 정상 수집
- [x] "기사 파싱 결과 없음" 오류 0건

### 6.2 Page 1 (`/select`)

- [x] 격주 기간 기사 목록 표시
- [x] 토픽 필터 + 체크박스 선택 동작
- [x] localStorage 저장 → 새로고침 후 선택 유지

### 6.3 Page 2 (`/newsletter`)

- [x] 선택 기사가 6개 카테고리로 분류됨
- [x] 이모지 + 카테고리명 표시
- [x] 복사 버튼으로 뉴스레터 전문 클립보드 복사

---

## 7. 리스크

| 리스크 | 대응 |
|-------|------|
| JS SPA 사이트 스크래핑 불가 | Google News `site:` 필터 RSS로 전환 (IRENA, News1, KEA 등) |
| CSS 셀렉터 변경으로 스크래핑 실패 | 소스별 개별 검증, warn 로그로 빠른 감지 |
| localStorage 용량 초과 | 최대 200개 ID 제한 (필요 시 추가) |
| SSG + CSR 혼용 하이드레이션 | /select, /newsletter는 `'use client'`로 완전 CSR |
| BW 범위의 daily 파일 없을 때 | 클라이언트 fetch로 graceful 처리 (null 반환 무시) |

---

## 8. 구현 체크리스트

### Sprint 1 — 크롤링 수정 ✅

- [x] `sources.js` 재작성 (19개 소스, rss/google-news/scrape 타입)
- [x] `scraper.js` 신규 개발 (Cheerio, 멀티 셀렉터 지원)
- [x] `rss-crawler.js` 수정 (google-news 타입 지원, enabled 필터)
- [x] `run-crawl.js` 수정 (소스 타입별 3단계 분기)
- [x] 7개 실패 소스 셀렉터 수정 (IEA, EnergyTimes, IGT → scrape / IRENA, News1, KEA, RenNow → google-news)
- [x] `data/` → `public/data/` 이동 (클라이언트 fetch 지원)

### Sprint 2 — Page 1 (/select) ✅

- [x] `src/app/select/page.tsx` 구현 (`'use client'`)
- [x] 격주 기간 드롭다운
- [x] 토픽 필터 버튼
- [x] 기사 카드 + 체크박스
- [x] localStorage 선택 상태 저장/복원

### Sprint 3 — Page 2 (/newsletter) ✅

- [x] `src/app/newsletter/page.tsx` 구현 (`'use client'`)
- [x] localStorage에서 선택 기사 로드
- [x] 6개 토픽 이모지 + 카테고리 섹션
- [x] plain text 복사 버튼
- [x] 인쇄 CSS

### 공통

- [x] `Article.sourceOrigin` 타입 추가
- [x] `rss-crawler.js` `sourceOrigin` 필드 추가
- [x] `Header` 뉴스레터 생성 버튼 추가
- [x] `Footer` 뉴스레터 생성 링크 추가

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-27 | 초안 (Plan Plus 브레인스토밍) |
| 1.3 | 2026-04-29 | v1 구현 완료 상태 반영 |
| 2.0 | 2026-04-30 | v2 전면 개정: 소스 수정 + /select·/newsletter 추가, data→public/data 이동 |
