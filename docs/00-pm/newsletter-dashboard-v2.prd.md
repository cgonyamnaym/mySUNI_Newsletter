---
template: prd
version: 2.0
feature: newsletter-dashboard-v2
date: 2026-04-29
author: hyeokyeong@gmail.com
project: 에너지 인사이트 뉴스레터 대시보드 v2.0
status: Draft
---

# 에너지 인사이트 뉴스레터 대시보드 v2.0 — PRD

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | ① 크롤링 소스가 `source_websites.csv`의 지정 20개 사이트가 아닌 Google News RSS 집계본으로 대체되어 정보 출처 신뢰도·추적성이 결여됨 ② 격주 수집 기사를 담당자가 수동으로 검토해 뉴스레터를 작성하는 데 과도한 시간이 소요됨 |
| **Solution** | `source_websites.csv` 기반의 정확한 소스 크롤링 + **기사 선택 UI(Page 1)** → **자동 뉴스레터 생성(Page 2)** 2-페이지 워크플로 구축 |
| **Function/UX Effect** | 격주 수집 기사를 담당자가 브라우저에서 클릭 선택하면 카테고리(6개)·이모지 포함 뉴스레터가 즉시 미리보기·복사 가능한 형태로 생성됨 |
| **Core Value** | 에너지 뉴스레터 제작 시간을 시간 단위에서 분 단위로 단축, 지정 소스의 기사만 사용해 출처 신뢰도 확보 |

---

## 1. 배경 및 문제 정의

### 1.1 크롤링 소스 오류

현재 `scripts/crawlers/sources.js`는 `source_websites.csv`에 명시된 20개 사이트를 직접 크롤링하지 않고 **Google News RSS 집계 피드**를 사용한다. 이로 인해:

- 지정 소스 외 기사가 수집될 수 있음
- 특정 사이트 기사가 누락될 수 있음
- 기사 출처 추적이 불가능 (원문 소스가 Google News로 표시)

**필수 수정**: `source_websites.csv` 의 20개 사이트로부터만 수집해야 한다.

### 1.2 뉴스레터 제작 프로세스의 비효율

현재 흐름:
```
격주 기사 수집 → 담당자가 수동으로 기사 검토·선별 → 외부 도구(Notion·메일)에서 뉴스레터 수동 작성 → 배포
```

목표 흐름:
```
격주 기사 수집 → 대시보드에서 기사 선택(Page 1) → 뉴스레터 자동 생성(Page 2) → 복사·배포
```

---

## 2. 대상 사용자

| 페르소나 | 역할 | 니즈 |
|---------|------|------|
| **뉴스레터 편집 담당자** | 격주 뉴스레터 제작 (1~2명) | 기사를 빠르게 훑고 선별, 뉴스레터 초안을 바로 얻고 싶음 |
| **팀 열람자** | 뉴스레터 구독 (전체 임직원) | 카테고리별로 정리된 기사를 보기 쉽게 소비 |

---

## 3. 소스 크롤링 요구사항

### 3.1 지정 소스 목록 (`source_websites.csv`)

| # | 사이트명 | URL | 언어 | 유형 |
|---|---------|-----|------|------|
| 1 | IRENA | https://www.irena.org | en | 기관 보고서 |
| 2 | BloombergNEF | https://about.bnef.com | en | 전문 미디어 |
| 3 | Reuters Energy | https://www.reuters.com/business/energy | en | 뉴스 미디어 |
| 4 | Energy Storage News | https://www.energy-storage.news | en | RSS ✅ |
| 5 | Renewables Now | https://renewablesnow.com | en | 뉴스 미디어 |
| 6 | PV Magazine | https://www.pv-magazine.com | en | 전문 미디어 |
| 7 | IEA | https://www.iea.org | en | 기관 보고서 |
| 8 | Canary Media | https://www.canarymedia.com | en | RSS ✅ |
| 9 | 산업통상자원부 (MOTIE) | https://www.motie.go.kr | ko | 정부 기관 |
| 10 | 에너지경제신문 | https://www.ekn.kr | ko | 뉴스 미디어 |
| 11 | 전기신문 | https://www.electimes.com | ko | 뉴스 미디어 |
| 12 | 전자신문 (Energy) | https://www.etnews.com | ko | 뉴스 미디어 |
| 13 | 한국에너지공단 (KEA) | https://www.energy.or.kr | ko | 기관 공지 |
| 14 | 이투뉴스 (E2News) | https://www.e2news.com | ko | 뉴스 미디어 |
| 15 | 뉴스1 (Energy) | https://www.news1.kr | ko | 뉴스 미디어 |
| 16 | Slowly Beautiful | https://www.slowlybeautiful.com | en | 블로그/미디어 |
| 17 | 녹색에너지연구원 (IGT) | https://igt.or.kr/bbs/board.php?bo_table=m03_03 | ko | 연구 게시판 |
| 18 | 투데이에너지 | https://www.todayenergy.kr | ko | 뉴스 미디어 |
| 19 | 에너지타임즈 | https://www.energytimes.kr | ko | 뉴스 미디어 |

