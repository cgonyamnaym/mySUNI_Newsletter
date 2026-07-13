---
template: design
version: 2.7
feature: newsletter-dashboard
date: 2026-06-18
author: hyeokyeong@gmail.com
project: 에너지 뉴스레터 대시보드
---

# 뉴스레터 대시보드 v2 — Design Document

> **Summary**: 26개 지정 소스(24개 활성, rss/scrape 2방식) 수집 파이프라인 + Next.js SSG/CSR 혼합 아키텍처. 기사 선택(/collect) → 스크리닝(/screening) → 뉴스레터 자동 생성(/generate) 워크플로 포함.
>
> **Project**: 에너지 뉴스레터 대시보드
> **Version**: 2.7
> **Author**: hyeokyeong@gmail.com
> **Date**: 2026-06-18
> **Status**: Sprint 1~8+ 완료 (Gap Analysis 91.6%)
> **Planning Doc**: [newsletter-dashboard.plan.md](../../01-plan/features/newsletter-dashboard.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 소스 신뢰도 + 뉴스레터 제작 자동화로 팀 생산성 향상 (격주 작업 시간: 시간 단위 → 분 단위) |
| **WHO** | 뉴스레터 편집 담당자(1~2명) + 구독 임직원 전체 |
| **RISK** | JS SPA 스크래핑 불가 → Google News site: 우회 / localStorage 용량 초과 / CSS 셀렉터 변경 |
| **SUCCESS** | 26개 소스 중 20개+ 정상 수집 / /collect·/screening·/generate 정상 동작 / 복사 버튼 동작 |
| **SCOPE** | Sprint 1~5 ✅ 완료 / Sprint 6: /screening ✅ / Sprint 7: /collect 통합 + /newsletter-archive ✅ / Sprint 8: 요약 파이프라인 + EV 필터 + 스크리닝 보강 ✅ |

---

## 1. Overview

### 1.1 Design Goals

- **소스 정확도**: `sources.js` 26개 지정 소스(24개 활성). rss/scrape 2방식 (google-news 방식 제거)
- **뉴스레터 워크플로**: 브라우저에서 기사 선택 → 6개 카테고리 뉴스레터 즉시 생성·복사
- **하이브리드 아키텍처**: 정적 페이지(SSG/CSR) + 런타임 요약 API. 크롤링 JSON → `public/data/` → CSR fetch. 요약 생성은 `/api/summarize`(POST) + Redis 캐시 경유
- **WDS 컴플라이언스**: `design_base/` Wanted Design System 토큰 100% 준수 (Pretendard, `#0066FF`, `rgba(112,115,124,0.16)` 보더 등)

### 1.2 Design Principles

- **URL-First State**: 필터·검색은 URL searchParams, 선택 상태는 localStorage
- **CSR for Interactivity**: `/collect`, `/screening`, `/generate`는 완전 CSR (`'use client'`) — SSG 하이드레이션 오류 방지
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
│         ├─► rss-crawler.js   (type: rss)                        │
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
│              Next.js 14 (하이브리드: SSG + 런타임 API)              │
│                                                                  │
│  SSG 페이지 (빌드 타임 fs.readFileSync):                          │
│    /                  → app/page.tsx                            │
│    /archive           → app/archive/page.tsx                    │
│    /archive/[date]    → app/archive/[date]/page.tsx             │
│    /biweekly-report/[id] → app/biweekly-report/[reportId]/      │
│                                                                  │
│  CSR 페이지 ('use client', 브라우저 fetch):                       │
│    /collect           → app/collect/page.tsx                    │
│    /screening         → app/screening/page.tsx (Sprint 6)       │
│    /generate          → app/generate/page.tsx                   │
│    /newsletter-archive → app/newsletter-archive/page.tsx (신규) │
│                                                                  │
│  런타임 API 라우트 (서버리스, Sprint 8+):                          │
│    POST /api/summarize → app/api/summarize/route.ts             │
│    GET  /api/summaries → app/api/summaries/route.ts             │
│                              │                                   │
│              ┌───────────────┴────────────────┐                 │
│    localStorage (선택 상태)      Upstash Redis (요약 캐시)        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 크롤러 모듈 구조

```
scripts/
  run-crawl.js            ← 진입점: RSS/GNews → Scrape 순서 실행
  reclassify-articles.js  ← 기존 기사 토픽 재분류 마이그레이션
  biweekly-report.js      ← 격주 리포트 생성
  summarize-newsletter.js  ← 뉴스레터 요약 CLI 진입점: 선택 ID 지정 방식 (Sprint 8, § 2.7)
  summarize-top-articles.js ← 크롤링 후 자동 일괄 요약: 상위 N개 자동 선발·요약 (Sprint 8+, § 2.7)
  crawlers/
    sources.js            ← 26개 소스 설정 배열 (rss/scrape, 24개 활성)
    rss-crawler.js        ← crawlRss(): rss 타입 처리
    scraper.js            ← crawlScrape(): Cheerio 멀티셀렉터 지원
    classifier.js         ← 키워드 기반 토픽 분류 (6개 카테고리, 한/영)
    body-fetcher.js       ← fetchBodyText(url): 본문 전문 수집 + countSentences()
    relevance-filter.js   ← isEnergyRelevant(): 4단계 에너지 관련성 필터 (§ 2.4)
    summarizer.js         ← gemini-2.5-flash 번역·요약·분류 (rate limit/fallback)
    url-tracker.js        ← filterNew({force}) / markSeen({dryRun}) / isUrlAccessible()
    pdf-crawler.js        ← IRENA 등 기관 PDF 수집
  newsletter/             ← 뉴스레터 전용 요약 파이프라인 (Sprint 8, § 2.7)
    gemini-client.js      ← 공유 Gemini 클라이언트 (rate limit + fallback, 3모델 체인)
    article-classifier.js ← Step 0: 기사 유형 판별 (Method A / B)
    field-extractor.js    ← Step 1A: Method A 구조화 필드 추출 (LLM)
    sentence-selector.js  ← Step 1B: Method B 문장 점수 선발 (rule-based)
    summary-generator.js  ← Step 2: 3줄 요약 생성 + 왜곡 방지 검증 (LLM)
    node-screener.js      ← screening.ts Node.js 포트: 서버사이드 스크리닝 (Sprint 8+)
```

**소스 타입 분류** (sources.js):

| 타입 | 수집 방식 | 소스 수 (활성) |
|------|---------|--------|
| `rss` | 공식 RSS 피드 직접 파싱 (rss-parser) | 17개 (15개) |
| `scrape` | Cheerio HTML 파싱 + CSS 셀렉터 | 8개 |
| `pdf` | PDF 직접 URL 수집 (IRENA) | 1개 |

> google-news 방식 제거됨 (Cloudflare/SPA 차단으로 대체 소스 직접 추가)

**글로벌/국내 분류**:

| 구분 | 소스 수 (활성) | 주요 소스 |
|------|--------|----------|
| 글로벌(global) | 13개 | IEA, IRENA, BNEF, PV Magazine, Energy Storage News, etc. |
| 국내(domestic) | 11개 | 에너지경제신문, 전기신문, 이투뉴스, 에너지데일리, 한국에너지공단, etc. |

**scraper.js 핵심 동작**:
```js
// 멀티셀렉터: 쉼표로 구분된 여러 셀렉터를 순서대로 시도
const selectors = cfg.titleSelector.split(',').map(s => s.trim())
// href 없는 요소: 가장 가까운 <a> 조상으로 fallback
const href = $(el).attr('href') || $(el).closest('a').attr('href')
```

### 2.4 에너지 관련성 필터 (키워드 기반, v2.5 4단계)

RSS·스크래핑 소스는 에너지 전문지라도 무관 기사를 포함한다. 수집 단계에서 **4단계 Cascade**로 필터링.

**적용 위치**: `isUrlAccessible()` 이후, `isBodyLongEnough()` 이전

```
isEnergyRelevant(title, summary, lang, sourceId)

단계 1: EXCLUDE 키워드 체크 (모든 소스 적용)
  → 선거 후보·부동산·주식지수·이벤트홍보(giveaway/경품 행사 등) 포함 시 false

단계 2: TRUSTED 소스 면제
  → TRUSTED_ENERGY_SOURCES에 포함 시 즉시 true (키워드 검사 생략)

단계 3: EV 소비자 콘텐츠 필터 (Sprint 8 신규)
  → 제목에 EV 소비자 키워드 포함 → 제목+요약에서 전력망 맥락 확인
  → 전력망 맥락 없으면 false (EV 판매·리뷰·가정 충전·경품 등)
  → V2G·충전 인프라·수요반응·전기버스 플리트 → 통과 허용

단계 4: 에너지 키워드 매칭 (제목 기준)
  → ENERGY_KW_KO / ENERGY_KW_EN 1개 이상 → true / 0개 → false
```

**EV 필터링 정책** (Sprint 8):

| 콘텐츠 유형 | 처리 |
|---|---|
| EV 판매량·보급률·구매·가격·리뷰 | ❌ 제외 |
| 가정용 충전기·충전 방법·경품 | ❌ 제외 |
| 전동킥보드·전기자전거 | ❌ 제외 |
| V2G·스마트 충전·수요반응 | ✅ 허용 |
| 충전 인프라(공공·산업 규모) | ✅ 허용 |
| 전기버스·전기트럭 플리트 | ✅ 허용 |

> `'electric'` 키워드 ENERGY_KW_EN에서 제거 (오매칭 방지). `'electricity'`, `'electrif'` 유지.

**주요 필터링 사례**:
| 소스 | 제목 예시 | 판정 |
|------|----------|------|
| CleanTechnica | "북유럽 전기차 판매량 신기록" | ❌ (EV 소비자) |
| CleanTechnica | "V2G 기술로 전력망 안정성 향상" | ✅ (EV + 전력망) |
| CleanTechnica | "제8회 전기차 경품 행사 시작" | ❌ (이벤트) |
| 에너지경제신문 | "전기요금 인상 논의 본격화" | ✅ |

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

### 2.6 연관성 스크리닝 (screening.ts)

수집된 기사를 다차원 점수화하여 뉴스레터 가치가 높은 순으로 정렬하는 CSR 레이어.

**`screenArticles` 함수 시그니처**:

```typescript
interface ScreeningOptions {
  limit?: number        // 총 선정 개수 (기본값 30)
  categoryMax?: number  // primaryTopic당 최대 선정 수 (기본값 8)
  sourceMax?: number    // 동일 sourceId당 최대 선정 수 (기본값 4)
}

function screenArticles(
  articles: Article[],
  options?: ScreeningOptions | number,  // 하위 호환: 숫자로 limit만 넘길 수도 있음
  demandKeywords?: Map<string, number>
): ScoredArticle[]
```

**점수 계산 구조** (`screenArticles()` — Pass 1):

| 항목 | 점수 | 비고 |
|------|------|------|
| AI 분류 토픽 | +15/개 | 무제한 합산 |
| 토픽 키워드 매칭 | +5/키워드 | TOPICS 상수 기준 |
| 광범위 에너지 키워드 | +1/키워드 | BROAD_KEYWORDS |
| 요약 품질 (100자+) | +3 | |
| 최신성 (3일 이내) | +5 | 7일 이내 +3 |
| 수요 키워드 (아카이브 기반) | 최대 +15 | 과거 확정 기사에서 학습 |
| 전략 중요도 신호 | 최대 +30 | 5개 신호: 대형 규모/정책·규제/산업 구조/기술 전환점/시장 긴급 |
| SK 그룹 사업 연관성 | +15 | SK_GROUP_KW 매칭 |
| 사업 연관성 합계 | 최대 +20 | 소스신뢰도 + 국내 영향 + 글로벌 파급력 |
| 소스 신뢰도 (Tier1) | +10 | IEA, IRENA, BNEF |
| 소스 신뢰도 (Tier2) | +5 | 전문지 19개 (Sprint 8: cleantechnica 추가) |
| 국내 직접 영향 키워드 | +8 | 한전, 산업부 등 |
| 글로벌 파급력 키워드 | +5 | G7, COP, EU 등 |
| 정보 품질 합계 | 최대 +15 | 공식기관 + 수량 패턴 |
| 공식 기관 언급 | +5 | 정부, DOE, FERC 등 |
| 수량 패턴 (GW/억원/%) | **+10** | Sprint 8: 에너지 수치 핵심 신호 가산 강화 |
| **EV 소비자 콘텐츠** | **-25** | Sprint 8 신규: ev sales·review·가정 충전 등 |
| **이벤트·홍보 콘텐츠** | **-30** | Sprint 8 신규: giveaway·sweepstakes·경품 행사 등 |

**패스 2: 중복 감점**:
- 상위 200개 기사 대상 pairwise Jaccard 유사도 비교
- 임계값 ≥ 0.4 → 후순위 기사 -15점, `isDuplicate: true` 마킹
- 감점 후 재정렬

**패스 3: Greedy Diversity Selection** (v2.4 신규):
- 점수 순으로 순회하며 `LIMIT`개 선정
- 3-A: categoryMax(primaryTopic 기준) + sourceMax 모두 적용
- 3-B: 부족 시 categoryMax 무시, sourceMax만 유지
- 3-C: 그래도 부족 시 모든 cap 무시, 점수순으로 채움 **(Sprint 8: 25점 미만 기사 제외)**
- 목적: 동일 카테고리·동일 소스 과잉 집중 방지 + 최소 관련성 보장

**점수 레이블**:

| 범위 | 레이블 | 색상 |
|------|--------|------|
| ≥ 75 | 연관성 높음 | 녹색 |
| ≥ 45 | 연관성 보통 | 주황색 |
| < 45 | 연관성 낮음 | 회색 |

### 2.7 뉴스레터 요약 파이프라인 (Sprint 8 신규)

사용자가 기사 선택을 확정한 후 뉴스레터에 게재할 3줄 요약을 생성하는 오프라인 파이프라인.

**실행 방법**:

_방법 A — 선택 ID 지정 (수동):_
```bash
node scripts/summarize-newsletter.js --ids=id1,id2,...
node scripts/summarize-newsletter.js --input=selected-ids.json
```

_방법 B — 자동 일괄 요약 (Sprint 8+):_
```bash
npm run summarize:top            # 최근 14일, 상위 30개 자동 선발·요약
npm run summarize:top:dry        # dry-run (파일 저장 없음)
npm run newsletter:prep          # 크롤링 + 자동 요약 연속 실행
node scripts/summarize-top-articles.js --days=7 --limit=20
```

→ 출력: `public/data/newsletter-draft.json`

> **방법 B 내부 흐름**: `node-screener.js`(screening.ts 포트)로 상위 N개 선발 → 기존 요약 재사용(API 절약) → 신규 기사만 3줄 요약 생성

**3단계 파이프라인**:

```
[Step 0] 기사 유형 판별 (article-classifier.js)
  Cascade 4단계:
    Level 1: 출처 override (kea → A, iea/irena/bnef/carbon-brief → B)
    Level 2: Net Score (A-Score - B-Score) ≥ 6 → A / ≤ 1 → B
    Level 3: 밀도 점수 (수치밀도·완료동사밀도 vs 예측표현밀도·연결표현밀도) ≥ 0.30 → A / ≤ -0.10 → B
    Level 4: LLM 단일 질문 (회색지대만, 제목+첫문단 입력)
          ↓
[Step 1A] Method A — 팩트형 기사 (계약·발표·정책·투자·착공준공 등)
  field-extractor.js: Gemini LLM → JSON 구조화 추출
  필드: article_type / who / metrics / location_target / tech_keywords / causal_core / business_impact
          ↓
[Step 1B] Method B — 분석형 기사 (동향·전망·인터뷰·칼럼 등)
  sentence-selector.js: rule-based 문장 점수 선발 (LLM 없음)
  선발 기준: 위치 가중치 + 수치 포함 + 에너지 키워드 밀도 + 인용 출처
  What/Why/So what 역할별 최적 문장 3개 선정
          ↓
[Step 2] 3줄 요약 생성 (summary-generator.js)
  Gemini LLM → { what, why, sowhat }
  고정 템플릿: "핵심 요소만 활용, 추가 추정 금지"
```

**왜곡 방지 6단계 코드 검증** (`validateAndRepair` + `normalizeEnding`):

| 순서 | 검증 | 실패/처리 |
|---|---|---|
| 0 | 합쇼체 어미 변환 (`normalizeEnding`) | `습니다/합니다/됩니다` → `했다/한다/된다` 전역 치환 (LLM 출력·fallback 모두 적용) |
| 1 | what 근거 없음 (`whatAvailable=false`) | what/why/sowhat 전부 null |
| 1b | LLM 실패로 what null + 근거 있음 | `whatFallback` 적용. `rawSummaryFallback`(크롤러 원문 요약)을 최후 안전망으로 사용 |
| 2 | 수치 보존 (primary metric 변형 감지) | fallback 텍스트 교체 |
| 3 | 엔티티 보존 (Method A, 행위자명 변형) | fallback 텍스트 교체 |
| 4 | why/sowhat 근거 없음 | null 강제 |

**`cleanLlm` 기준**:
- 최소 15자 미만 → null (의미 없는 짧은 출력 차단)
- 최대 150자(what) / 120자(why·sowhat) 초과 → `다`/`됐다` 종결 위치에서 스마트 자르기

**영어 기사 처리**:
- `field-extractor.js`: 영어 기사라도 `main_actor` 등 모든 텍스트 필드를 한국어로 추출
- `summary-generator.js`: `lang === 'en'` 시 번역 지시 추가, LLM 실패 fallback = null (영어 노출 방지)

**LLM 호출 횟수 (기사당)**:

| 경로 | Step 0 | Step 1 | Step 2 | 합계 |
|---|:---:|:---:|:---:|:---:|
| 명확한 A | 0 | 1 | 1 | 2회 |
| 명확한 B | 0 | 0 | 1 | 1회 |
| 회색지대 → A | 1 | 1 | 1 | 3회 |
| 회색지대 → B | 1 | 0 | 1 | 2회 |

### 2.3 CSR 데이터 플로우

```
/collect  (스크리닝+선택 통합 페이지 — Sprint 7 개편)
  mount → fetch /data/index.json          (MetaIndex)
        → fetch /data/daily/{date}.json × 14 (최근 14일 DailyData)
        → screenArticles(allArticles, {limit, categoryMax, sourceMax}, demandKeywords) 점수화·정렬
        → getArchiveEntries() → computeDemandKeywords() (수요 키워드)
        → 기사 목록 렌더링 (연관성 점수·배지·체크박스)
  표시 개수 변경 (50/100/전체) → effectiveLimit 재계산
  토픽 필터 클릭 → screened 결과 내 필터링
  기사 클릭 → localStorage 선택 저장
  [선택 초기화] → localStorage selectedIds 초기화
  [전체 선택/해제] → 현재 토픽 기준 토글
  [뉴스레터 생성하기 →] 버튼 → Link href="/generate"  ← (screening 경유 없이 직접)

/screening  (독립 스크리닝 뷰 — Sidebar "기사 선택" 진입점)
  mount → fetch /data/index.json
        → fetch /data/daily/{date}.json × 14
        → screenArticles(allArticles, {limit:30, categoryMax:8, sourceMax:4}, demandKeywords) 점수화·정렬
        → getArchiveEntries() → computeDemandKeywords() (수요 키워드)
  카테고리 필터 드롭다운 (전체/6개 토픽) → screenArticles 재실행 (카테고리별 상위 30개)
  기사 클릭 → localStorage 선택 저장
  [뉴스레터 생성하기] 버튼 →
    POST /api/summarize × N건 (1건씩 순차, Vercel 60s 대응)
    → 응답 수집 → localStorage['nl-generated-summaries'] 저장
    → router.push('/generate')

/newsletter-archive  (뉴스레터 아카이브 — Sprint 7 신규)
  mount → getArchiveEntries() (localStorage 또는 파일 기반)
        → 확정 뉴스레터 목록 렌더링

/generate
  mount → localStorage.getItem('newsletter-selection')
        → fetch /data/index.json
        → fetch /data/daily/{date}.json × 14
        → selectedIds로 필터링
        → [Step 0] localStorage['nl-generated-summaries'] 우선 적용 (screening 직통)
        → [Step 1] GET /api/summaries?ids=... (Redis → newsletter-draft.json 병합, Step 0 미적용 항목만)
        → [Step 2] /data/newsletter-draft.json fallback (여전히 미채워진 항목)
        → TOPICS 순서대로 그룹핑·렌더링 (미분류 → '기타' 섹션)
        → ns.what 있으면 3줄 구조 요약, 없으면 article.summary fallback
  [HTML 저장] → Blob 다운로드 (CDN 없는 인라인 HTML)
  [인쇄] → window.print()
  [확정] → saveArchiveEntry() → localStorage 선택 초기화 → /newsletter-archive
  [← 기사 선택으로] → Link href="/collect"
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

// Sprint 8+: 뉴스레터 3줄 요약 (summarize-newsletter.js 파이프라인 출력)
export interface NewsletterSummary {
  what?: string    // 팩트: 누가·무엇을·얼마나 (최대 150자)
  why?: string     // 배경·원인 (최대 120자)
  sowhat?: string  // 의미·전망 (최대 120자)
}

export interface Article {
  id: string                          // crypto.randomUUID()
  source: string                      // 소스 이름 (예: "에너지경제신문")
  sourceId: string                    // sources.js의 id
  sourceOrigin: 'domestic' | 'global' // v2 추가: 국내/해외 구분
  originalLang: string                // 'ko' | 'en'
  isTranslated: boolean
  title: string                       // 한국어 제목
  titleOriginal: string | null        // 원문 제목 (번역 시)
  summary: string                     // AI 한국어 요약 (3문장, 크롤링 시 생성)
  topics: TopicId[]                   // 분류 토픽 (최대 3개)
  primaryTopic?: TopicId              // 핵심 카테고리 1개 (스크리닝 cap 계산 + 뉴스레터 섹션 배치용)
  publishedAt: string                 // ISO8601
  originalUrl: string                 // 원문 URL
  collectedAt: string                 // 수집 시각 ISO8601
  newsletterSummary?: NewsletterSummary | null  // Sprint 8+: 뉴스레터 전용 3줄 요약
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
  newsletter-draft.json               ← 뉴스레터 3줄 요약 캐시 (Sprint 8+)
  .crawled-urls.json                  ← URL dedup (scraping 제외)
```

> **v1 → v2 변경**: `data/` → `public/data/` (CSR fetch 지원, Next.js static serving 활용)

**newsletter-draft.json 스키마**:
```json
{
  "generatedAt": "ISO8601",
  "total": 31,
  "success": 30,
  "articles": [
    {
      "id": "uuid",
      "newsletterSummary": { "what": "...", "why": "...", "sowhat": "..." }
    }
  ]
}
```

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
  type: 'rss' | 'scrape' | 'pdf'
  enabled: boolean
  // type='rss':
  rssUrl?: string
  keywords?: string[]          // 화이트리스트 키워드 (power-magazine 등 화석연료 배제용)
  // type='scrape':
  scrapeConfig?: {
    listUrl: string
    titleSelector: string
    linkSelector?: string
    dateSelector?: string
    onclickPattern?: object    // onclick="fn_Detail(...)" 방식 (KEA)
    pagination?: object
  }
  // type='pdf':
  directPdfUrls?: string[]     // IRENA 등 직접 PDF URL 목록
}
```

---

## 4. API Specification

> **아키텍처**: 정적 JSON(빌드·크롤링) + 런타임 요약 API(Sprint 8+) 혼합.
> SSG는 빌드 타임 `fs.readFileSync`, CSR은 브라우저 fetch `/data/...`, 요약은 런타임 API 경유.

### 4.1 정적 JSON Endpoints

| Method | Path | Used By | 비고 |
|--------|------|---------|------|
| GET | `/data/index.json` | SSG generateStaticParams + CSR /collect,/screening,/generate | MetaIndex |
| GET | `/data/daily/YYYY-MM-DD.json` | SSG 페이지 + CSR /collect,/screening,/generate | DailyData |
| GET | `/data/biweekly/YYYY-BWnn.json` | SSG 격주 리포트 | BiweeklyData |
| GET | `/data/newsletter-draft.json` | /generate fallback (Step 2) | 요약 캐시 파일 |

### 4.2 런타임 요약 API (Sprint 8+)

#### POST `/api/summarize`
기사 ID 목록을 받아 3줄 요약을 생성하고 Redis에 캐시한다.

```typescript
// Request
{ ids: string[] }  // 기사 ID 배열 (Vercel 60초 제한으로 1건씩 호출 권장)

