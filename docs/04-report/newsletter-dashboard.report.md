---
template: report
version: 1.0
feature: newsletter-dashboard
date: 2026-06-09
author: hyeokyeong@gmail.com
matchRate: 97
phase: completed
---

# 뉴스레터 대시보드 v2 — Completion Report

> **Match Rate: 97%** | **Status: PASS** | **Sprint 1~8+ 전 기능 완료**

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 소스 신뢰도 + 뉴스레터 제작 자동화로 팀 생산성 향상 (격주 작업 시간: 시간 단위 → 분 단위) |
| **WHO** | 뉴스레터 편집 담당자(1~2명) + 구독 임직원 전체 |
| **RISK** | JS SPA 스크래핑 불가 → Google News site: 우회 / localStorage 용량 초과 / CSS 셀렉터 변경 |
| **SUCCESS** | 26개 소스(24활성) 수집 / /collect·/screening·/generate 정상 동작 / 복사·인쇄·HTML저장 버튼 동작 |

---

## 1. Executive Summary

### 1.1 Overview

| Perspective | Planned | Delivered |
|-------------|---------|-----------|
| **Problem** | 수동 뉴스레터 제작 시간 과다, 임의 소스 사용 | ✅ 해결 |
| **Solution** | 26개 지정 소스 직접 수집 + 스크리닝 + 자동 생성 | ✅ 구현 완료 |
| **Function/UX** | /collect → /generate 워크플로, 복사·인쇄 버튼 | ✅ + HTML 저장 추가 |
| **Core Value** | 뉴스레터 제작 시간 시간 → 분 단위 단축 | ✅ 달성 |

### 1.2 Sprint Progress

| Sprint | 내용 | 상태 |
|--------|------|------|
| Sprint 1~3 | 크롤링·수집·뉴스레터 생성 기본 기능 | ✅ |
| Sprint 4~5 | 품질 필터 (본문 길이, 관련성) | ✅ |
| Sprint 6 | 연관성 스크리닝 (/screening) | ✅ |
| Sprint 7 | /collect 통합 + /newsletter-archive | ✅ |
| Sprint 8 | 3줄 요약 파이프라인 + EV 필터 + 스크리닝 보강 | ✅ |
| Sprint 8+ | 자동 일괄 요약 (`summarize-top-articles.js`) + `node-screener.js` | ✅ |

### 1.3 Value Delivered

| 지표 | 목표 | 결과 |
|------|------|------|
| 수집 소스 | 20개+ | 24개 활성 ✅ |
| 수집 방식 | rss/scrape | rss(15활성) + scrape(8) + pdf(1) ✅ |
| 스크리닝 차원 | 다차원 점수화 | 14개 차원, Pass 1/2/3 ✅ |
| 요약 파이프라인 | 3줄 구조 요약 | Method A/B + 4단계 검증 ✅ |
| 뉴스레터 출력 | 복사·인쇄 | 인쇄 + HTML 저장 + 확정 ✅ |
| 자동화 수준 | 수동 선별 지원 | `npm run newsletter:prep` 크롤링→요약 1커맨드 ✅ |

---

## 2. Architecture Decisions

### 2.1 Key Decisions & Outcomes

| 단계 | 결정 | 결과 |
|------|------|------|
| Plan | Zero Server (정적 내보내기) | ✅ Vercel 배포 정상, 런타임 비용 없음 |
| Plan | CSR 페이지 분리 (`'use client'`) | ✅ 하이드레이션 오류 없음 |
| Design | 4계층 분리 (scripts → data → src → Browser) | ✅ 관심사 분리 명확, 유지보수 용이 |
| Design | WDS 디자인 토큰 inline style 적용 | ✅ Tailwind 커스텀 없이 일관성 유지 |
| Sprint 8 | Method A/B 분기 요약 (팩트형/분석형) | ✅ 왜곡 방지 4단계 검증으로 정확도 향상 |
| Sprint 8+ | `node-screener.js` 서버사이드 스크리닝 포트 | ✅ 브라우저 없이 자동 일괄 요약 가능 |

### 2.2 Technical Highlights

- **Gemini 모델 체인**: `gemini-2.5-flash` → `gemini-3.1-flash-lite-preview` → `gemma-3-4b-it` (3단계 fallback)
- **왜곡 방지 검증**: 수치 보존 + 엔티티 보존 + 근거 없는 항목 null 강제
- **EV 필터**: 4단계 Cascade — 소비자 EV 콘텐츠 제외, V2G·충전 인프라는 허용
- **Greedy Diversity**: Pass 3에서 25점 미만 기사 제외, categoryMax + sourceMax cap

---

## 3. Success Criteria Final Status

| 기준 | 상태 | 근거 |
|------|------|------|
| 26개 소스 중 20개+ 정상 수집 | ✅ Met | 24개 활성 (`sources.js`) |
| /collect 정상 동작 | ✅ Met | CSR, 14일 기사 로드 + 스크리닝 |
| /screening 정상 동작 | ✅ Met | screenArticles() 3-Pass 구현 |
| /generate 정상 동작 | ✅ Met | 뉴스레터 렌더링 + 인쇄·HTML·확정 |
| 복사·인쇄 버튼 동작 | ✅ Met | 인쇄 + HTML 저장으로 확장 |
| /newsletter-archive 정상 동작 | ✅ Met | 목록·상세·HTML저장·삭제 |
| 뉴스레터 요약 파이프라인 | ✅ Met | Method A/B + 자동 일괄 요약 |

**전체**: 7/7 기준 달성 ✅

---

## 4. Gap Analysis Summary

**최종 Match Rate: 97% (PASS)**

| 갭 | 심각도 | 처리 |
|----|--------|------|
| G-01: `node-screener.js` 설계 미등재 | Minor | ✅ Design v2.6에 반영 완료 |
| G-02: `summarize-top-articles.js` 설계 미등재 | Minor | ✅ Design v2.6에 반영 완료 |
| G-03: npm scripts CLAUDE.md 미반영 | Minor | ✅ CLAUDE.md 업데이트 완료 |
| G-04: Gemini 모델 체인 변경 | Info | ✅ Design v2.6에 반영 완료 |

---

## 5. Learnings

1. **서버사이드 스크리닝 포트 패턴**: 브라우저 TypeScript 로직을 Node.js CommonJS로 포팅할 때 알고리즘 일치를 유지하는 것이 중요. `node-screener.js`는 향후 다른 자동화 파이프라인에서도 재사용 가능.

2. **자동화 레벨 확장**: `--ids` 지정 방식 → 자동 스크리닝 선발 방식으로 진화. 크롤링 후 `newsletter:prep` 한 커맨드로 초안까지 생성되는 완전 자동화 달성.

3. **설계 문서 동기화**: 구현이 설계를 앞서갈 때 Sprint 직후 문서 업데이트 필요. 다음 스프린트 시작 전 항상 Design 버전과 CLAUDE.md를 동기화할 것.

---

## 6. Next Actions (Optional)

| 항목 | 우선순위 | 설명 |
|------|----------|------|
| Windows Task Scheduler 연동 | Medium | `npm run newsletter:prep`를 크롤링 스케줄러에 연결 |
| 요약 품질 모니터링 | Low | what/why/sowhat null 비율 추적 대시보드 |
| 요약 캐시 만료 정책 | Low | 오래된 draft 항목 자동 정리 |
