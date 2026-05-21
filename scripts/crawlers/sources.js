/**
 * 크롤링 소스 정의 - sources.json과 동기화됨 (Google News 배제, 직접 추출)
 */
module.exports = [
  // ══════════════════════════════════════════
  // 영어 — RSS 직접
  // ══════════════════════════════════════════
  { id: 'energy-storage', name: 'Energy Storage News', url: 'https://www.energy-storage.news', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.energy-storage.news/feed/', enabled: true },
  // Electrification 특화 필터 적용 — 재생에너지 일반 기사 제외, 전화(건물·수송·그리드) 기사만 수집
  { id: 'canary-media', name: 'Canary Media', url: 'https://www.canarymedia.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.canarymedia.com/feed',
    keywords: ['electrif', 'power grid', 'grid upgrade', 'transmission', 'demand response', 'virtual power plant'],
    enabled: true },
  { id: 'pv-magazine', name: 'PV Magazine', url: 'https://www.pv-magazine.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.pv-magazine.com/feed/', enabled: true },
  // Reuters Energy 401 paywall → CleanTechnica (글로벌 클린에너지 전문)
  { id: 'cleantechnica', name: 'CleanTechnica', url: 'https://cleantechnica.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://cleantechnica.com/feed/', enabled: true },
  // Renewables Now 403 Cloudflare → Electrek (EV·재생에너지 전문) — 태양광 편향 과잉으로 비활성화
  { id: 'electrek', name: 'Electrek', url: 'https://electrek.co', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://electrek.co/feed/', enabled: false },

  // ══════════════════════════════════════════
  // 영어 — 스크래핑
  // ══════════════════════════════════════════
  { id: 'iea', name: 'IEA', url: 'https://www.iea.org', origin: 'global', lang: 'en', type: 'scrape', scrapeConfig: { listUrl: 'https://www.iea.org/news', titleSelector: '.m-news-detailed-listing__hover', linkSelector: '.m-news-detailed-listing__hover', dateSelector: 'time[datetime]', pagination: { type: 'url-param', param: 'page', startPage: 1, maxPages: 5 } }, enabled: true },
  { id: 'irena', name: 'IRENA', url: 'https://www.irena.org', origin: 'global', lang: 'en', type: 'pdf',
    // 웹사이트 전체 403 차단 → directPdfUrls로 최신 보고서 직접 등록
    // 신규 보고서 발행 시 https://www.irena.org/Publications 에서 URL 확인 후 추가
    directPdfUrls: [
      'https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2024/Nov/IRENA_World_Energy_Transitions_Outlook_2024.pdf',
      'https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2024/Sep/IRENA_Renewable_power_generation_costs_2023.pdf',
    ],
    enabled: true },
  { id: 'bnef', name: 'BloombergNEF', url: 'https://about.bnef.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://about.bnef.com/feed/', enabled: true },
  // Slowly Beautiful 빈 사이트 → WindPower Monthly (풍력에너지 전문)
  { id: 'windpower-monthly', name: 'WindPower Monthly', url: 'https://www.windpowermonthly.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.windpowermonthly.com/rss', enabled: true },

  // ── 원전 ─────────────────────────────────────────────────────────────────
  // World Nuclear Association 운영 원전 전문 매체 (30년+ 운영)
  { id: 'world-nuclear-news', name: 'World Nuclear News', url: 'https://www.world-nuclear-news.org', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.world-nuclear-news.org/rss', enabled: true },

  // ── 정책·기후 ─────────────────────────────────────────────────────────────
  // 에너지 정책 팩트체크·심층분석 (자금 출처 공개, Reuters 등 인용)
  { id: 'carbon-brief', name: 'Carbon Brief', url: 'https://www.carbonbrief.org', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.carbonbrief.org/feed', enabled: true },

  // ── AI 데이터센터 전력 ────────────────────────────────────────────────────
  // 데이터센터 인프라·전력 전문 (2000년 창간)
  { id: 'data-center-dynamics', name: 'Data Center Dynamics', url: 'https://www.datacenterdynamics.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.datacenterdynamics.com/en/rss/', enabled: true },

  // ── 전력망·전력시장 ──────────────────────────────────────────────────────────
  // 전력산업 정책·규제·시장 전문 (Industry Dive / Informa 소유, 공신력 높음)
  { id: 'utility-dive', name: 'Utility Dive', url: 'https://www.utilitydive.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.utilitydive.com/feeds/news/', enabled: true },

  // ── 발전기술 (화석연료 배제) ─────────────────────────────────────────────────
  // 발전설비 기술 전문 (Access Intelligence) — 원전·재생에너지·그리드·데이터센터 기사만 수집
  // 화석연료(석탄·가스) 기사는 keywords 화이트리스트로 자동 배제
  { id: 'power-magazine', name: 'Power Magazine', url: 'https://www.powermag.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.powermag.com/feed/',
    keywords: ['nuclear', 'solar', 'wind', 'battery', 'energy storage', 'renewable', 'hydropower', 'geothermal', 'hydrogen', 'fuel cell', 'data center', 'grid', 'transmission', 'microgrid', 'smr', 'carbon capture'],
    enabled: true },

  // ── 수소 ─────────────────────────────────────────────────────────────────
  // 글로벌 수소 뉴스 집약 플랫폼 (RSS 접근 확인됨)
  { id: 'hydrogen-central', name: 'Hydrogen Central', url: 'https://hydrogen-central.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://hydrogen-central.com/feed/', enabled: false },  // 본문 3문장 수준 — 보류

  // ══════════════════════════════════════════
  // 국내 — RSS 직접
  // ══════════════════════════════════════════
  { id: 'ekn', name: '에너지경제신문', url: 'https://www.ekn.kr', origin: 'domestic', lang: 'ko', type: 'scrape', scrapeConfig: { listUrl: 'https://www.ekn.kr/web/newsTotalList.php?ncid=N01', titleSelector: 'h1.news-list-title', linkSelector: '.news-list-box a', dateSelector: '.news-list-date_info', pagination: { type: 'url-param', param: 'page', startPage: 1, maxPages: 5 } }, enabled: true },
  { id: 'electimes', name: '전기신문', url: 'https://www.electimes.com', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'https://www.electimes.com/rss/allArticle.xml', enabled: true },
  { id: 'etnews', name: '전자신문 (Energy)', url: 'https://www.etnews.com', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'http://rss.etnews.co.kr/Section902.xml', enabled: true },
  // allArticle.xml(전체 RSS) → S1N4 섹션 스크래핑으로 교체 (전기·전력·원전 집중)
  { id: 'e2news', name: '이투뉴스 (E2News)', url: 'https://www.e2news.com', origin: 'domestic', lang: 'ko', type: 'scrape',
    scrapeConfig: {
      listUrl: 'https://www.e2news.com/news/articleList.html?sc_section_code=S1N4&view_type=sm',
      titleSelector: 'a[href*="articleView.html"]',
      dateSelector: '.byline em, .list-dated',
      pagination: { type: 'url-param', param: 'page', startPage: 1, maxPages: 5 },
    },
    enabled: true },
  // 뉴스1 SPA·RSS 없음 → 에너지데일리 (국내 에너지산업 전문, 현행 업데이트)
  { id: 'energydaily', name: '에너지데일리', url: 'https://www.energydaily.co.kr', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'https://www.energydaily.co.kr/rss/allArticle.xml', enabled: true },
  { id: 'todayenergy', name: '투데이에너지', url: 'https://www.todayenergy.kr', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'https://www.todayenergy.kr/rss/allArticle.xml', enabled: true },
  { id: 'energytimes', name: '에너지타임즈', url: 'https://www.energytimes.kr', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'https://www.energytimes.kr/rss/allArticle.xml', enabled: true },

  // ══════════════════════════════════════════
  // 국내 — 스크래핑
  // ══════════════════════════════════════════
  // MOTIE 네트워크 차단(한국 IP 전용) → 그린포스트코리아 (국내 녹색·에너지 정책 뉴스)
  { id: 'greenpost', name: '그린포스트코리아', url: 'https://www.greenpostkorea.co.kr', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'https://www.greenpostkorea.co.kr/rss/allArticle.xml', enabled: true },
  { id: 'kea', name: '한국에너지공단 (KEA)', url: 'https://www.energy.or.kr', origin: 'domestic', lang: 'ko', type: 'scrape', scrapeConfig: { listUrl: 'https://www.energy.or.kr/front/board/List3.do', titleSelector: null, dateSelector: 'td', onclickPattern: { selector: 'a[onclick*="fn_Detail"]', regex: "fn_Detail\\('(\\d+)','(\\d+)'\\)", urlTemplate: 'https://www.energy.or.kr/front/board/View3.do?boardMngNo=$1&boardNo=$2', titleSelector: 'span' }, pagination: { type: 'url-param', param: 'pageIndex', startPage: 1, maxPages: 5 } }, enabled: true },
  { id: 'igt', name: '녹색에너지연구원 (IGT)', url: 'https://igt.or.kr', origin: 'domestic', lang: 'ko', type: 'scrape', scrapeConfig: { listUrl: 'https://igt.or.kr/bbs/board.php?bo_table=m03_03', titleSelector: 'a.item-subject', linkSelector: 'a.item-subject', dateSelector: '.wr-date, td.td_datetime', pagination: { type: 'url-param', param: 'page', startPage: 1, maxPages: 5 } }, enabled: true },

  // ── 국내 추가 소스 ────────────────────────────────────────────────────────
  // 한국원자력산업협회 — 투데이뉴스 (td.col-tit a / td.col-date, gp 페이지네이션 확인)
  { id: 'kaif', name: '한국원자력산업협회', url: 'https://www.kaif.or.kr', origin: 'domestic', lang: 'ko', type: 'scrape',
    scrapeConfig: { listUrl: 'https://www.kaif.or.kr/ko/?c=251&s=250', titleSelector: 'td.col-tit a', linkSelector: 'td.col-tit a', dateSelector: 'td.col-date', pagination: { type: 'url-param', param: 'gp', startPage: 1, maxPages: 5 } },
    enabled: true },
];