// Response
Record<string, NewsletterSummary>
// 예: { "uuid-1": { what: "...", why: "...", sowhat: "..." } }
// 요약 실패(what=null)인 기사는 응답에서 제외됨
```

**내부 파이프라인**: Redis 캐시 확인 → Miss 시 기사 탐색(`public/data/daily/`) → 본문 fetch → 분류(Method A/B) → 필드 추출/문장 선발 → 3줄 요약 생성 → Redis 저장 + `newsletter-draft.json` 병합 저장

**서버리스 번들링**: `next.config.js` `outputFileTracingIncludes`로 `scripts/` 디렉터리 포함
+ `scripts/`가 `eval('require')`로 로드되어 Next.js 파일 트레이서(@vercel/nft)를 우회하므로,
`scripts/`가 require()하는 npm 패키지(cheerio·@google/generative-ai)의 전이 의존성도
동일 설정에 명시적으로 포함해야 함 (미포함 시 배포본에서 `Cannot find module` 런타임 오류)

#### GET `/api/summaries`
여러 기사의 캐시된 요약을 일괄 조회한다.

```typescript
// Query
?ids=uuid-1,uuid-2,...

// Response
Record<string, NewsletterSummary>
// Redis 히트 우선, 미스 시 newsletter-draft.json fallback
```

### 4.3 Redis 캐시 계층 (Upstash)

| 항목 | 내용 |
|------|------|
| 구현 | `src/lib/redis.ts` |
| 환경변수 | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| 함수 | `getCachedSummary(id)`, `setCachedSummary(id, summary)`, `getManycached(ids)` |
| 용도 | 요약 결과 캐싱 — LLM 재호출 방지, `/api/summaries` 빠른 응답 |

### 4.4 SSG Data Fetcher (`src/lib/data.ts`)

```typescript
// fs.readFileSync 기반 — next build 타임에만 실행
const DATA_DIR = path.join(process.cwd(), 'public', 'data')  // v2: public/data/

