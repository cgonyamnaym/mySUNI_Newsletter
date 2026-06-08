/**
 * 샘플 데이터 생성 + CSV 추출 스크립트
 * - 2026-04-01 ~ 2026-04-14 (4월 1,2주차) 기사 데이터를 생성하고 CSV로 내보냄
 * - 기사는 날짜별로 직접 정의하여 중복 없음 (pool 회전 방식 제거)
 * Run: node scripts/generate-sample-and-export-csv.js
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DATA_DAILY = path.join(__dirname, '../public/data/daily')
const EXPORT_DIR = path.join(__dirname, '../public/data/export')

fs.mkdirSync(DATA_DAILY, { recursive: true })
fs.mkdirSync(EXPORT_DIR, { recursive: true })

// ──────────────────────────────────────────
// 날짜별 기사 직접 정의 (각 기사는 정확히 하나의 날짜에 속함)
// ──────────────────────────────────────────
const ARTICLES_BY_DATE = {
  '2026-04-01': [
    {
      source: '전기신문', sourceId: 'electimes', lang: 'ko',
      title: '한전, 2030년까지 송배전망 23조 원 투자 계획 발표',
      titleOrig: null,
      summary: '한국전력이 2030년까지 노후 송배전 설비 교체와 재생에너지 연계 망 확충에 23조 원을 투자하는 계획을 발표했습니다. 특히 호남권과 서해안 해상풍력 연계 선로 구축에 집중 투자할 예정입니다.',
      topics: ['전력 인프라'],
      url: 'https://www.electimes.com/article/260401001',
    },
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: '한수원, SMR 최초 설계 인가 신청 — 2035년 상용화 목표',
      titleOrig: null,
      summary: '한국수력원자력이 국내 최초로 소형모듈원전(SMR) 표준설계 인가를 원자력안전위원회에 신청했습니다. 전기출력 170MW급으로, 2035년 상용화를 목표로 하며 수출 시장도 동시에 겨냥하고 있습니다.',
      topics: ['에너지원', '정책·규제'],
      url: 'https://www.ekn.kr/article/260401001',
    },
    {
      source: '투데이에너지', sourceId: 'todayenergy', lang: 'ko',
      title: 'VPP 운영 사업자 15개사 선정 — 가상발전소 시대 본격화',
      titleOrig: null,
      summary: '전력거래소가 VPP(가상발전소) 상업 운영 사업자 15개사를 최종 선정했습니다. ESS·태양광·수요 자원을 통합 제어하여 전력 시장에 참여하는 구조로, 총 용량은 약 500MW입니다.',
      topics: ['운영 최적화', '전력 인프라'],
      url: 'https://www.todayenergy.kr/article/260401001',
    },
    {
      source: 'Canary Media', sourceId: 'canary-media', lang: 'en',
      title: '기업 탄소 감축 약속 이행 격차 보고서 — 선언 대비 실행 60% 수준',
      titleOrig: 'Corporate climate pledge gap report shows 60% implementation rate vs. commitments',
      summary: 'Carbon Disclosure Project(CDP)가 발표한 보고서에 따르면 기업들의 탄소 감축 목표 대비 실제 이행률이 60%에 그치고 있습니다. 공급망 Scope 3 배출 관리와 자금 조달이 주요 장애 요인으로 꼽혔습니다.',
      topics: ['ESG·탄소중립'],
      url: 'https://www.canarymedia.com/climate/corporate-pledge-gap-2026',
    },
    {
      source: '전기신문', sourceId: 'electimes', lang: 'ko',
      title: '국제 LNG 현물가격 MMBtu당 8달러대 안정 — 유럽 재고 회복 영향',
      titleOrig: null,
      summary: '유럽의 LNG 저장 재고가 동절기 이후 빠르게 회복되면서 국제 LNG 현물 가격이 MMBtu당 8달러대로 안정됐습니다. 국내 발전용 LNG 비용 부담이 완화될 것으로 기대되나 여름철 재상승 가능성도 있습니다.',
      topics: ['시장·가격 동향'],
      url: 'https://www.electimes.com/article/260401002',
    },
  ],

  '2026-04-02': [
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: '스마트그리드 AMI 전국 보급률 90% 돌파 — 2025년 목표 달성',
      titleOrig: null,
      summary: '지능형 전력계량기(AMI) 전국 보급률이 90%를 넘어섰습니다. 수용가 데이터 실시간 수집이 가능해지면서 전력 수요 예측 정밀도가 크게 향상됐으며, 향후 VPP 운영 기반이 될 전망입니다.',
      topics: ['전력 인프라', '운영 최적화'],
      url: 'https://www.ekn.kr/article/260402001',
    },
    {
      source: 'PV Magazine', sourceId: 'pv-magazine', lang: 'en',
      title: '태양광 모듈 가격 2026년 1분기 역대 최저 — 와트당 0.12달러',
      titleOrig: 'Solar module prices hit record low in Q1 2026 at $0.12/W',
      summary: '블룸버그NEF에 따르면 2026년 1분기 태양광 모듈 평균 가격이 와트당 0.12달러로 역대 최저를 기록했습니다. 중국 제조업체의 공급 과잉이 주요 원인이며, 신흥 시장에서의 보급 확대로 이어질 전망입니다.',
      topics: ['에너지원', '시장·가격 동향'],
      url: 'https://www.pv-magazine.com/2026/04/02/solar-module-record-low',
    },
    {
      source: 'Renewables Now', sourceId: 'renewables-now', lang: 'en',
      title: '영국 NESO, AI 기반 실시간 재생에너지 계통 균형 시스템 가동',
      titleOrig: 'UK NESO launches AI-powered real-time balancing system for renewables integration',
      summary: '영국 국가전력시스템운영자(NESO)가 재생에너지 출력 변동을 실시간으로 보정하는 AI 계통 균형 시스템을 가동했습니다. 풍력과 태양광 예측 정밀도가 25% 향상되어 예비력 비용이 크게 절감됐습니다.',
      topics: ['운영 최적화', '전력 인프라'],
      url: 'https://renewablesnow.com/2026/04/02/uk-neso-ai-balancing',
    },
    {
      source: 'Reuters Energy', sourceId: 'reuters-energy', lang: 'en',
      title: 'EU 에너지 시스템 통합 규정 발효 — 국경 간 재생에너지 거래 촉진',
      titleOrig: 'EU energy system integration regulation enters into force, boosting cross-border renewable trading',
      summary: 'EU 에너지 시스템 통합 규정이 공식 발효돼 회원국 간 재생에너지 전력 거래 장벽이 낮아졌습니다. 이에 따라 태양광과 풍력 잉여 전력의 국경 간 거래가 활성화되고 에너지 가격 안정에 기여할 전망입니다.',
      topics: ['정책·규제', '시장·가격 동향'],
      url: 'https://www.reuters.com/business/energy/eu-energy-integration-regulation-2026',
    },
    {
      source: 'IEA', sourceId: 'iea', lang: 'en',
      title: 'IEA, 2026년 글로벌 청정에너지 투자 4조 달러 돌파 전망',
      titleOrig: 'IEA forecasts global clean energy investment to surpass $4 trillion in 2026',
      summary: 'IEA의 최신 보고서에 따르면 2026년 전 세계 청정에너지 투자가 처음으로 4조 달러를 돌파할 것으로 예상됩니다. 태양광·풍력·배터리 투자가 화석연료 투자를 3배 이상 앞서는 역대 최대 격차입니다.',
      topics: ['ESG·탄소중립', '시장·가격 동향'],
      url: 'https://www.iea.org/reports/2026/clean-energy-investment-outlook',
    },
  ],

  '2026-04-03': [
    {
      source: '투데이에너지', sourceId: 'todayenergy', lang: 'ko',
      title: '분산에너지 자원관리시스템(DERMS) 구축 사업 공모 시작',
      titleOrig: null,
      summary: '산업통상자원부가 DERMS 실증 사업 공모를 시작했습니다. 총 사업비 500억 원 규모로 VPP와 ESS를 통합 운영하는 플랫폼 구축이 목표이며, 2027년까지 실증을 완료할 계획입니다.',
      topics: ['전력 인프라', '운영 최적화'],
      url: 'https://www.todayenergy.kr/article/260403001',
    },
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: '제11차 전력수급기본계획 최종안 확정 — 원전·재생에너지 조화 강조',
      titleOrig: null,
      summary: '산업부가 제11차 전력수급기본계획을 확정했습니다. 2038년까지 원전 비중 35%, 재생에너지 비중 30%를 목표로 하며 LNG 비중은 점진적으로 축소할 계획입니다. 무탄소전원 중심 전원 믹스 전환이 핵심입니다.',
      topics: ['정책·규제', '에너지원'],
      url: 'https://www.ekn.kr/article/260403001',
    },
    {
      source: 'IRENA', sourceId: 'irena', lang: 'en',
      title: 'IRENA, 재생에너지 균등화발전비용 보고서 — 태양광 LCOE 화력 대비 40% 저렴',
      titleOrig: 'IRENA renewable power generation costs report: Solar LCOE now 40% cheaper than fossil fuels',
      summary: 'IRENA가 발표한 2025년 재생에너지 발전 비용 보고서에 따르면, 태양광 균등화발전비용(LCOE)이 화력발전 대비 평균 40% 저렴해졌습니다. 재생에너지의 경제성 우위가 글로벌 에너지 전환을 가속화할 전망입니다.',
      topics: ['시장·가격 동향', '에너지원'],
      url: 'https://www.irena.org/publications/2026/renewable-power-costs-2025',
    },
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: '국내 전력 도매가격 1분기 MWh당 평균 89달러 — 재생에너지 증가로 하향 안정',
      titleOrig: null,
      summary: '2026년 1분기 한국 전력시장 계통한계가격(SMP) 평균이 MWh당 89달러로 전년 동기 대비 12% 하락했습니다. 태양광 설치 증가로 낮 시간대 공급 여유가 확대된 것이 주요 원인으로 분석됩니다.',
      topics: ['시장·가격 동향'],
      url: 'https://www.ekn.kr/article/260403002',
    },
  ],

  '2026-04-04': [
    {
      source: 'Reuters Energy', sourceId: 'reuters-energy', lang: 'en',
      title: '미국 FERC, 계통 연계 절차 개혁안 최종 승인 — 재생에너지 접속 가속',
      titleOrig: 'FERC approves final rule to reform interconnection process for faster renewable access',
      summary: '미국 연방에너지규제위원회(FERC)가 재생에너지 계통 접속 대기 기간을 5년에서 1.5년으로 단축하는 개혁안을 최종 승인했습니다. 전국 약 2,600GW의 계통 접속 신청 적체를 해소하기 위한 조치입니다.',
      topics: ['전력 인프라', '정책·규제'],
      url: 'https://www.reuters.com/business/energy/ferc-interconnection-reform-2026',
    },
    {
      source: 'Energy Storage News', sourceId: 'energy-storage', lang: 'en',
      title: '국내 ESS 누적 설치 용량 15GWh 돌파 — 전력망 안정화 핵심 축',
      titleOrig: 'South Korea ESS cumulative capacity surpasses 15GWh milestone',
      summary: '한국의 에너지저장장치(ESS) 누적 설치 용량이 15GWh를 넘어섰습니다. 재생에너지 출력 변동성 완충과 피크 저감 역할이 확대되면서 산업용·유틸리티용 대형 ESS 발주가 활발합니다.',
      topics: ['에너지원', '전력 인프라'],
      url: 'https://www.energy-storage.news/2026/04/04/south-korea-ess-15gwh',
    },
    {
      source: '이투뉴스 (E2News)', sourceId: 'e2news', lang: 'ko',
      title: 'RE100 이행 인증 절차 간소화 — 산업부, 제3자 PPA 확대 방침',
      titleOrig: null,
      summary: '산업부가 기업 RE100 이행을 위한 제3자 전력구매계약(PPA) 체결 절차를 대폭 간소화하는 방안을 발표했습니다. 재생에너지 공급 인증서(REC) 발급 기간도 현행 30일에서 5일로 단축됩니다.',
      topics: ['정책·규제', 'ESG·탄소중립'],
      url: 'https://www.e2news.com/news/260404001',
    },
    {
      source: 'BloombergNEF', sourceId: 'bnef', lang: 'en',
      title: '아시아 전력 스토리지 투자 2025년 450억 달러 — 한국·중국·일본 3강 구도',
      titleOrig: 'Asia power storage investment reaches $45B in 2025, led by South Korea, China and Japan',
      summary: '블룸버그NEF에 따르면 2025년 아시아 전력 저장장치 투자 규모가 450억 달러에 달했습니다. 한국은 삼성SDI·LG에너지솔루션의 해외 공장 증설과 내수 ESS 시장 확대로 세계 3위 투자국을 유지했습니다.',
      topics: ['시장·가격 동향', '에너지원'],
      url: 'https://about.bnef.com/research/2026/asia-storage-investment',
    },
  ],

  '2026-04-07': [
    {
      source: '이투뉴스 (E2News)', sourceId: 'e2news', lang: 'ko',
      title: '해상풍력 3.0GW 추가 허가 — 서남해권 집중 개발',
      titleOrig: null,
      summary: '정부가 서남해 해상풍력 사업지 3.0GW에 대한 발전 허가를 승인했습니다. 총 사업비 약 15조 원 규모로, 2030년까지 단계적으로 준공할 예정입니다. 국내 풍력 산업 공급망 강화 효과도 기대됩니다.',
      topics: ['에너지원', '정책·규제'],
      url: 'https://www.e2news.com/news/260407001',
    },
    {
      source: '에너지타임즈', sourceId: 'energytimes', lang: 'ko',
      title: '삼성전자·SK하이닉스, RE100 100% 달성 선언 — 반도체 업계 선도',
      titleOrig: null,
      summary: '삼성전자와 SK하이닉스가 국내 사업장 전력 100%를 재생에너지로 전환했다고 선언했습니다. 양사 합산 재생에너지 구매량은 약 15TWh로, 국내 기업 RE100 이행에서 선도적 역할을 하고 있습니다.',
      topics: ['ESG·탄소중립', '정책·규제'],
      url: 'https://www.energytimes.kr/news/260407001',
    },
    {
      source: '전자신문 (Energy)', sourceId: 'etnews', lang: 'ko',
      title: 'AI 기반 전력 수요 예측 시스템 오차율 1% 미만 달성',
      titleOrig: null,
      summary: '한전KDN과 카이스트 공동 연구팀이 AI 딥러닝 기반 전력 수요 예측 시스템의 단기 예측 오차율을 1% 미만으로 줄이는 데 성공했습니다. 기상 변수 200여 개와 소비 패턴 데이터를 결합한 결과로, 수급 안정에 기여할 전망입니다.',
      topics: ['운영 최적화'],
      url: 'https://www.etnews.com/news/260407001',
    },
    {
      source: 'Reuters Energy', sourceId: 'reuters-energy', lang: 'en',
      title: '글로벌 배터리 공급망 재편 — 미국·유럽 자국 생산 가속화',
      titleOrig: 'Global battery supply chain realignment accelerates as US and Europe push local production',
      summary: 'IRA와 NZIA 보조금 경쟁으로 미국과 유럽 내 배터리 셀 생산 공장 건설이 급속히 늘고 있습니다. 아시아 의존도를 줄이려는 정책 압력이 국내 배터리 업체의 현지 투자를 촉진하고 있습니다.',
      topics: ['시장·가격 동향', '정책·규제'],
      url: 'https://www.reuters.com/business/energy/battery-supply-chain-realignment-2026',
    },
    {
      source: '뉴스1 (Energy)', sourceId: 'news1-energy', lang: 'ko',
      title: '탄소중립 기본법 시행령 일부 개정 — 배출권거래제 운영 기준 강화',
      titleOrig: null,
      summary: '탄소중립 기본법 시행령 개정으로 배출권거래제 3기(2026~2030) 운영 기준이 강화됐습니다. 무상할당 비율이 현행 90%에서 80%로 낮아지고 유상할당 수익의 절반을 저탄소 R&D에 재투자하도록 의무화됐습니다.',
      topics: ['정책·규제', 'ESG·탄소중립'],
      url: 'https://www.news1.kr/energy/260407001',
    },
  ],

  '2026-04-08': [
    {
      source: '에너지타임즈', sourceId: 'energytimes', lang: 'ko',
      title: '그린수소 생산단가 2026년 kg당 4달러대 진입 — 상용화 임박',
      titleOrig: null,
      summary: '국제에너지기구(IEA) 분석에 따르면 글로벌 그린수소 평균 생산단가가 kg당 4달러대로 낮아졌습니다. 2030년 목표였던 2달러/kg 달성을 위한 투자가 계속 확대되고 있어 수소 경제 활성화 속도가 빨라지고 있습니다.',
      topics: ['에너지원', '시장·가격 동향'],
      url: 'https://www.energytimes.kr/news/260408001',
    },
    {
      source: 'Renewables Now', sourceId: 'renewables-now', lang: 'en',
      title: '인도 태양광 용량 300GW 돌파 — 2030년 500GW 목표 순항',
      titleOrig: 'India solar capacity crosses 300GW milestone, on track for 500GW by 2030',
      summary: '인도의 태양광 누적 설치 용량이 300GW를 초과했습니다. 연방 정부의 PM-KUSUM 농촌 태양광 보급 사업과 기업 PPA 계약 확대가 성장을 이끌고 있으며, 2030년 500GW 목표 달성 가능성이 높아졌습니다.',
      topics: ['에너지원'],
      url: 'https://renewablesnow.com/2026/04/08/india-solar-300gw',
    },
    {
      source: '전기신문', sourceId: 'electimes', lang: 'ko',
      title: '한전, 제주 풍력 출력 제한(커텍) 손실 보상 체계 마련',
      titleOrig: null,
      summary: '한국전력이 재생에너지 출력 제한으로 인한 발전사업자 손실을 보상하는 계통 유연성 인센티브 체계 초안을 마련했습니다. 제주도를 시범 적용 후 전국으로 확대할 예정입니다.',
      topics: ['전력 인프라', '정책·규제'],
      url: 'https://www.electimes.com/article/260408001',
    },
    {
      source: 'BloombergNEF', sourceId: 'bnef', lang: 'en',
      title: '글로벌 탄소 크레딧 시장 2026년 300억 달러 규모 전망',
      titleOrig: 'Global carbon credit market projected to reach $30B in 2026 amid corporate demand',
      summary: '블룸버그NEF는 기업 자발적 탄소 상쇄 수요 확대로 글로벌 탄소 크레딧 시장이 2026년 300억 달러에 달할 것으로 전망했습니다. 고품질 REDD+ 및 청정 기술 크레딧 수요가 가장 빠르게 성장하고 있습니다.',
      topics: ['ESG·탄소중립', '시장·가격 동향'],
      url: 'https://about.bnef.com/research/2026/carbon-credit-market',
    },
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: '전력 도매시장 개편안 공개 — 용량요금제 도입 검토',
      titleOrig: null,
      summary: '전력거래소가 현행 단일가격(SMP) 중심 도매시장에 용량시장(Capacity Market)을 추가하는 개편안을 공개했습니다. 발전소 건설 투자 유인 확보와 수급 안정성 강화가 목적입니다.',
      topics: ['시장·가격 동향', '정책·규제'],
      url: 'https://www.ekn.kr/article/260408001',
    },
  ],

  '2026-04-09': [
    {
      source: '전자신문 (Energy)', sourceId: 'etnews', lang: 'ko',
      title: '에너지 빈곤층 지원 프로그램 확대 — 고효율 가전 교체 바우처 신설',
      titleOrig: null,
      summary: '정부가 에너지 취약계층의 에너지 비용 부담 완화를 위해 고효율 가전제품 교체 바우처 사업을 신설했습니다. 연간 10만 가구를 지원 대상으로 하며, 에어컨·냉장고·보일러 교체 시 최대 50만 원을 지원합니다.',
      topics: ['정책·규제'],
      url: 'https://www.etnews.com/news/260409001',
    },
    {
      source: 'PV Magazine', sourceId: 'pv-magazine', lang: 'en',
      title: '페로브스카이트 태양전지 효율 30% 돌파 — 상용화 청신호',
      titleOrig: 'Perovskite solar cell efficiency breaks 30% barrier in lab conditions',
      summary: '독일 헬름홀츠 베를린 연구소가 페로브스카이트-실리콘 탠덤 태양전지에서 실험실 조건 효율 30%를 달성했다고 발표했습니다. 기존 실리콘 셀 한계를 넘어서는 성과로, 상용화 가능성이 주목받고 있습니다.',
      topics: ['에너지원'],
      url: 'https://www.pv-magazine.com/2026/04/09/perovskite-30-percent',
    },
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: 'ESG 공시 의무화 범위 확대 — 2027년부터 코스피 전체 적용',
      titleOrig: null,
      summary: '금융위원회가 ESG 공시 의무화 로드맵을 확정, 2027년부터 코스피 상장사 전체에 탄소 배출·에너지 사용 공시를 의무화합니다. 공급망 Scope 3 배출 공시는 2029년부터 단계적으로 적용됩니다.',
      topics: ['ESG·탄소중립', '정책·규제'],
      url: 'https://www.ekn.kr/article/260409001',
    },
    {
      source: 'Energy Storage News', sourceId: 'energy-storage', lang: 'en',
      title: '미국 유틸리티 규모 ESS 신규 발주 1분기 최대 — 8GWh 수주',
      titleOrig: 'US utility-scale ESS orders hit Q1 record with 8GWh contracted',
      summary: '미국 에너지 저장장치 시장이 2026년 1분기 사상 최대 규모인 8GWh 신규 발주를 기록했습니다. ERCOT 텍사스와 캘리포니아 CAISO 계통 내 재생에너지 통합 수요가 주요 동인입니다.',
      topics: ['에너지원', '시장·가격 동향'],
      url: 'https://www.energy-storage.news/2026/04/09/us-ess-q1-record',
    },
  ],

  '2026-04-10': [
    {
      source: '투데이에너지', sourceId: 'todayenergy', lang: 'ko',
      title: '전력 계통 디지털 트윈 구축 완료 — 고장 예측 정확도 94%',
      titleOrig: null,
      summary: '한전이 전국 주요 변전소 및 송전 선로 디지털 트윈 시스템 구축을 완료했습니다. AI 기반 고장 예측 정확도가 94%를 기록하며, 정전 복구 시간이 기존 대비 40% 단축될 전망입니다.',
      topics: ['전력 인프라', '운영 최적화'],
      url: 'https://www.todayenergy.kr/article/260410001',
    },
    {
      source: 'IEA', sourceId: 'iea', lang: 'en',
      title: '중동 태양광 붐 — 사우디·UAE 50GW 공동 개발 협약',
      titleOrig: 'Middle East solar boom: Saudi Arabia and UAE sign 50GW joint development agreement',
      summary: 'IEA 보고에 따르면 사우디아라비아와 UAE가 2030년까지 50GW 규모의 공동 태양광 개발 협약을 체결했습니다. 두 국가 합산 재생에너지 목표를 크게 상향하는 이정표적 합의로 평가됩니다.',
      topics: ['에너지원', '시장·가격 동향'],
      url: 'https://www.iea.org/news/2026/middle-east-solar-50gw',
    },
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: '재생에너지 입찰 경쟁률 사상 최고 — 태양광 1.9:1, 풍력 2.3:1',
      titleOrig: null,
      summary: '산업부가 공고한 2026년 상반기 재생에너지 RPS 의무공급 입찰에 역대 최다 사업자가 참여했습니다. 낙찰 단가 하락세가 지속되면서 그리드 패리티 달성 시점이 앞당겨질 전망입니다.',
      topics: ['에너지원', '시장·가격 동향'],
      url: 'https://www.ekn.kr/article/260410001',
    },
    {
      source: 'Canary Media', sourceId: 'canary-media', lang: 'en',
      title: '미국 가정용 배터리 시장 급성장 — 2026년 설치 30만 가구 예상',
      titleOrig: 'US residential battery storage booms as installations projected to hit 300K homes in 2026',
      summary: '넷플로우 전력요금제와 태양광 발전량 증가로 미국 가정용 배터리 저장 시장이 급성장하고 있습니다. 캘리포니아·텍사스·플로리다 중심으로 2026년 30만 가구 신규 설치가 예상됩니다.',
      topics: ['에너지원', '운영 최적화'],
      url: 'https://www.canarymedia.com/energy/residential-battery-us-2026',
    },
    {
      source: '뉴스1 (Energy)', sourceId: 'news1-energy', lang: 'ko',
      title: '그린수소 국가 인증제 도입 — 산업부, 수소법 시행규칙 개정',
      titleOrig: null,
      summary: '산업통상자원부가 그린수소 생산 방식과 탄소 강도를 인증하는 국가 인증 제도를 도입하는 수소법 시행규칙 개정안을 발표했습니다. EU 수소법 기준과 호환되도록 설계돼 수출 경쟁력이 강화될 전망입니다.',
      topics: ['정책·규제', 'ESG·탄소중립'],
      url: 'https://www.news1.kr/energy/260410001',
    },
  ],

  '2026-04-11': [
    {
      source: 'PV Magazine', sourceId: 'pv-magazine', lang: 'en',
      title: '부유식 해상 태양광 시범 단지 운영 성과 공개 — 생산성 육상 대비 92%',
      titleOrig: 'Floating offshore solar pilot reports 92% productivity vs. land-based installation',
      summary: '네덜란드 TNO 연구소가 북해 부유식 해상 태양광 시범 단지의 1년 운영 결과를 공개했습니다. 일사량·냉각 효과를 감안한 실질 생산성이 육상 설비의 92%로, 상업적 타당성이 확인됐습니다.',
      topics: ['에너지원'],
      url: 'https://www.pv-magazine.com/2026/04/11/floating-offshore-solar-pilot',
    },
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: '국내 전기차 충전 인프라 50만 기 돌파 — 급속 비중 30%로 확대',
      titleOrig: null,
      summary: '국내 전기차 충전소 누적 설치 수가 50만 기를 넘어섰습니다. 급속 충전기 비중이 30%로 늘어났으며, 고속도로 휴게소와 아파트 단지 급속 충전망 확충이 전력 수요 분산에 기여하고 있습니다.',
      topics: ['전력 인프라', '운영 최적화'],
      url: 'https://www.ekn.kr/article/260411001',
    },
    {
      source: 'IRENA', sourceId: 'irena', lang: 'en',
      title: '아프리카 에너지 전환 투자 보고서 — 2030년까지 연 250억 달러 필요',
      titleOrig: 'Africa energy transition investment report: $25B per year needed through 2030',
      summary: 'IRENA 보고서는 아프리카 대륙의 에너지 전환 가속화를 위해 2030년까지 연 250억 달러의 투자가 필요하다고 분석했습니다. 현재 투자 수준의 3배로, 기후 재원 확충과 민간 투자 유치가 핵심 과제입니다.',
      topics: ['시장·가격 동향', 'ESG·탄소중립'],
      url: 'https://www.irena.org/publications/2026/africa-energy-transition',
    },
    {
      source: '이투뉴스 (E2News)', sourceId: 'e2news', lang: 'ko',
      title: '기업 PPA 시장 확대 — 올해 신규 계약 1.5TWh 전망',
      titleOrig: null,
      summary: '기업 직접 전력구매계약(Corporate PPA) 시장이 빠르게 성장하면서 2026년 신규 계약 규모가 1.5TWh를 넘어설 전망입니다. 중견기업까지 PPA 시장에 진입하면서 재생에너지 투자 유인이 다각화되고 있습니다.',
      topics: ['ESG·탄소중립', '시장·가격 동향'],
      url: 'https://www.e2news.com/news/260411001',
    },
  ],

  '2026-04-14': [
    {
      source: '에너지경제신문', sourceId: 'ekn', lang: 'ko',
      title: '국내 태양광 누적 설치 30GW 돌파 — 세계 7위 규모',
      titleOrig: null,
      summary: '국내 태양광 누적 설치 용량이 30GW를 돌파하며 세계 7위에 올랐습니다. 2030년 목표치인 45GW 달성을 위해 연 3GW 이상의 신규 설치가 필요하며, 대규모 영농형 태양광이 성장을 주도하고 있습니다.',
      topics: ['에너지원'],
      url: 'https://www.ekn.kr/article/260414001',
    },
    {
      source: '전기신문', sourceId: 'electimes', lang: 'ko',
      title: '분산에너지 활성화 특별법 시행령 입법예고 — VPP 연계 기준 확정',
      titleOrig: null,
      summary: '산업통상자원부가 분산에너지 활성화 특별법 시행령 제정안을 입법예고했습니다. VPP 운영 기준과 분산자원 계통 연계 절차가 구체화돼 업계의 사업 계획 수립에 도움이 될 것으로 기대됩니다.',
      topics: ['정책·규제', '전력 인프라'],
      url: 'https://www.electimes.com/article/260414001',
    },
    {
      source: 'Reuters Energy', sourceId: 'reuters-energy', lang: 'en',
      title: '유럽 에너지 저장 시장 2030년 200GWh 전망 — BNEF 보고서',
      titleOrig: 'European energy storage market to reach 200GWh by 2030, BNEF forecasts',
      summary: '블룸버그NEF가 유럽 에너지 저장 시장이 2030년 200GWh에 달할 것으로 예측했습니다. 국내 배터리 기업들의 유럽 시장 공략 기회가 확대될 전망이며, 현지 생산 요건 충족이 핵심 과제입니다.',
      topics: ['에너지원', '시장·가격 동향'],
      url: 'https://www.reuters.com/business/energy/europe-storage-200gwh-2030',
    },
    {
      source: '에너지타임즈', sourceId: 'energytimes', lang: 'ko',
      title: '봄철 전력 수급 안정 — 한전 수요 반응 인센티브 역대 최고 수준',
      titleOrig: null,
      summary: '봄철 냉방 수요 증가에 앞서 한전이 산업용 대형 고객 대상 수요 반응 프로그램 인센티브를 역대 최고 수준으로 책정했습니다. 참여 기업은 피크 감축 1kW당 최대 5만 원을 받을 수 있습니다.',
      topics: ['운영 최적화', '전력 인프라'],
      url: 'https://www.energytimes.kr/news/260414001',
    },
    {
      source: 'Canary Media', sourceId: 'canary-media', lang: 'en',
      title: '기후 피해 손실·피해 기금 운영 원칙 합의 — 총 5억 달러 1차 조성',
      titleOrig: 'Climate loss and damage fund agrees operating principles with initial $500M mobilized',
      summary: 'COP28에서 설립된 기후 손실·피해(Loss & Damage) 기금의 운영 원칙이 최종 합의됐습니다. 1차 조성액은 5억 달러로, 태평양 도서 국가와 최빈국 기후 적응 프로젝트 지원에 우선 사용됩니다.',
      topics: ['ESG·탄소중립', '정책·규제'],
      url: 'https://www.canarymedia.com/climate/loss-damage-fund-2026',
    },
    {
      source: 'BloombergNEF', sourceId: 'bnef', lang: 'en',
      title: '전기화 가속 — 2026년 글로벌 전력 소비 역대 최대 전망',
      titleOrig: 'Electrification surge: 2026 global electricity demand set for record high',
      summary: '블룸버그NEF는 데이터센터·전기차·히트펌프 수요 급증으로 2026년 글로벌 전력 소비가 역대 최대치를 기록할 것으로 전망했습니다. 재생에너지 발전 비중도 처음으로 40%를 돌파할 것으로 예측됩니다.',
      topics: ['시장·가격 동향', '운영 최적화'],
      url: 'https://about.bnef.com/research/2026/global-electricity-demand',
    },
  ],
}

// ──────────────────────────────────────────
// 기사 객체 생성 (UUID, 타임스탬프 부여)
// ──────────────────────────────────────────
function buildArticle(raw, date, orderIdx) {
  const hour = String(orderIdx + 1).padStart(2, '0')
  const min  = String((orderIdx * 13) % 60).padStart(2, '0')
  return {
    id:            crypto.randomUUID(),
    source:        raw.source,
    sourceId:      raw.sourceId,
    originalLang:  raw.lang,
    isTranslated:  raw.lang !== 'ko',
    title:         raw.title,
    titleOriginal: raw.titleOrig ?? null,
    summary:       raw.summary,
    topics:        raw.topics,
    publishedAt:   new Date(`${date}T${hour}:${min}:00.000Z`).toISOString(),
    originalUrl:   raw.url,
    collectedAt:   new Date(`${date}T08:30:00.000Z`).toISOString(),
  }
}

// ──────────────────────────────────────────
// 1) 날짜별 JSON 파일 생성
// ──────────────────────────────────────────
const allArticles = []

for (const [date, rawList] of Object.entries(ARTICLES_BY_DATE)) {
  const articles = rawList.map((raw, i) => buildArticle(raw, date, i))
  const dailyData = {
    date,
    generatedAt:  new Date(`${date}T08:30:00.000Z`).toISOString(),
    articleCount: articles.length,
    articles,
  }
  fs.writeFileSync(
    path.join(DATA_DAILY, `${date}.json`),
    JSON.stringify(dailyData, null, 2)
  )
  console.log(`[DAILY] Saved ${articles.length} articles → ${date}.json`)
  allArticles.push(...articles.map(a => ({ date, ...a })))
}

// ──────────────────────────────────────────
// 2) 중복 URL 검증
// ──────────────────────────────────────────
const urlSet = new Set()
const dupes  = []
for (const a of allArticles) {
  if (urlSet.has(a.originalUrl)) dupes.push(a.originalUrl)
  else urlSet.add(a.originalUrl)
}
if (dupes.length > 0) {
  console.warn(`\n[WARN] 중복 URL ${dupes.length}건:`)
  dupes.forEach(u => console.warn('  ', u))
} else {
  console.log(`\n[OK] 중복 URL 없음 — 전체 ${allArticles.length}건 고유`)
}

// ──────────────────────────────────────────
// 3) CSV 추출
// ──────────────────────────────────────────
function escCsv(val) {
  if (val == null) return ''
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

const HEADERS = [
  '수집일자', '기사ID',
  '출처', '소스ID', '원문언어', '번역여부',
  '제목(KO)', '제목(원문)',
  '요약',
  '토픽1', '토픽2', '토픽3',
  '발행일시', '원문URL', '수집일시',
]

const rows = [HEADERS.join(',')]
for (const a of allArticles) {
  const t = a.topics || []
  rows.push([
    a.date, a.id,
    a.source, a.sourceId, a.originalLang, a.isTranslated ? 'Y' : 'N',
    escCsv(a.title), escCsv(a.titleOriginal),
    escCsv(a.summary),
    escCsv(t[0] ?? ''), escCsv(t[1] ?? ''), escCsv(t[2] ?? ''),
    a.publishedAt, a.originalUrl, a.collectedAt,
  ].join(','))
}

const csvPath = path.join(EXPORT_DIR, '2026-04-W1W2-articles.csv')
fs.writeFileSync(csvPath, '﻿' + rows.join('\n'), 'utf-8')

console.log(`[CSV] Total ${allArticles.length} articles → ${csvPath}`)
console.log('[DONE]')