### 3.2 RSS 피드 발견 전략

각 소스별로 다음 우선순위로 수집:

```
Priority 1: 공식 RSS 피드 (직접 URL)
Priority 2: Cheerio HTML 스크래핑 (헤드라인 + 링크)
Priority 3: Google News RSS (해당 사이트 site: 필터)
             → https://news.google.com/rss/search?q=site:ekn.kr
```

| 소스 | 수집 방식 | 검증된 URL | 검증 결과 |
|------|----------|-----------|----------|
| Energy Storage News | **RSS** | `https://www.energy-storage.news/feed/` | ✅ RSS 확인 (64KB) |
| Canary Media | **RSS** | `https://www.canarymedia.com/feed` | ✅ RSS 확인 (91KB) |
| PV Magazine | **RSS** | `https://www.pv-magazine.com/feed/` | ✅ RSS 확인 (152KB) |
| IEA | **스크래핑** | `https://www.iea.org/news` | ✅ 200 (358KB) — RSS 차단됨 |
| Reuters Energy | **Google News site:** | `site:reuters.com/business/energy` | ✅ RSS 확인 (127KB) |
| BloombergNEF | **Google News site:** | `site:about.bnef.com` | ✅ RSS 100건 — JS SPA라 직접 스크래핑 불가 |
| 에너지경제신문 | **스크래핑** | `https://www.ekn.kr/web/newsTotalList.php` | ✅ 200 (100KB) |
| 전기신문 | **스크래핑** | `https://www.electimes.com/news/articleList.html?sc_section_code=S1N41&view_type=sm` | ✅ 200 (96KB) |
| 이투뉴스 | **스크래핑** | `https://www.e2news.com/news/articleList.html?view_type=sm` | ✅ 200 (99KB) |
| 투데이에너지 | **스크래핑** | `https://www.todayenergy.kr/news/articleList.html?view_type=sm` | ✅ 200 (67KB) |
| 에너지타임즈 | **스크래핑** | `https://www.energytimes.kr/news/articleList.html?view_type=sm` | ✅ 200 (45KB) |
| 뉴스1 (Energy) | **스크래핑** | `https://www.news1.kr/latest` | ✅ 200 (175KB) |
| 산업통상자원부 (MOTIE) | **Google News site:** | `site:motie.go.kr 에너지 보도자료` | ✅ RSS 100건 — JS SPA라 직접 스크래핑 불가 |
| 한국에너지공단 (KEA) | **스크래핑** | `https://www.energy.or.kr/front/board/List3.do` | ✅ 200 (82KB) |
| IRENA | **스크래핑** | `https://www.irena.org/News` | ✅ 200 (152KB) |
| Renewables Now | **스크래핑** | `https://renewablesnow.com/news/` | ✅ 200 (446KB) — RSS 404 |
| Slowly Beautiful | **비활성화** | — | ⚠️ 사이트에 콘텐츠 없음("준비중"), 활성화 불가 |
| 전자신문 (Energy) | **Google News site:** | `site:etnews.com 에너지` | ✅ RSS 확인 (79KB) |
| 녹색에너지연구원 | **스크래핑** | `https://igt.or.kr/bbs/board.php?bo_table=m03_03` | ✅ 200 (66KB) |

### 3.3 `sources.json` 스키마 (v2)

```json
{
  "id": "ekn",
  "name": "에너지경제신문",
  "url": "https://www.ekn.kr",
  "origin": "domestic",
  "lang": "ko",
  "type": "rss | scrape | google-news-site",
  "rssUrl": "https://news.google.com/rss/search?q=site:ekn.kr+에너지",
  "scrapeSelector": "a.article-title",
  "enabled": true
}
```

---

## 4. 기능 요구사항

### 4.1 Page 1 — 격주 기사 선택 (`/select`)

#### 4.1.1 화면 구성

