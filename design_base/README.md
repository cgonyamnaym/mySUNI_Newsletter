# Wanted Design System

Recreation of the **Wanted Design System (Community)** by Wanted Lab (원티드랩) — a
public, CC BY 4.0 design library from Korea covering the Wanted career platform,
Wanted Space, Wanted Gigs, Wanted OneID, and related products.

## Source
- **Figma file (community):** "Wanted Design System (Community)" — 26 pages, 37
  top-level frames, spanning Overview, Theme, Color (Atomic + Semantic),
  Typography, Spacing, Icon, Logo, Components, and Guidelines.
- **Attribution:** Wanted Lab Design team — Hyungjin Kil, Chaeri Oh, Doeun Kim,
  Sanghyo Yee, Kyungmin Park, Sungho Cho, Jisoo Lee (design); support from
  Shinhae Lee, Minjeong Kang, Seulgee Kim, Minju Park, Minsun Park, Miri Son,
  Hyunji Jeon. 2025. Distributed under CC BY 4.0.
- **Note:** The reader does not need access to the Figma to use this folder;
  all necessary tokens, assets, and components are captured here.

## Products represented
Wanted Lab is a Korean career/recruiting platform. The system covers:
- **Wanted** — flagship career/recruitment site + mobile app (원티드)
- **Wanted Space** — co-working / office-space service
- **Wanted Gigs** — freelance / gigs marketplace
- **Wanted OneID** — single sign-on
- **Wanted Agent / AI Review** — AI hiring tools
- **LaaS** — lab-as-a-service / developer offering
- **Kakao T** (referenced in the T-Wanted page as a mobile-app example for
  recreating a service-hub style screen)

Language is primarily **Korean** (with English and Japanese as co-primary in
brand typography). Designs lean toward the Korean market aesthetic — clean,
neutral, legible, dense but airy.

---

## Index (what's in this folder)

```
README.md                ← you are here
SKILL.md                 ← portable agent skill description
colors_and_type.css      ← semantic + atomic tokens, type scale
assets/
  logos/                 ← Wanted marks (SVG + 1 PNG master)
  icons/                 ← ~90 curated 24px line/fill icons (SVG)
preview/                 ← design-system preview cards (.html)
ui_kits/
  wanted-mobile/         ← mobile product UI kit + click-thru prototype
```

No slide template was provided in the Figma, so `slides/` is omitted.

---

## Content fundamentals

**Language:** Primary Korean (한국어), with English and Japanese fully supported
by the type system (Pretendard JP). Product copy mixes Korean sentences with
English product names (e.g. "Wanted OneID", "AI Review", "LaaS").

**Tone:** Calm, direct, utility-first. Wanted speaks *with* the user, not
*at* them. Micro-copy is short, imperative-polite Korean (—해요/합니다 form)
and matter-of-fact.

- **System strings:** polite-formal (—합니다).
  > "원티드랩에서는 기본 글꼴로 한국어, 영어, 일본어를 지원하는 Pretendard JP를 사용합니다."
- **Product UI:** warmer, conversational-polite (—해요).
  > "어디로 갈까요?" ("Where are you headed?" — Kakao T hub sample)
  > "도착지를 입력하세요" ("Enter your destination")
- **Encouragement / empty states:** friendly, low-pressure.
  > "새로운 개선 의견은 언제나 환영합니다." ("We always welcome new suggestions.")
  > "궁금하신 사항이나 해결이 필요하다면 댓글로 자유롭게 의견을 남겨주세요."

**Casing & punctuation:** English product labels use PascalCase
("Wanted OneID", "AI Review"). No ALL-CAPS for long labels; short badges
like `NEW`, `BETA` are allowed in uppercase. Korean copy uses no terminal
punctuation on short labels.

**Pronouns:** Korean often drops the subject; when addressing the user, the
system omits "you" and relies on verb ending. English: first-person plural
("We believe that open source…"), second-person "you" sparingly.

**Emoji:** **Not used.** Status and affordances are expressed through icons,
color, and shape — never emoji. Unicode characters are also not used as
icons; the system has its own line/fill icon set.

