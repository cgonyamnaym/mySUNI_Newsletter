---
name: wanted-design
description: Use this skill to generate well-branded interfaces and assets for Wanted (the Korean career platform), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc),
copy assets out and create static HTML files for the user to view. If
working on production code, you can copy assets and read the rules here
to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what
they want to build or design, ask some questions, and act as an expert
designer who outputs HTML artifacts _or_ production code, depending on
the need.

## Quick reference

- **Tokens:** `colors_and_type.css` — import this for instant access to
  `--bg-*`, `--fg-*`, `--c-blue-500` (= `#0066FF`, Wanted's signature
  cobalt), `--radius-*`, `--shadow-*`, and the `.ds-*` type classes.
- **Assets:** `assets/logos/` (Wanted mark + wordmarks), `assets/icons/`
  (~90 SVGs on a 24px grid). Icons are single-color — recolor with CSS
  `mask-image` or set `fill="currentColor"`.
- **UI kits:** `ui_kits/wanted-mobile/` — primitives + composed screens
  for the mobile app; use as reference implementations of the visual
  system.

## The aesthetic in four rules

1. **One blue.** `#0066FF` for actions, links, and selection. Nothing
   else accent-colored unless it's status (red/green/teal/violet, used
   sparingly).
2. **Paper over color.** Flat white canvas, gray `#F7F7F8` for subtle
   sections, hairline `rgba(112,115,124,.16)` borders. No textures, no
   noise.
3. **Generous rounding.** Cards 16px, modals 24–32px, section frames
   64px. Pills + avatars always full-radius.
4. **Korean type, tight display.** Pretendard Variable at 500/700.
   Display headings at 36–72px with -2.3% to -2.7% tracking. Body at
   15–16px with slight positive tracking.

## What to avoid

- Emoji in UI (Wanted never uses them).
- ALL-CAPS labels longer than a short badge.
- Invented icons — always copy an SVG from `assets/icons/` or substitute
  a closely-matching open-source icon and note the substitution.
- Gradient backgrounds except the one specific promotional-CTA recipe
  (`linear-gradient(#0066FF → #005EEB)`).
- B&W photography. Product imagery is warm daylight, natural color.
