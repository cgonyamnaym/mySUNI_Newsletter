const fs = require('fs');
const sources = require('./scripts/crawlers/sources.js');

let csv = '\uFEFFID,이름(Name),URL,언어(Language),타입(Type)\n';
sources.forEach(s => {
  csv += `"${s.id}","${s.name}","${s.url}","${s.lang}","${s.type}"\n`;
});

fs.writeFileSync('crawling_sources_current.csv', csv, 'utf8');
console.log('done');