async function getMetaIndex(): Promise<MetaIndex>
async function getDailyData(date: string): Promise<DailyData | null>
async function getBiweeklyReport(reportId: string): Promise<BiweeklyData | null>
function getLatestDate(index: MetaIndex): string
function getLatestReportId(index: MetaIndex): string | undefined
```

### 4.5 CSR Fetch 패턴 (`/collect`, `/screening`, `/generate`)

```typescript
// /collect, /screening 공통 — 정적 JSON fetch
const dailyResults = await Promise.all(
  dates.map(date =>
    fetch(`/data/daily/${date}.json`)
      .then(r => r.ok ? r.json() as Promise<DailyData> : null)
      .catch(() => null)
  )
)

// /screening → /generate 요약 전달 (Sprint 8+)
// screening: POST /api/summarize 순차 호출 → localStorage['nl-generated-summaries'] 저장
// generate Step 0: localStorage 우선 읽기 → Step 1: GET /api/summaries → Step 2: newsletter-draft.json
```

### 4.6 Gemini API Integration

| 함수 | 모델 | 입력 | 출력 |
|------|------|------|------|
| `summarize(ko)` | gemini-2.5-flash | title + content(1500자) | `{titleKo, summary, topics}` |
| `summarize(en)` | gemini-2.5-flash | title + content(1500자) | `{titleKo, titleOriginal, summary, topics}` |
| `generateReport` | gemini-2.5-flash | 최대 80개 기사 요약 | `TrendReport` JSON |
| `extractFieldsMethodA` | gemini-2.5-flash | title + body | 구조화 필드 JSON |
| `generateNewsletterSummary` | gemini-2.5-flash | method + elements | `{what, why, sowhat}` |

**Rate Limit**: 4000ms min(`GEMINI_INTERVAL_MS`, daily-crawl.yml과 동일 값으로 검증됨), 429 → 15s 대기 후 다음 모델, 503 → 8s 후 1회 재시도
**Fallback Chain**: `gemini-2.5-flash` → `gemini-3.1-flash-lite-preview` → `gemma-3-4b-it` → `rawSummaryFallback`

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

#### 기사 선택 페이지 (`/collect`) — CSR

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

#### 뉴스레터 생성 페이지 (`/generate`) — CSR

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
  → Sidebar [기사 선택] 링크 → /screening  (Sprint 7 변경)
  → Sidebar [뉴스레터 생성] 링크 → /generate
  → Sidebar [뉴스레터 아카이브] 링크 → /newsletter-archive  (신규)
  → Sidebar [과거 아카이브] 링크 → /archive

/collect ──────────────────────────────────────────────────────  (직접 URL 또는 /generate ← 링크 경유)
  → screenArticles() 점수 순 정렬 (collect에도 스크리닝 통합)
  → 표시 개수 선택 (50/100/전체)
  → 토픽 필터 클릭 → 해당 토픽 기사만 표시
  → 체크박스 클릭 → localStorage 저장
  → [전체 선택/해제] 토글 (현재 토픽 기준)
  → [선택 초기화] → localStorage 초기화
  → [뉴스레터 생성하기 →] 버튼 → /generate  ← (스크리닝 경유 제거)

/screening ────────────────────────────────────────────────────  (Sidebar 기본 진입점)
  → screenArticles() 점수 순 정렬 (default 30개, Greedy Diversity)
  → 표시 개수 선택 (30/50/100/전체)
  → 토픽 필터 클릭 → 해당 토픽만 표시
  → 기사 클릭 → 선택/해제, localStorage 저장
  → [뉴스레터 생성하기 →] 버튼 → /generate

/generate ─────────────────────────────────────────────────────
  → localStorage 읽기 → 선택 기사 렌더링 (6개 카테고리)
  → [복사] → navigator.clipboard.writeText(plainText)
  → [인쇄] → window.print()
  → [← 기사 선택으로] → /collect

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
| `/collect` | `src/app/collect/page.tsx` | CSR fetch + screening.ts + localStorage |
| `/screening` | `src/app/screening/page.tsx` | CSR fetch + screening.ts + localStorage |
| `/generate` | `src/app/generate/page.tsx` | localStorage + CSR fetch |
| `/newsletter-archive` | `src/app/newsletter-archive/page.tsx` | getArchiveEntries() (Sprint 7 신규) |

### 5.5 Page UI Checklist

#### 메인 (`/`)

- [x] Header: 서비스 로고/제목 (에너지 인사이트)
- [x] Header: 마지막 업데이트 날짜 (MM. DD. HH:mm 형식)
- [x] Header: "뉴스레터 생성" 파란 버튼 → /collect
- [x] Header: 최신 격주 리포트 링크 (있을 때만)
- [x] Header: SearchBar
- [x] TopicFilter: "전체" + 6개 토픽 칩 (선택 시 강조)
- [x] NewsGrid: 기사 카드 목록
- [x] NewsCard: 소스명, 날짜, 제목, TranslationBadge, 요약, TopicBadge, 원문 링크
- [x] Footer: 저작권, 뉴스레터 생성 링크, 격주 리포트 링크

#### 기사 선택 (`/collect`) — Sprint 7: 스크리닝 통합

- [x] 연관성 점수 순 정렬 (screenArticles — 스크리닝 통합)
- [x] 점수 레이블 배지 (높음/보통/낮음)
- [x] 수요 키워드 배지 (주황색, 아카이브 기반)
- [x] 전략 중요도 신호 배지 (⚡ 보라색)
- [x] SK 연관 배지 (빨간색)
- [x] 중복 감점 배지 (회색)
- [x] 표시 개수 선택 (50 / 100 / 전체)
- [x] 토픽 필터 버튼 (전체 + 6개)
- [x] 전체 선택 / 전체 해제 버튼 (현재 토픽 기준)
- [x] 선택 초기화 버튼
- [x] 기사 카드 + 체크박스 (체크 시 배경색 변경)
- [x] 선택 개수 표시 (sticky 하단 바)
- [x] localStorage 저장 (새로고침 후 선택 유지)
- [x] "뉴스레터 생성하기" CTA 버튼 → /generate  ← (screening 경유 제거)

#### 연관성 스크리닝 (`/screening`)

- [x] 연관성 점수 순 정렬 (screenArticles, 고정 30개)
- [x] 점수 레이블 배지 (높음/보통/낮음)
- [x] 중복 감점 배지 (회색)
- [x] 매칭 키워드 표시 (최대 6개)
- [x] 카테고리 필터 드롭다운 (전체 + 6개 토픽, 선택 시 해당 카테고리 상위 30개)
- [x] 선별 기사 수 표시
- [x] 전체 선택 / 전체 해제 버튼
- [x] 체크박스 선택 → localStorage 저장
- [x] "뉴스레터 생성하기" CTA 버튼 → POST /api/summarize 순차 실행 → localStorage 저장 → /generate
- [x] 요약 생성 진행률 표시 (`요약 생성 중... N/M`)

#### 뉴스레터 생성 (`/generate`)

- [x] sticky 상단: 뒤로 가기, HTML 저장, 인쇄, 확정 버튼
- [x] 발행일자 표시
- [x] 기사 수 · 토픽 수 · 소스 수 통계
- [x] 카테고리 탭 네비게이션 (색상 accent bar)
- [x] 6개 카테고리 섹션 (이모지 + 토픽명, 2열 카드 그리드)
- [x] 각 카드: 소스 배지, 날짜, 기사 제목, 3줄 요약(what/why/sowhat) 또는 article.summary fallback, 카테고리 칩, 원문 링크
- [x] 선택 기사 없는 카테고리는 표시 안 함
- [x] 미분류 기사 → '기타' 섹션
- [x] HTML 저장: CDN 없는 인라인 HTML Blob 다운로드
- [x] 인쇄: window.print()
- [x] 확정: saveArchiveEntry() → /newsletter-archive 이동

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
| 선택 기사 0개 | /generate에서 빈 화면 | "선택된 기사 없음" |
| localStorage 200개 초과 | 제한 없음 (현재), 필요 시 slice | — |

### 6.3 SSG 빌드

| 상황 | 처리 | 결과 |
|------|------|------|
| getDailyData null | 빈 기사 배열 | "데이터 없음" |
| getBiweeklyReport null | notFound() | 404 |
| index.json 없음 | 기본값 `{availableDates:[], ...}` | 빈 홈 |

---

## 7. Security

- [x] `GEMINI_API_KEY` — `.env.local` / 서버 환경변수만. 브라우저 노출 없음 (API 라우트·크롤링 스크립트에서만 사용)
- [x] `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — 서버 환경변수만. 브라우저 노출 없음
- [x] 외부 링크 `target="_blank" rel="noopener noreferrer"`
- [x] 검색: 클라이언트 사이드 Fuse.js — 서버 쿼리 없음
- [x] localStorage: 기사 ID·요약 캐시만 저장 (개인정보 없음)
- [x] CSR fetch: 같은 도메인 `/data/`, `/api/` 경로만 — CORS 이슈 없음

