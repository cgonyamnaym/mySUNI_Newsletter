// WantedComponents.jsx — primitive Wanted mobile components
// Uses tokens from /colors_and_type.css (via vars) + assets/icons/*.svg

const W = {
  blue: '#0066FF',
  blueHover: '#005EEB',
  blue50: '#EAF2FE',
  black: '#000',
  fg: '#171719',
  fgNeutral: 'rgba(46,47,51,0.88)',
  fgAlt: 'rgba(55,56,60,0.61)',
  fgAssist: 'rgba(55,56,60,0.28)',
  line: 'rgba(112,115,124,0.16)',
  line2: 'rgba(112,115,124,0.22)',
  gray50: '#F7F7F8',
  gray100: '#F4F4F5',
  gray200: '#DBDCDF',
  red: '#FF4242',
  violet: '#9747FF',
  green: '#00BF40',
  font: '"Pretendard Variable", -apple-system, system-ui, sans-serif',
};

// ───────── ICON ─────────
function Icon({ name, size = 24, color }) {
  // uses assets/icons/{name}.svg as mask-image so color follows `color`
  const url = `../../assets/icons/${name}.svg`;
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      background: color || 'currentColor',
      WebkitMask: `url("${url}") center/contain no-repeat`,
      mask: `url("${url}") center/contain no-repeat`,
      flexShrink: 0,
    }} />
  );
}

// ───────── BUTTON ─────────
function WButton({ children, variant = 'primary', size = 'md', onClick, style, full }) {
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 14, radius: 10 },
    md: { padding: '12px 20px', fontSize: 16, radius: 12 },
    lg: { padding: '15px 24px', fontSize: 17, radius: 14 },
  }[size];
  const variants = {
    primary:   { background: W.blue, color: '#fff' },
    secondary: { background: W.gray100, color: W.fg },
    outline:   { background: 'transparent', color: W.fg, border: `1px solid ${W.line2}` },
    ghost:     { background: 'transparent', color: W.fg },
    danger:    { background: W.red, color: '#fff' },
  }[variant];
  return (
    <button onClick={onClick} style={{
      fontFamily: W.font, fontWeight: 700, letterSpacing: '.006em',
      border: 0, cursor: 'pointer',
      padding: sizes.padding, fontSize: sizes.fontSize, borderRadius: sizes.radius,
      width: full ? '100%' : undefined,
      ...variants, ...style,
    }}>{children}</button>
  );
}

// ───────── CHIP ─────────
function WChip({ children, selected, onClick, tone }) {
  const base = {
    fontFamily: W.font, fontWeight: 700, fontSize: 13, letterSpacing: '.019em',
    padding: '8px 12px', borderRadius: 9999, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
    border: `1px solid ${W.line2}`, background: '#fff', color: W.fg,
    userSelect: 'none',
  };
  const on = selected ? { background: W.black, color: '#fff', borderColor: W.black } : {};
  const toned = tone === 'primary' ? { background: W.blue50, color: '#005EEB', borderColor: 'transparent' } : {};
  return <span onClick={onClick} style={{ ...base, ...toned, ...on }}>{children}</span>;
}

// ───────── BADGE ─────────
function WBadge({ children, tone = 'new' }) {
  const map = {
    new:     { bg: W.red, fg: '#fff' },
    beta:    { bg: W.violet, fg: '#fff' },
    success: { bg: '#E6F8EC', fg: '#00923A' },
    info:    { bg: '#E0F3F7', fg: '#006B80' },
    muted:   { bg: W.gray100, fg: W.fg },
  }[tone];
  return <span style={{
    fontFamily: W.font, fontWeight: 700, fontSize: 11, letterSpacing: '.031em',
    padding: '4px 8px', borderRadius: 6,
    background: map.bg, color: map.fg, textTransform: 'uppercase',
    display: 'inline-block',
  }}>{children}</span>;
}

// ───────── INPUT ─────────
function WInput({ label, value, onChange, placeholder, error, helper, icon, type = 'text' }) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? W.red : focus ? W.blue : W.line2;
  const ring = error ? 'rgba(255,66,66,.12)' : focus ? 'rgba(0,102,255,.12)' : 'transparent';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: W.font }}>
      {label && <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.019em', color: W.black }}>{label}</span>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        border: `1px solid ${borderColor}`, background: '#fff',
        padding: '13px 14px', borderRadius: 12,
        boxShadow: `0 0 0 3px ${ring}`, transition: 'all .15s',
      }}>
        {icon && <Icon name={icon} size={20} color={W.fgAlt} />}
        <input
          value={value} onChange={e => onChange && onChange(e.target.value)}
          placeholder={placeholder} type={type}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            border: 0, outline: 0, background: 'transparent', flex: 1,
            fontFamily: W.font, fontWeight: 500, fontSize: 16,
            letterSpacing: '.006em', color: W.fg, minWidth: 0,
          }} />
      </div>
      {(helper || error) && (
        <span style={{
          fontWeight: 500, fontSize: 12, letterSpacing: '.025em',
          color: error ? W.red : W.fgAlt,
        }}>{error || helper}</span>
      )}
    </label>
  );
}