```
┌──────────────────────────────────────────────────────┐
│  Header: 에너지 인사이트                               │
├──────────────────────────────────────────────────────┤
│  [기간 선택] 2026. 04. 14. – 2026. 04. 28.  ▼         │
│  [전체] [전력 인프라] [에너지원] [운영 최적화]           │
│         [정책·규제] [ESG·탄소중립] [시장·가격 동향]    │
├──────────────────────────────────────────────────────┤
│  선택된 기사: 0개   [뉴스레터 생성 →]                  │
├──────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐ │
│  │ ☐ [에너지경제신문] 2026. 04. 28.                │ │
│  │   ⚡ 전력 인프라                                 │ │
│  │   **한전, 초고압 직류 송전망 2030년까지 확대**   │ │
│  │   한국전력이 서해안·동해안을 잇는 HVDC 직류 송전  │ │
│  │   인프라를 2030년까지 5,000km 확대 구축한다고    │ │
│  │   발표했다. 총 투자 규모는 4조 원 수준이며...     │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ☑ [Canary Media] 2026. 04. 27.  [번역]         │ │
│  │   ☀️ 에너지원                                   │ │
│  │   **US Solar Installations Hit Record in Q1**  │ │
│  │   미국 1분기 태양광 설치량이 역대 최고치를 기록했 │ │
│  │   다. 주거용 설치가 전년 대비 32% 증가했으며...  │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

#### 4.1.2 기능 명세

| ID | 기능 | 상세 |
|----|------|------|
| F-01 | 격주 기간 선택 | dropdown으로 `availableReports` 목록 표시, 기본값: 최신 격주 |
| F-02 | 기사 목록 표시 | 해당 격주의 `daily/*.json` 파일을 날짜 범위로 집계·표시 |
| F-03 | 3줄 요약 표시 | 각 기사의 `summary` 필드 (3문장 분량), 외국어 기사는 한국어 번역본 |
| F-04 | 토픽 필터 | 6개 카테고리 버튼 (전체 포함), URL searchParam 기반 |
| F-05 | 기사 선택/해제 | 체크박스 클릭으로 선택 토글 |
| F-06 | 전체 선택/해제 | 필터 결과 전체 선택/해제 버튼 |
| F-07 | 선택 상태 유지 | `localStorage`에 선택된 article ID 목록 저장 |
| F-08 | 뉴스레터 생성 버튼 | 선택 기사 > 0개일 때 활성화, Page 2로 이동 |
| F-09 | 소스 뱃지 | 각 카드에 출처 사이트명 표시 |
| F-10 | 번역 뱃지 | `isTranslated: true` 기사에 [번역] 뱃지 표시 |

### 4.2 Page 2 — 뉴스레터 미리보기 (`/newsletter`)

#### 4.2.1 화면 구성

```
┌──────────────────────────────────────────────────────┐
│  [← 기사 선택으로]            [복사] [인쇄]           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  에너지 인사이트                                      │
│  2026년 4월 14일 – 4월 28일 | 제8호                  │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  ⚡ 전력 인프라                                      │
│  ─────                                               │
│  • **한전, 초고압 직류 송전망 2030년까지 확대**       │
│    한국전력이 HVDC 직류 송전 인프라를 2030년까지      │
│    5,000km 확대 구축한다고 발표했다. 총 투자 규모는   │
│    4조 원 수준이며 서해안·동해안을 연결한다.          │
│    [원문 보기 →]                                     │
│                                                      │
│  ☀️ 에너지원                                        │
│  ─────                                               │
│  • **US Solar Installations Hit Record in Q1**       │
│    미국 1분기 태양광 설치량이 역대 최고치를 기록했다. │
│    주거용 설치가 전년 대비 32% 증가했으며...          │
│    [원문 보기 →]  [Canary Media]                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 4.2.2 기능 명세

| ID | 기능 | 상세 |
|----|------|------|
| F-11 | 선택 기사 로드 | `localStorage`에서 선택 ID 읽어 해당 기사 데이터 조회 |
| F-12 | 카테고리별 구분 | 6개 토픽 순서대로 섹션 분리, 기사 없는 토픽은 섹션 미표시 |
| F-13 | 카테고리 이모지·제목 | 토픽별 이모지 + 한글 카테고리명 표시 |
| F-14 | 기사 블록 | 제목 (굵게) + 3줄 요약 + 출처명 + 원문 링크 |
| F-15 | 텍스트 복사 | 뉴스레터 전체를 마크다운 또는 plain text로 클립보드 복사 |
| F-16 | 뒤로 가기 | Page 1으로 돌아가기 (선택 상태 유지) |
| F-17 | 발행 정보 | 기간 (startDate – endDate), 리포트 번호 표시 |
| F-18 | 카테고리 순서 | ⚡전력 인프라 → ☀️에너지원 → 📋운영 최적화 → 📋정책·규제 → 🌿ESG·탄소중립 → 📈시장·가격 동향 |

#### 4.2.3 토픽 카테고리 정의

| 이모지 | 카테고리 | TopicId |
|-------|---------|---------|
| ⚡ | 전력 인프라 | `전력 인프라` |
| ☀️ | 에너지원 | `에너지원` |
| 📋 | 운영 최적화 | `운영 최적화` |
| 📋 | 정책·규제 | `정책·규제` |
| 🌿 | ESG·탄소중립 | `ESG·탄소중립` |
| 📈 | 시장·가격 동향 | `시장·가격 동향` |

---

## 5. 데이터 모델 변경사항

### 5.1 `sources.json` v2 스키마

```typescript
interface Source {
  id: string
  name: string
  url: string                                   // 사이트 메인 URL
  origin: 'domestic' | 'global'
  lang: 'ko' | 'en'
  type: 'rss' | 'scrape' | 'google-news-site'   // 수집 방식
  rssUrl?: string                               // RSS URL (type=rss일 때)
  googleNewsSiteQuery?: string                  // site: 쿼리 (type=google-news-site)
  scrapeConfig?: {                              // 스크래핑 설정
    listUrl: string                             // 목록 페이지 URL
    titleSelector: string                       // 제목 CSS 선택자
    linkSelector: string                        // 링크 CSS 선택자
    dateSelector?: string                       // 날짜 CSS 선택자 (선택)
  }
  enabled: boolean
}
```

### 5.2 `Article` 타입 추가 필드

```typescript
interface Article {
  // 기존 필드 유지
  id: string
  source: string
  sourceId: string         // sources.json의 id와 매칭
  originalLang: string
  isTranslated: boolean
  title: string
  titleOriginal: string | null
  summary: string          // 3문장 분량 보장 (Gemini 프롬프트 강화)
  topics: TopicId[]
  publishedAt: string
  originalUrl: string
  collectedAt: string
  // 추가 필드
  sourceOrigin: 'domestic' | 'global'  // 국내/해외 구분
}
```

### 5.3 선택 상태 저장 (`localStorage`)

```typescript
// Key: 'newsletter-selection'
interface NewsletterSelection {
  reportId: string        // 어떤 격주 리포트 기준인지
  selectedIds: string[]   // 선택된 article.id 목록
  updatedAt: string       // ISO8601
}
```

---

## 6. 기술 아키텍처

### 6.1 Page 1/2 렌더링 방식

Page 1과 Page 2는 `localStorage` 기반 상태를 사용하므로 **Client Component** (`'use client'`) 로 구현:

```
/select                → 'use client' (선택 상태 관리)
/newsletter            → 'use client' (localStorage에서 선택 로드)
```

기존 SSG 페이지 (`/`, `/archive/*`, `/biweekly-report/*`)는 변경 없음.

### 6.2 데이터 접근 (`/select` 페이지)

`/select` 페이지는 격주 기간의 `daily/*.json` 파일들을 집계:

```
선택된 reportId (예: 2026-BW08)
  → startDate, endDate 추출
  → availableDates에서 해당 범위의 날짜 목록 필터
  → 각 날짜의 daily/{date}.json 로드
  → 모든 기사 flatten + 중복 제거 (originalUrl 기준)
```

SSG이므로 빌드 시 또는 클라이언트에서 `/data/daily/*.json` JSON fetch.

### 6.3 크롤러 수정 방향

```
scripts/crawlers/sources.json      ← source_websites.csv 기반 재작성
scripts/crawlers/rss-crawler.js    ← rss / google-news-site 타입 처리
scripts/crawlers/scraper.js        ← 신규: Cheerio HTML 스크래핑
scripts/crawlers/source-loader.js  ← sources.json 로드 + 라우팅
scripts/run-crawl.js               ← 수정: 소스 타입별 분기 처리
```

---

## 7. 기능 요구사항 목록 (v2 전체)

### 기존 기능 (유지/수정)

| ID | 요구사항 | 상태 |
|----|---------|------|
| FR-01 | 지정 소스 기반 크롤링 (`source_websites.csv` 20개) | 🔴 Bug Fix 필요 |
| FR-02 | Gemini API 번역·요약 (3문장 보장) | ⚠️ 프롬프트 강화 필요 |
| FR-03 | 6개 토픽 자동 분류 | ✅ 유지 |
| FR-04 | `data/daily/YYYY-MM-DD.json` 저장 | ✅ 유지 |
| FR-05 | URL 중복 제거 | ✅ 유지 |
| FR-06 | 격주 리포트 생성 | ✅ 완료 |
| FR-07 | Fuse.js 검색 | ✅ 유지 |
| FR-08 | 토픽 필터 | ✅ 유지 |
| FR-09 | 날짜별 아카이브 | ✅ 유지 |
| FR-10 | 격주 리포트 상세 페이지 | ✅ 유지 |

### 신규 기능 (v2)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-20 | `/select` 페이지: 격주 기사 목록 + 선택 UI | High |
| FR-21 | `/select`: 격주 기간 드롭다운 선택 | High |
| FR-22 | `/select`: 체크박스 선택/해제 + localStorage 저장 | High |
| FR-23 | `/select`: 전체 선택/해제 버튼 | Medium |
| FR-24 | `/select`: 토픽 필터 (선택 화면에서도 동작) | Medium |
| FR-25 | `/newsletter` 페이지: 선택 기사 카테고리별 뉴스레터 렌더링 | High |
| FR-26 | `/newsletter`: 6개 토픽 이모지 + 카테고리 구분 | High |
| FR-27 | `/newsletter`: 전체 복사 (plain text / 마크다운) | High |
| FR-28 | `/newsletter`: 인쇄 최적화 (print CSS) | Low |
| FR-29 | `/newsletter`: 뒤로 가기 (선택 상태 유지) | Medium |

---

## 8. 성공 기준 (v2)

### 8.1 크롤링

- [ ] 수집 기사의 `sourceId`가 `source_websites.csv` ID와 100% 매칭
- [ ] 20개 소스 중 15개 이상 정상 수집 (75% 이상)
- [ ] Google News 집계 소스 비중 0% (site: 필터는 허용)

### 8.2 Page 1

- [ ] 격주 기간 기사 전체 목록 표시 (평균 50개+ 기사)
- [ ] 토픽 필터 + 체크박스 선택 정상 동작
- [ ] `localStorage` 저장 → 새로고침 후 선택 유지

### 8.3 Page 2

- [ ] 선택 기사가 6개 카테고리로 올바르게 분류됨
- [ ] 이모지 + 카테고리명 표시
- [ ] 복사 버튼으로 뉴스레터 전문 클립보드 복사 동작

---

## 9. 리스크

| 리스크 | 영향 | 대응 |
|-------|------|------|
| 국내 언론사 RSS 미지원 → Google News site: 필터로 우회 시 일부 누락 | Medium | 수집 성공률 모니터링, 실패 소스 warn 로그 |
| Reuters·BloombergNEF 페이월/봇 차단 | Medium | Google News site: 필터로 공개 기사만 수집, 완전 차단 시 소스 비활성화 |
| `localStorage` 용량 초과 (많은 기사 선택 시) | Low | 최대 200개 기사 ID만 저장, 초과 시 가장 오래된 항목 제거 |
| SSG + Client 혼용으로 인한 하이드레이션 불일치 | Low | `/select`, `/newsletter` 페이지에 `dynamic = 'force-dynamic'` 또는 완전 CSR 처리 |
| 격주 기간의 daily 파일이 빌드 시에 없을 경우 | Low | 클라이언트에서 `/data/daily/*.json` 동적 fetch로 처리 |

---

## 10. 구현 우선순위 (Sprint Plan)

### Sprint 1 — 크롤링 소스 수정 (긴급)
1. `sources.json` 재작성 — 20개 사이트 기반
2. Google News site: 필터 타입 지원 (`google-news-site`)
3. Cheerio 스크래핑 모듈 신규 개발 (MOTIE·KEA·IRENA 등)
4. 크롤링 실행 테스트 + 수집률 검증

### Sprint 2 — Page 1 (기사 선택 UI)
5. `/select` 페이지 컴포넌트 개발
6. 격주 기간 드롭다운
7. 기사 카드 + 체크박스
8. localStorage 선택 상태 관리

### Sprint 3 — Page 2 (뉴스레터 생성)
9. `/newsletter` 페이지 컴포넌트 개발
10. 토픽별 섹션 렌더링 + 이모지
11. 복사 기능
12. 인쇄 CSS

---

## 11. 범위 외 (Out of Scope)

- 뉴스레터 이메일 자동 발송
- 사용자 인증/로그인
- 서버 API (계속 Zero-Server 아키텍처 유지)
- AI 자동 기사 선택/추천
- 뉴스레터 HTML 이메일 템플릿 생성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | 2026-04-29 | v2 PRD 신규 작성: 소스 오류 수정 요구사항 + 2-페이지 뉴스레터 워크플로 | hyeokyeong@gmail.com |