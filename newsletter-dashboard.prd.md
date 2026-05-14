# PRD: 전력 및 에너지 솔루션 뉴스레터 대시보드 v2 (Wanted Design System 적용)

---
**문서 버전**: v2.0.0  
**작성일**: 2026-04-30  
**PDCA 단계**: PM (Plan)  
**피처명**: energy-newsletter-dashboard-v2  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 기존 시스템에서 원문 링크 오류, 기사 개별 선택 기능 부재, 선택한 기사 기반의 2주 단위 뉴스레터 생성 오류 발생. 또한 UI가 대시보드 형태가 아니며 사용성이 떨어짐. |
| **Solution** | Wanted Design System을 적용한 직관적인 대시보드 UI 구축. 기사 개별 선택 체크박스 도입 및 상태 관리 강화, 2주 필터 및 선택된 기사만으로 뉴스레터를 생성하는 로직 수정. |
| **Functional UX Effect** | 관리자는 좌측 사이드바가 있는 대시보드에서 명확하게 기사를 개별 선택하고, 선택된 기사만 모아 정확하게 뉴스레터를 생성할 수 있음. |
| **Core Value** | 안정적이고 원활한 뉴스 취합 워크플로우 제공 및 Wanted Design System 기반의 프리미엄 UI/UX 경험 제공. |

---

## 1. 개선 및 변경 사항 (v2.0 핵심)

1. **디자인 시스템 전면 개편**: 
   - `c:\Users\mysuni_newsletter_pjt2\design_base`의 **Wanted Design System** 도입.
   - 메인 컬러: Cobalt Blue (`#0066FF`), 폰트: `Pretendard`, 둥근 모서리(16~32px) 및 그림자 효과를 활용한 프리미엄 대시보드 레이아웃(Sidebar + Main Content) 적용.
2. **뉴스 원문 링크 접속 불가 처리 (크롤링/수집 단계 제외)**:
   - 기사 원문 링크가 유효하지 않거나(예: 404 Not Found), 정상적인 접속이 불가능한 기사는 크롤링 및 수집 목록에서 원천적으로 제외하도록 데이터 수집 파이프라인(design) 수정.
   - 유효한 뉴스 카드의 '원문 보기' 버튼만 올바른 기사 원문 URL로 새 창(`target="_blank"`)에서 열리도록 보장.
3. **기사 선택 기능 (Selection Interface) 강화**:
   - 각 기사 카드에 개별 선택을 위한 명시적인 Checkbox 추가.
   - 개별 선택 및 전체 선택/해제 상태가 원활하게 작동하도록 프론트엔드 상태 관리(State Management) 강화.
4. **선택 기반 뉴스레터 생성 로직 수정**:
   - 뉴스레터 생성 시, 전체 데이터가 아닌 **최근 2주 이내의 기사 중 사용자가 명시적으로 선택(isSelected=true)한 기사들만** 필터링하여 생성하도록 API 및 로직 수정.

---

## 2. 핵심 기능 요구사항

### 2.1 대시보드 UI (Dashboard Layout)
- **사이드바 (Sidebar)**: 네비게이션 메뉴 (홈, 기사 수집 및 선택, 뉴스레터 생성, 과거 아카이브).
- **메인 영역 (Main Content)**: 상단 헤더(페이지 타이틀 및 상태 표시)와 카드 형태의 콘텐츠 영역. Wanted Design System의 `bg-subtle` 배경과 `bg-elevated` 카드를 활용.

### 2.2 뉴스 선택 UI (Select Articles)
- 각 뉴스 항목은 독립된 카드로 표시.
- 카드 내 필수 요소: **체크박스**, 카테고리 배지, 제목, 출처, 날짜, **원문 링크 버튼**.
- 상단에 'N개 선택됨' 카운터 및 '선택된 기사로 뉴스레터 생성' CTA 버튼(Cobalt Blue) 배치.

### 2.3 뉴스레터 빌더 (Newsletter Generator)
- DB에서 `isSelected = true` 이며 `publishedAt`이 최근 14일 이내인 기사만 로드.
- 로드된 기사들을 카테고리별로 그룹화하여 표시.
- Claude API를 호출하여 요약 생성 후 HTML 렌더링.

---

## 3. 기술 요구사항

### 3.1 기술 스택
- **프레임워크**: Next.js (App Router)
- **스타일링**: Tailwind CSS + **Wanted Design System CSS Tokens** (CSS Variables 통합)
- **DB**: SQLite + Prisma
- **LLM**: Claude Haiku API

### 3.2 Wanted Design System 적용 (Tailwind 확장)
- `colors_and_type.css`의 변수를 Tailwind `tailwind.config.ts`에 맵핑하여 사용.
- Primary: `var(--c-blue-500)` (`#0066FF`)
- Background: `var(--bg-subtle)` (`#F7F7F8` 또는 `rgb(247, 247, 248)`)
- Surface: `var(--bg-elevated)` (`#FFFFFF`)
- Font: `Pretendard`

### 3.3 데이터 모델 (기존 유지, 로직 강화)
```prisma
model News {
  id          String   @id @default(cuid())
  category    String
  title       String
  source      String
  url         String   @unique
  publishedAt DateTime
  summary     String?
  isSelected  Boolean  @default(false)
  createdAt   DateTime @default(now())
}
// ... Newsletter, NewsletterItem 모델
```

---

## 4. 구현 및 수정 방향 (Do Phase)

1. Next.js 프로젝트 설정 및 Wanted Design System(CSS, Font, Icon) 에셋 적용.
2. 대시보드 글로벌 레이아웃(Sidebar + Header) 구현.
3. 기사 목록 페이지의 기사 카드 및 체크박스 상태 관리(Selection) 기능 수정.
4. 원문 링크 오류 디버깅 및 보완 (url/link 필드 확인).
5. 뉴스레터 생성 페이지에서 선택된 2주치 데이터만 불러오는 로직 작성.