---

## 8. Test Plan

### 8.1 L1: 크롤링 단위

| # | 함수 | 테스트 | 기대값 |
|---|------|--------|--------|
| 1 | `crawlRss(sources)` | rss 타입 소스 | articles[] 반환 (length > 0) |
| 2 | `crawlRss(sources)` | rss 타입 다중 소스 | articles[] 반환 (sourceOrigin 포함) |
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
| 3 | `/collect` | 로드 | 기사 목록 표시 |
| 4 | `/collect` | 체크박스 클릭 | 카드 배경 변경, 하단 카운트 업데이트 |
| 5 | `/collect` | 새로고침 | localStorage에서 선택 복원 |
| 6 | `/screening` | 로드 | 점수 순 정렬 + 배지 표시 |
| 7 | `/screening` | 표시 개수 변경 | 해당 개수로 목록 재렌더링 |
| 8 | `/generate` | 로드 | 6개 카테고리 섹션 렌더링 (선택된 토픽만) |
| 9 | `/generate` | [복사] 클릭 | 클립보드에 plain text 복사 |

### 8.3 L3: E2E 시나리오

| # | 시나리오 | Steps | 성공 기준 |
|---|----------|-------|---------|
| 1 | 뉴스레터 생성 전체 플로우 | / → /collect → /screening → 기사 선택 → /generate → 복사 | 선택 기사가 뉴스레터에 카테고리별 표시 |
| 2 | 선택 상태 유지 | /screening 선택 → /generate → ← 뒤로 | localStorage 선택 복원됨 |
| 3 | 토픽 필터 | /collect 또는 /screening → 토픽 클릭 → 해당 토픽만 표시 | 다른 토픽 기사 미표시 |
| 4 | 스크리닝 점수화 | /screening 로드 → 상위 기사 확인 | 연관성 높음 기사가 상위 표시 |
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
| Pages (CSR) | `'use client'` + PascalCase 파일 | `collect/page.tsx` |
| Functions | camelCase | `getDailyData()`, `loadSelection()` |
| Constants | UPPER_SNAKE 또는 camelCase 객체 | `TOPICS`, `TOPIC_EMOJI` |
| Types/Interfaces | PascalCase | `Article`, `NewsletterSelection` |

