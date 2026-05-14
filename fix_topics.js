const fs = require('fs')
const path = require('path')

const DATA_DAILY = path.join(__dirname, 'data', 'daily')

const TOPICS = [
  { id: '전력 인프라', keywords: ['계통', '송배전', '스마트그리드', '전력망', '분산자원', 'vpp', '인프라', 'grid'] },
  { id: '에너지원', keywords: ['ess', '에너지저장', '원자력', '연료전지', '원전', 'smr', '태양광', '풍력', '수소', '바이오에너지', '재생에너지', '신재생', '그린수소', '데이터센터', '배터리', 'solar', 'wind'] },
  { id: '운영 최적화', keywords: ['derms', '수요 예측', '최적화', 'ai', '예측'] },
  { id: '정책·규제', keywords: ['정책', '법령', '규제', '제도', 'ppa', '정부', '산업부', '법안', 'ferc'] },
  { id: 'ESG·탄소중립', keywords: ['탄소중립', 're100', '탄소시장', 'esg', 'ndc', '탄소', '기후', 'carbon'] },
  { id: '시장·가격 동향', keywords: ['가격', '수급', '투자', 'smp', '요금', '도매가격', 'lcoe', '시장'] }
]

function assignTopics(title, summary) {
  const topics = new Set()
  const lowerText = `${title || ''} ${summary || ''}`.toLowerCase()
  
  for (const topic of TOPICS) {
    for (const kw of topic.keywords) {
      if (lowerText.includes(kw)) {
        topics.add(topic.id)
        break // Move to next topic to avoid duplicate pushes
      }
    }
  }
  
  const result = Array.from(topics).slice(0, 2)
  if (result.length === 0) result.push('시장·가격 동향')
  return result
}

const files = fs.readdirSync(DATA_DAILY).filter(f => f.endsWith('.json'))

for (const file of files) {
  const filepath = path.join(DATA_DAILY, file)
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
  let updated = false
  if (data.articles) {
    for (const article of data.articles) {
      if (!article.topics || article.topics.length === 0) {
        article.topics = assignTopics(article.title, article.summary)
        updated = true
      }
    }
  }
  if (updated) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8')
    console.log(`Updated topics in ${file}`)
  }
}
console.log('done')
