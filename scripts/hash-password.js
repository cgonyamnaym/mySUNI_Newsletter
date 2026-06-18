// 비밀번호 해시 생성 스크립트
// 사용법: node scripts/hash-password.js <비밀번호>
// 출력된 해시를 .env.local의 AUTH_USERS에 사용하세요

const bcrypt = require('bcryptjs')

const password = process.argv[2]
if (!password) {
  console.error('사용법: node scripts/hash-password.js <비밀번호>')
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 12)
console.log('\n생성된 해시:', hash)
console.log('\n.env.local에 추가할 내용:')
console.log(`AUTH_USERS=[{"email":"your@email.com","passwordHash":"${hash}"}]`)
console.log()
