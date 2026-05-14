# Wanted Mobile UI Kit

A click-through recreation of Wanted's Korean career-platform mobile app
(main flow: Home → Job detail → Apply → Success), built from the Figma
design system.

## Files
- `index.html` — boot file; wraps screens in an iOS frame and wires up
  click-through navigation.
- `ios-frame.jsx` — stock iOS 26 device bezel.
- `WantedComponents.jsx` — primitive brand components: `Icon`, `WButton`,
  `WChip`, `WBadge`, `WInput`, `WCompanyLogo`, `JobCard`, `WTabBar`,
  `WAppBar`, `WSearchBar`.
- `WantedScreens.jsx` — composed screens: `HomeScreen`, `DetailScreen`,
  `ApplyScreen`, `SuccessScreen`, `MatchScreen`.

## Interactions
- Tap a job card on Home → Detail screen
- Tap **지원하기** on Detail → Apply form
- Tap **지원 완료** on Apply → Success screen
- Tap **홈으로** on Success → back to Home
- The bottom tab bar: the **매칭** tab switches the root view to an
  AI matching screen; other tabs reset to Home (stubbed).

## Visual rules applied (from root README)
- Primary action: Cobalt `#0066FF`; hover `#005EEB`.
- Cards: white, 16px radius, 1px hairline border (`rgba(112,115,124,.16)`),
  no shadow.
- Icons: referenced from `assets/icons/*.svg` via CSS mask so they recolor
  cleanly with `currentColor` / the token color.
- Typography: Pretendard Variable, 700 for labels and titles, 500 for
  body, with Wanted's letter-spacing ladder.
- Korean-first copy, polite form.