### 10.2 'use client' 경계

| 파일 | use client | 이유 |
|------|:----------:|------|
| `TopicFilter` | ✅ | `useRouter`, `useSearchParams` |
| `NewsGrid` | ✅ | `useSearchParams`, Fuse.js |
| `SearchBar` | ✅ | `useRouter`, `useSearchParams` |
| `collect/page.tsx` | ✅ | localStorage, fetch, useState |
| `screening/page.tsx` | ✅ | fetch, screening.ts, localStorage |
| `generate/page.tsx` | ✅ | localStorage, fetch, navigator.clipboard |
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
| `GEMINI_API_KEY` | Gemini AI 인증 (크롤링·요약 LLM) | `.env.local` / 서버 환경변수만 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST 엔드포인트 | 서버 환경변수만 (`/api/summarize`, `/api/summaries`) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis 인증 토큰 | 서버 환경변수만 |
| `ENABLE_PROMPT_CACHING_1H` | Claude Code 프롬프트 캐싱 활성화 | 개발 환경 선택사항 (30~40% 토큰 절약) |

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
│       ├── sources.js                 ✅ 26개 소스 (rss/scrape, 24개 활성)
│       ├── rss-crawler.js             ✅ RSS 수집
│       ├── scraper.js                 ✅ Cheerio HTML 스크래핑 (v2 신규)
│       ├── body-fetcher.js            ✅ 본문 수집 + 문장 수 필터
│       ├── relevance-filter.js        ✅ 에너지 관련성 키워드 필터
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
│   │   ├── collect/
│   │   │   └── page.tsx               ✅ 기사 선택+스크리닝 통합 (CSR) — Sprint 7 개편
│   │   ├── screening/
│   │   │   └── page.tsx               ✅ 스크리닝 독립 뷰 (CSR) — Sprint 6, Sidebar 진입점
│   │   ├── generate/
│   │   │   └── page.tsx               ✅ 뉴스레터 생성 (CSR) — v2 신규 (구 /newsletter)
│   │   ├── newsletter-archive/
│   │   │   └── page.tsx               ✅ 뉴스레터 아카이브 (CSR) — Sprint 7 신규
│   │   └── api/                       ← 런타임 요약 API (Sprint 8+)
│   │       ├── summarize/
│   │       │   └── route.ts           ✅ POST — 요약 생성 + Redis 저장 + 파일 병합
│   │       └── summaries/
│   │           └── route.ts           ✅ GET  — Redis 조회 + newsletter-draft.json fallback
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
│       ├── types.ts                   ✅ + sourceOrigin, NewsletterSummary, Article.newsletterSummary
│       ├── constants.ts               ✅ TOPICS, TOPIC_MAP
│       ├── data.ts                    ✅ public/data/ 경로 (v2 수정)
│       ├── screening.ts               ✅ screenArticles(), computeDemandKeywords() — Sprint 6 신규
│       ├── newsletter-archive.ts      ✅ getArchiveEntries() — 수요 키워드 분석용
│       ├── redis.ts                   ✅ Upstash Redis 캐시 (getCachedSummary, setCachedSummary, getManycached)
│       └── search.ts                  ✅ Fuse.js singleton
├── design_base/                       ✅ Wanted Design System 참조
├── next.config.js                     ✅ outputFileTracingIncludes: scripts/ (서버리스 번들)
├── tailwind.config.ts                 ✅ WDS 토큰 Tailwind 통합
└── tsconfig.json                      ✅
```

### 11.2 구현 완료 현황

| Sprint | 범위 | 상태 |
|--------|------|------|
| Sprint 1 | 크롤링 수정 (sources.js 재작성, scraper.js 신규, 7개 소스 수정, public/data/ 이동) | ✅ 완료 |
| Sprint 2 | `/collect` 페이지 (CSR, 격주 드롭다운, 체크박스, localStorage) | ✅ 완료 |
| Sprint 3 | `/generate` 페이지 (CSR, 6카테고리, 복사, 인쇄) | ✅ 완료 |
| 공통 | Article.sourceOrigin, Header/Footer 뉴스레터 버튼, WDS 디자인 시스템 통합 | ✅ 완료 |
| Sprint 4 | 기사 본문 길이 필터: `body-fetcher.js` 신규, `rss-crawler.js` + `scraper.js` 연동 | ✅ 완료 |
| Sprint 5 | 에너지 관련성 필터: `relevance-filter.js` 신규, 크롤러 연동, 기존 데이터 소급 제거 | ✅ 완료 |
| Sprint 6 | 연관성 스크리닝: `screening.ts` (다차원 점수화, 중복 감점), `/screening` 페이지 | ✅ 완료 |
| Sprint 7 | /collect 스크리닝 통합, /newsletter-archive 신규, Sidebar 재구성, ScreeningOptions + Pass 3 | ✅ 완료 |
| Sprint 8 | 뉴스레터 2단계 요약 파이프라인(`scripts/newsletter/`), EV 소비자 필터(4단계), 스크리닝 보강(감점·임계값) | ✅ 완료 |
| Sprint 8+ | 런타임 요약 API(`/api/summarize`, `/api/summaries`), Redis 캐시, `/screening`→localStorage→`/generate` 직통 전달, 합쇼체 정규화(`normalizeEnding`), `rawSummaryFallback` 안전망, HTML 저장·확정 플로우 | ✅ 완료 |

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
| 2.3 | 2026-05-18 | Sprint 5 완료 처리, Sprint 6 신규: screening.ts 다차원 점수화 + /screening 페이지, 소스 26개(24활성), google-news 타입 제거, 라우트명 /select→/collect, /newsletter→/generate |
| 2.4 | 2026-05-21 | Sprint 7 반영: /collect 스크리닝 통합, /newsletter-archive 신규, Sidebar 구조 변경, screenArticles ScreeningOptions + Pass 3, Article.primaryTopic, isEnergyRelevant sourceId 파라미터, /screening LimitOption 30 추가 |
| 2.5 | 2026-06-04 | Sprint 8 반영: §2.7 뉴스레터 요약 파이프라인 신설, §2.2 scripts/newsletter/ 파일 구조 추가, §2.4 EV 소비자 4단계 필터 업데이트, §2.6 감점 로직·Pass 3-C 임계값·cleantechnica SOURCE_TIER2 반영 |
| 2.6 | 2026-06-09 | Upstash Redis 캐시 계층 추가, HTML 저장·확정 플로우 추가, NewsletterContent 컴포넌트 추가 |
| 2.7 | 2026-06-18 | Gap 분석 반영: §1.1 하이브리드 아키텍처로 갱신, §2.1 다이어그램 API 계층 추가, §2.7 왜곡 방지 4→6단계, §3.1 NewsletterSummary·Article.newsletterSummary 추가, §3.2 newsletter-draft.json 추가, §4 런타임 API 전면 신설, §5.5 /screening·/generate 체크리스트 현행화, §7·§10.4 환경변수 갱신, §11.1 api/·redis.ts 추가 |
