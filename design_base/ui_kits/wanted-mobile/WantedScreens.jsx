// WantedScreens.jsx — composed mobile screens for the UI kit click-through

function HomeScreen({ go }) {
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('전체');
  const filters = ['전체', '개발', '디자인', '기획', '마케팅', '경영'];
  const featured = [
    { id: 1, company: '원티드랩', companyColor: '#0066FF', location: '서울 · 강남구',
      title: '프로덕트 디자이너 (Senior)', tags: ['정규직', '경력 5년+', '재택 가능'],
      reward: '500만원', bookmarked: true },
    { id: 2, company: '카카오', companyColor: '#FFE812', location: '경기 · 성남시',
      title: 'iOS 개발자 - 모빌리티', tags: ['정규직', '경력 3년+'], reward: '700만원' },
    { id: 3, company: '토스', companyColor: '#0066FF', location: '서울 · 강남구',
      title: '백엔드 엔지니어 - 결제 플랫폼', tags: ['정규직', '경력 무관'], reward: '1,000만원' },
    { id: 4, company: '네이버', companyColor: '#03C75A', location: '경기 · 성남시',
      title: '프론트엔드 엔지니어', tags: ['정규직', '경력 2년+'] },
  ];
  return (
    <div style={{ background: '#F7F7F8', minHeight: '100%' }}>
      <WAppBar title="Wanted"
        right={<div style={{ display: 'flex', gap: 10 }}>
          <Icon name="compass" size={24} color="#171719" />
          <Icon name="bell" size={24} color="#171719" />
        </div>} />
      <div style={{ padding: '16px 20px 0' }}>
        <WSearchBar value={q} onChange={setQ} placeholder="회사, 포지션, 기술" />
      </div>

      {/* filter chips */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 20px 0',
        overflowX: 'auto', scrollbarWidth: 'none' }}>
        {filters.map(f => (
          <WChip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f}
          </WChip>
        ))}
      </div>

      {/* weekly pick hero */}
      <div style={{ margin: '20px', borderRadius: 20, overflow: 'hidden',
        background: 'linear-gradient(135deg, #0066FF 0%, #005EEB 100%)',
        padding: '22px 20px', color: '#fff', display: 'flex',
        flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 11,
          letterSpacing: '.031em', opacity: .85, textTransform: 'uppercase' }}>
          Weekly Pick · 11월 2주차
        </div>
        <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 22,
          letterSpacing: '-.02em', lineHeight: 1.3 }}>
          이번 주, 에디터가<br/>고른 포지션
        </div>
        <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 13,
          letterSpacing: '.019em', opacity: .85, marginTop: 4 }}>
          채용 담당자 추천 · 빠른 합격 기회
        </div>
      </div>

      {/* section */}
      <div style={{ padding: '0 20px 8px', display: 'flex',
        alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 20,
          letterSpacing: '-.01em', color: '#000' }}>AI 추천 포지션</div>
        <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 13,
          letterSpacing: '.019em', color: W.fgAlt }}>전체 보기</div>
      </div>

      {/* cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10,
        padding: '0 20px 24px' }}>
        {featured.map(j => <JobCard key={j.id} job={j} onTap={() => go('detail', j)} />)}
      </div>
    </div>
  );
}

function DetailScreen({ job, back }) {
  if (!job) return null;
  return (
    <div style={{ background: '#fff', minHeight: '100%' }}>
      <WAppBar
        title=""
        left={<Icon name="close" size={24} color="#000" onClick={back} />}
        right={<div style={{ display: 'flex', gap: 14 }}>
          <Icon name="share" size={22} color="#171719" />
          <Icon name="bookmark" size={22} color="#171719" />
        </div>} />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <WCompanyLogo letter={job.company[0]} color={job.companyColor} size={56} />
          <div>
            <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 15, color: '#000' }}>
              {job.company}
            </div>
            <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 13,
              color: W.fgAlt, letterSpacing: '.019em' }}>{job.location}</div>
          </div>
        </div>
        <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 24,
          lineHeight: 1.3, letterSpacing: '-.023em', color: '#000', marginBottom: 16 }}>
          {job.title}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
          {job.tags.map(t => (
            <span key={t} style={{
              fontFamily: W.font, fontWeight: 700, fontSize: 12,
              letterSpacing: '.025em', padding: '6px 10px',
              background: W.gray100, borderRadius: 8, color: '#37383C',
            }}>{t}</span>
          ))}
        </div>
        {job.reward && (
          <div style={{
            background: W.blue50, borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
          }}>
            <Icon name="coins" size={20} color={W.blue} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 14,
                color: '#005EEB' }}>합격보상금 {job.reward}</div>
              <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 12,
                color: W.fgAlt }}>지원자 {Math.floor(parseInt(job.reward) / 10)}만원 + 추천인 {Math.floor(parseInt(job.reward) / 10)}만원</div>
            </div>
          </div>
        )}
        <div style={{ height: 1, background: '#000', margin: '4px 0 20px' }} />
        <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 18,
          letterSpacing: '-.01em', color: '#000', marginBottom: 10 }}>
          주요 업무
        </div>
        <ul style={{ fontFamily: W.font, fontWeight: 500, fontSize: 15,
          lineHeight: 1.6, letterSpacing: '.01em', color: W.fgNeutral,
          margin: 0, paddingLeft: 20 }}>
          <li>서비스 전반의 UX/UI 디자인 및 개선</li>
          <li>유저 리서치 및 데이터 기반 설계 의사결정</li>
          <li>디자인 시스템 운영 및 확장</li>
          <li>프로덕트 팀과의 긴밀한 협업</li>
        </ul>
      </div>
      {/* sticky apply bar */}
      <div style={{
        position: 'sticky', bottom: 0, background: '#fff',
        borderTop: `1px solid ${W.line}`, padding: '12px 20px 28px',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12,
          border: `1px solid ${W.line2}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bookmark" size={22} color="#171719" />
        </div>
        <WButton full size="lg">지원하기</WButton>
      </div>
    </div>
  );
}

function ApplyScreen({ job, back, done }) {
  const [name, setName] = React.useState('김원티');
  const [email, setEmail] = React.useState('hello@wanted.co.kr');
  const [msg, setMsg] = React.useState('');
  return (
    <div style={{ background: '#fff', minHeight: '100%' }}>
      <WAppBar
        title="지원서 작성"
        left={<Icon name="close" size={24} color="#000" onClick={back} />} />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center',
          padding: 14, background: W.gray50, borderRadius: 12 }}>
          <WCompanyLogo letter={job?.company?.[0] || 'W'}
            color={job?.companyColor || W.black} size={40} />
          <div>
            <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 14 }}>{job?.company}</div>
            <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 12,
              color: W.fgAlt }}>{job?.title}</div>
          </div>
        </div>
        <WInput label="이름" value={name} onChange={setName} />
        <WInput label="이메일" value={email} onChange={setEmail}
          helper="합격 여부를 알려드릴 이메일입니다" />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: W.font, fontWeight: 700, fontSize: 13,
            letterSpacing: '.019em' }}>자기소개</span>
          <textarea value={msg} onChange={e => setMsg(e.target.value)}
            rows={6} placeholder="지원 동기와 강점을 자유롭게 적어주세요"
            style={{ fontFamily: W.font, fontWeight: 500, fontSize: 15,
              border: `1px solid ${W.line2}`, borderRadius: 12, padding: 14,
              resize: 'none', outline: 'none', lineHeight: 1.5 }} />
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center',
          padding: 14, background: W.blue50, borderRadius: 12 }}>
          <Icon name="sparkle" size={20} color={W.blue} />
          <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 13,
            color: '#005EEB', letterSpacing: '.019em' }}>
            AI가 자기소개서 개선을 도와드려요
          </div>
        </div>
        <WButton full size="lg" onClick={done}>지원 완료</WButton>
      </div>
    </div>
  );
}

function SuccessScreen({ back }) {
  return (
    <div style={{ background: '#fff', minHeight: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 40, textAlign: 'center', gap: 16 }}>
      <div style={{ width: 80, height: 80, borderRadius: 9999,
        background: W.blue, display: 'flex', alignItems: 'center',
        justifyContent: 'center' }}>
        <Icon name="circle-check-fill" size={48} color="#fff" />
      </div>
      <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 24,
        letterSpacing: '-.023em', color: '#000' }}>지원이 완료되었어요</div>
      <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 15,
        letterSpacing: '.01em', color: W.fgNeutral, lineHeight: 1.5, maxWidth: 280 }}>
        합격 여부는 영업일 기준 7일 이내에<br/>이메일로 알려드려요.
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 10, width: '100%' }}>
        <WButton variant="secondary" full onClick={back}>홈으로</WButton>
        <WButton full onClick={back}>지원 현황 보기</WButton>
      </div>
    </div>
  );
}

function MatchScreen({ back }) {
  const people = [
    { name: '이민지', role: 'Product Designer · 7년차', match: 92 },
    { name: '박서준', role: 'iOS Developer · 5년차', match: 88 },
    { name: '최유나', role: 'PM · 4년차', match: 85 },
  ];
  return (
    <div style={{ background: '#F7F7F8', minHeight: '100%' }}>
      <WAppBar title="AI 매칭" subTitle="프로필을 기반으로 매칭된 인재들이에요" />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {people.map(p => (
          <div key={p.name} style={{
            background: '#fff', borderRadius: 16, padding: 16,
            display: 'flex', gap: 12, alignItems: 'center',
            border: `1px solid ${W.line}`,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 9999,
              background: W.gray200, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: W.font, fontWeight: 700,
              fontSize: 18, color: W.fg }}>{p.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 15,
                color: '#000' }}>{p.name}</div>
              <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 12,
                color: W.fgAlt, letterSpacing: '.025em' }}>{p.role}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 18,
                color: W.blue, letterSpacing: '-.01em' }}>{p.match}%</div>
              <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 11,
                color: W.fgAlt, letterSpacing: '.031em' }}>매칭률</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, DetailScreen, ApplyScreen, SuccessScreen, MatchScreen });
