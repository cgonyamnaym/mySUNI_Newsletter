/**
 * 크롤링 소스 정의 - sources.json과 동기화됨 (Google News 배제, 직접 추출)
 */
module.exports = [
  // ══════════════════════════════════════════
  // 영어 — RSS 직접
  // ══════════════════════════════════════════
  { id: 'energy-storage', name: 'Energy Storage News', url: 'https://www.energy-storage.news', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.energy-storage.news/feed/', enabled: true },
  { id: 'canary-media', name: 'Canary Media', url: 'https://www.canarymedia.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.canarymedia.com/feed', enabled: true },
  { id: 'pv-magazine', name: 'PV Magazine', url: 'https://www.pv-magazine.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://www.pv-magazine.com/feed/', enabled: true },
  // Reuters Energy 401 paywall → CleanTechnica (글로벌 클린에너지 전문)
  { id: 'cleantechnica', name: 'CleanTechnica', url: 'https://cleantechnica.com', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://cleantechnica.com/feed/', enabled: true },
  // Renewables Now 403 Cloudflare → Electrek (EV·재생에너지 전문)
  { id: 'electrek', name: 'Electrek', url: 'https://electrek.co', origin: 'global', lang: 'en', type: 'rss', rssUrl: 'https://electrek.co/feed/', enabled: true },

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

  // ══════════════════════════════════════════
  // 국내 — RSS 직접
  // ══════════════════════════════════════════
  { id: 'ekn', name: '에너지경제신문', url: 'https://www.ekn.kr', origin: 'domestic', lang: 'ko', type: 'scrape', scrapeConfig: { listUrl: 'https://www.ekn.kr/web/newsTotalList.php?ncid=N01', titleSelector: 'h1.news-list-title', linkSelector: '.news-list-box a', dateSelector: '.news-list-date_info', pagination: { type: 'url-param', param: 'page', startPage: 1, maxPages: 5 } }, enabled: true },
  { id: 'electimes', name: '전기신문', url: 'https://www.electimes.com', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'https://www.electimes.com/rss/allArticle.xml', enabled: true },
  { id: 'etnews', name: '전자신문 (Energy)', url: 'https://www.etnews.com', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'http://rss.etnews.co.kr/Section902.xml', enabled: true },
  { id: 'e2news', name: '이투뉴스 (E2News)', url: 'https://www.e2news.com', origin: 'domestic', lang: 'ko', type: 'rss', rssUrl: 'https://www.e2news.com/rss/allArticle.xml', enabled: true },
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
  { id: 'igt', name: '녹색에너지연구원 (IGT)', url: 'https://igt.or.kr', origin: 'domestic', lang: 'ko', type: 'scrape', scrapeConfig: { listUrl: 'https://igt.or.kr/bbs/board.php?bo_table=m03_03', titleSelector: 'a.item-subject', linkSelector: 'a.item-subject', dateSelector: '.wr-date, td.td_datetime', pagination: { type: 'url-param', param: 'page', startPage: 1, maxPages: 5 } }, enabled: true }
];