**Numbers:** Korean-style thousand separators with "원" unit
("5,000원 할인"). Dates use YYYY. MM. DD. with trailing periods
("2025. 11. 6."). Time ranges use en-dash ("2월 13일(화) – 4월 15일(수)").

---

## Visual foundations

**Aesthetic in one line:** clean, neutral, paper-white, high-legibility
UI with a single punch of cobalt blue (#0066FF) and generous corner
rounding. Korean-first typographic system, zero decoration, zero noise.

**Color:**
- Neutral dominance: ~55% of fills are white (`rgb(255,255,255)`) and
  ~60% of text is pure black (`rgb(0,0,0)`), layered with a neutral
  gray ramp anchored on `#70737C` (the top non-mono color by usage).
- One brand accent: **Cobalt Blue `#0066FF`** for primary actions, links,
  and selection. A darker `#005EEB` for hover/pressed.
- Secondary accents used sparingly: **Violet `#9747FF` / `#6541F2`** (plans,
  premium), **Red `#FF4242`** (destructive, badges), **Green `#00BF40`**
  (success, growth), **Teal `#0098B2`** (info), **Yellow `#FFE812`** (only
  when standing in for Kakao).
- Semantic fg/bg use **alpha-tinted neutrals** rather than flat grays —
  e.g. body text is `rgba(46,47,51,0.88)`, placeholder is
  `rgba(55,56,60,0.28)`. Borders are `rgba(112,115,124,0.16)` (subtle)
  and `rgba(112,115,124,0.22)` (normal).

**Typography:** Pretendard JP at 4 weights (500/600/700; light Black/XBold
reserved for display). Type ladder is a **7-level** system with 18
sub-steps, expressed in px with Figma letter-spacing (see
`colors_and_type.css`). Bold headings use tight tracking (-2.3% to -2.7%),
body uses a slight positive (+0.6% to +1.5%). Line-height rides
1.33–1.50 depending on step. Display headings sit at 36/56/72.

**Backgrounds:** Mostly flat white or `#F7F7F8`. No textures. No full-bleed
imagery in the core library; hero imagery appears only inside cards or
thumbnails. Occasional **linear gradient** on promotional CTAs — e.g.
`linear-gradient(#0066FF → #005CEB)`. No hand-drawn illustrations; no
repeating patterns.

**Imagery:** Warm daylight photographs of people and workplaces, natural
color, no grain, no B&W treatment. Always masked to a rounded rectangle.

**Corner radii:** Rounding is central to the brand. Scale (see CSS):
4 / 8 / 12 / 16 / 24 / 32 / 64 / full. Cards default to **16px (mobile) /
24–32px (desktop)**; the biggest containers (section frames) go **64px**.
Pills and avatars use `full`.

**Cards:** White fill, `1px solid rgba(112,115,124,0.16)` border, 16–32px
radius, no shadow by default. Elevated/floating cards add
`0 12px 32px rgba(23,23,23,0.10)`. Shadows are always black-tinted with
alpha 0.06–0.12 — never colored.

**Borders:** Hairline (1px) alpha-tinted neutral. Dividers inside content
often use **pure black at 4px** as a heading bar (a Wanted signature),
and 2px black for sub-dividers.

**Transparency & blur:** Transparency used heavily for text (alpha ramp
on `rgb(46,47,51)` / `rgb(55,56,60)`). Backdrop blur appears in modal
scrims; otherwise surfaces are opaque.

**Hover / press states:**
- Hover: darken the primary fill by ~5–10% (`#0066FF` → `#005EEB`), or
  drop background to `rgba(112,115,124,0.05)` on neutral surfaces.
- Press: reduce opacity to ~0.9 and apply `transform: scale(0.98)`
  (common in mobile cards).
- Disabled: `opacity: 0.4` with pointer-events off.

**Animation:** Subtle and short. Suggested defaults: 150–200ms with
`cubic-bezier(0.4, 0, 0.2, 1)` for most UI transitions, 300ms for
modal/drawer. No bounces. No parallax. Fades and simple translates only.

**Layout:** Fixed-width content canvases (1280px max for desktop docs,
390px for mobile mocks). Heavy use of 32/48/64/96/128px vertical
rhythm inside documentation. Components use an 8/16/24px gutter.

**Iconography system:** See ICONOGRAPHY below.

---

## Iconography

**Approach:** **Custom SVG icon set**, all 24×24 on a unified optical
grid. Two classes (by file name):
- `Name*` — outline (1.5px stroke equivalent, drawn as filled path on a
  currentColor surface).
- `*FillFillTrue` — solid-fill variant of the same glyph.

**Variants present in the Figma (caret-safe summary):**
- A **Thick** modifier for heavier stroke.
- A **Small** modifier (16×16 optical size).
- **Tight** chevrons that trim padding for tight UI.
- Logo family for third-party brands (Apple, Google, Kakao, Naver Blog,
  LinkedIn, Instagram, Youtube, Facebook, Microsoft, X, Brunch).
- A navigation set (`NameNavigation{Recruit,Career,Social,Mypage,Menu}`)
  used by the Wanted main tab bar.

**What we copied (into `assets/icons/`):** ~90 of the highest-signal
glyphs covering navigation, system status (check/close/info/exclamation),
content (bookmark, bubble, camera, document, image), commerce (coins,
tag, crown), time (clock, calendar, history, hourglass), action (write,
share, download, upload, trash, refresh, reset, copy, link, attach), AI
(sparkle, magic-wand, bulb, agent-like), and arrows/chevrons.

**Emoji:** Never.
**Unicode icons:** Never.
**Icon font?** No — pure SVG.
**Delivery:** Reference directly from `assets/icons/*.svg` and color via
`currentColor` / CSS `filter` where the SVG paths use `fill="currentColor"`
(some exports have fixed black fills — override with CSS mask-image for
tint control, or fetch + inline).

---

## Fonts

The Figma uses **Pretendard JP** (500/600/700/Bold/ExtraBold). The JP
TTFs are commercial; we ship the open-source sibling **Pretendard** by
the same designer (OFL) as 9 static OTF weights in `fonts/`, wired up
via `@font-face` in `colors_and_type.css`. Both share the same metrics
and Korean optical design — visual fidelity is effectively identical
for Korean + Latin — but JP has purpose-tuned kana. If you need exact
JP rendering, please supply the licensed `Pretendard JP` TTFs and drop
them in `fonts/`; the CSS already falls back in that order.

Weights available locally (weight · file):
- 100 Thin · `Pretendard-Thin.otf`
- 200 ExtraLight · `Pretendard-ExtraLight.otf`
- 300 Light · `Pretendard-Light.otf`
- 400 Regular · `Pretendard-Regular.otf`
- 500 Medium · `Pretendard-Medium.otf`
- 600 SemiBold · `Pretendard-SemiBold.otf`
- 700 Bold · `Pretendard-Bold.otf`
- 800 ExtraBold · `Pretendard-ExtraBold.otf`
- 900 Black · `Pretendard-Black.otf`

Secondary display font: **Wanted Sans** (used for Wanted wordmarks and
72px hero displays). We do not ship it; where Wanted Sans is called, the
CSS falls back to Pretendard (which reads close to it).

**🚩 Substitutions flagged:**
1. `Pretendard JP` → `Pretendard` (static OTFs, shipped in `fonts/`).
   Please supply licensed Pretendard JP TTFs for perfect kana fidelity.
2. `Wanted Sans` → `Pretendard`. Please supply if you have it.

---

## Quick start

```html
<link rel="stylesheet" href="colors_and_type.css" />

<h1>원티드 디자인 시스템</h1>
<p class="ds-body-lg">안녕하세요.</p>

<button style="
  background: var(--bg-primary); color: var(--fg-on-primary);
  border: 0; padding: 12px 20px; border-radius: var(--radius-md);
  font: 700 16px/1 var(--font-sans); letter-spacing: 0.006em;
">지원하기</button>
```