// ───────── AVATAR / COMPANY LOGO ─────────
function WCompanyLogo({ letter, color = W.black, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: W.font, fontWeight: 700, fontSize: size * 0.42,
      flexShrink: 0, letterSpacing: '-.01em',
    }}>{letter}</div>
  );
}

// ───────── JOB CARD ─────────
function JobCard({ job, onTap }) {
  return (
    <div onClick={onTap} style={{
      background: '#fff', borderRadius: 16, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
      border: `1px solid ${W.line}`, cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <WCompanyLogo letter={job.company[0]} color={job.companyColor || W.black} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 15, color: W.black }}>
            {job.company}
          </div>
          <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 12, color: W.fgAlt, letterSpacing: '.025em' }}>
            {job.location}
          </div>
        </div>
        <Icon name={job.bookmarked ? 'bookmark-fill' : 'bookmark'} size={20}
              color={job.bookmarked ? W.black : W.fgAssist} />
      </div>
      <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 17,
        lineHeight: 1.35, color: W.black, letterSpacing: '-.01em' }}>
        {job.title}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {job.tags.map(t => (
          <span key={t} style={{
            fontFamily: W.font, fontWeight: 700, fontSize: 11,
            letterSpacing: '.031em', padding: '4px 8px',
            background: W.gray100, borderRadius: 6, color: '#37383C',
          }}>{t}</span>
        ))}
      </div>
      {job.reward && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: W.font, fontWeight: 700, fontSize: 13,
          color: W.blue, letterSpacing: '.019em' }}>
          <Icon name="coins" size={16} color={W.blue} />
          합격보상금 {job.reward}
        </div>
      )}
    </div>
  );
}

// ───────── TAB BAR ─────────
function WTabBar({ active, onChange }) {
  const tabs = [
    { key: 'home', label: '홈', icon: 'compass' },
    { key: 'pos',  label: '포지션', icon: 'business-bag' },
    { key: 'match', label: '매칭', icon: 'sparkle' },
    { key: 'chat', label: '채팅', icon: 'bubble' },
    { key: 'my',   label: 'MY', icon: 'company' },
  ];
  return (
    <div style={{
      display: 'flex', background: '#fff',
      borderTop: `1px solid ${W.line}`,
      paddingBottom: 18,
    }}>
      {tabs.map(t => {
        const on = active === t.key;
        return (
          <div key={t.key} onClick={() => onChange(t.key)}
            style={{ flex: 1, padding: '10px 0 4px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
              <Icon name={t.icon} size={24} color={on ? W.black : W.fgAssist} />
            </div>
            <div style={{ fontFamily: W.font, fontWeight: 700, fontSize: 10,
              letterSpacing: '.025em', color: on ? W.black : W.fgAlt }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ───────── APP BAR ─────────
function WAppBar({ title, left, right, subTitle }) {
  return (
    <div style={{
      background: '#fff', padding: '14px 20px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      borderBottom: `1px solid ${W.line}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {left}
        <div style={{ flex: 1, fontFamily: W.font, fontWeight: 700, fontSize: 20,
          letterSpacing: '-.01em', color: W.black }}>{title}</div>
        {right}
      </div>
      {subTitle && (
        <div style={{ fontFamily: W.font, fontWeight: 500, fontSize: 13,
          color: W.fgAlt, letterSpacing: '.019em' }}>{subTitle}</div>
      )}
    </div>
  );
}

// ───────── SEARCH BAR ─────────
function WSearchBar({ value, onChange, placeholder = '검색어를 입력하세요', onSubmit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: W.gray100, borderRadius: 12, padding: '11px 14px',
    }}>
      <Icon name="compass" size={18} color={W.fgAlt} />
      <input value={value} onChange={e => onChange && onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit && onSubmit()}
        placeholder={placeholder}
        style={{ border: 0, outline: 0, background: 'transparent', flex: 1,
          fontFamily: W.font, fontWeight: 500, fontSize: 15,
          letterSpacing: '.01em', color: W.fg, minWidth: 0 }} />
    </div>
  );
}

Object.assign(window, {
  W, Icon, WButton, WChip, WBadge, WInput, WCompanyLogo,
  JobCard, WTabBar, WAppBar, WSearchBar,
});
