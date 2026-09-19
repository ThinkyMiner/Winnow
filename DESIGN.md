---
# gstack: design-md-format=spec
name: Winnow
description: A calm, selective, slightly opinionated utility that sits quietly over the web; one blue bloom, white surfaces, and a decision word that dominates.
colors:
  primary: "#2563EB"          # Winnow Blue: primary actions, logo, active states, READ badge
  primary-hover: "#1D4ED8"    # button hover
  signal: "#3B82F6"           # Signal Blue: hover states, highlighted information
  soft: "#93C5FD"             # Soft Blue: supporting gradients, low-emphasis UI
  ice: "#EFF6FF"              # panels, subtle backgrounds, SAVE-adjacent surfaces
  on-primary: "#FFFFFF"
  surface: "#FFFFFF"
  paper: "#FEFEFE"           # marketing site page colour
  surface-soft: "#F8FAFC"
  text: "#0F172A"             # Ink
  text-secondary: "#475569"   # Slate
  text-muted: "#94A3B8"       # Muted: metadata, captions
  border: "#E2E8F0"
  accent: "#2563EB"           # same hue as primary; there is no second accent
  badge-read-bg: "#2563EB"
  badge-read-fg: "#FFFFFF"
  badge-skim-bg: "#DBEAFE"
  badge-skim-fg: "#1D4ED8"
  badge-save-bg: "#F1F5F9"
  badge-save-fg: "#334155"
  badge-skip-bg: "#E2E8F0"
  badge-skip-fg: "#475569"
  success: "#2563EB"          # no green: a positive outcome is READ, shown in Winnow Blue
  warning: "#475569"          # neutral warning treatment; junk is a quiet skip, not an alarm
  error: "#0F172A"            # ink on subtle gray; red is reserved for a genuine safety issue
  dark-surface: "#0F172A"
  dark-surface-soft: "#111827"
  dark-text: "#F8FAFC"
  dark-text-secondary: "#CBD5E1"
  dark-border: "#1E293B"
typography:
  display:
    fontFamily: Inter
    fontWeight: 700
    fontSize: clamp(3.5rem, 6vw, 4.5rem)
    lineHeight: 1.0
    letterSpacing: -0.02em
  poster:
    fontFamily: Cabinet Grotesk
    fontWeight: 700
    fontSize: clamp(4rem, 10.4vw, 9.375rem)
    lineHeight: 0.95
    letterSpacing: -0.035em
  poster-h2:
    fontFamily: Cabinet Grotesk
    fontWeight: 500
    fontSize: clamp(2.5rem, 4.4vw, 4rem)
    lineHeight: 1.0
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontWeight: 700
    fontSize: clamp(2.5rem, 4vw, 3rem)
    lineHeight: 1.05
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontWeight: 650
    fontSize: clamp(1.75rem, 2.5vw, 2rem)
    lineHeight: 1.15
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontWeight: 600
    fontSize: clamp(1.25rem, 1.8vw, 1.5rem)
    lineHeight: 1.25
  body:
    fontFamily: Inter
    fontWeight: 400
    fontSize: 1rem
    lineHeight: 1.55
  small:
    fontFamily: Inter
    fontWeight: 400
    fontSize: 0.875rem
    lineHeight: 1.45
  label:
    fontFamily: Inter
    fontWeight: 500
    fontSize: 0.75rem
    lineHeight: 1.3
    letterSpacing: 0.08em
  decision:
    fontFamily: Inter
    fontWeight: 600
    fontSize: 0.75rem
    letterSpacing: 0.04em
  mono:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    lineHeight: 1.6
    fontFeature: tnum
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  panel: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "10px"
    height: 44px
    paddingInline: 18px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    transform: translateY(-1px)
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    rounded: "10px"
  input:
    borderColor: "{colors.border}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    focusRing: 2px solid {colors.primary}
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "18px"
    padding: 16px 20px
    maxWidth: 360px
    shadow: 0 8px 30px rgba(15, 23, 42, 0.08)
  card-hover:
    shadow: 0 14px 40px rgba(15, 23, 42, 0.11)
    transform: translateY(-3px)
    borderColor: "{colors.soft}"
  badge:
    rounded: "{rounded.full}"
    fontFamily: Inter
    fontWeight: 600
    fontSize: 0.75rem
    paddingInline: 8px
    height: 1.2em
  badge-read:
    backgroundColor: "{colors.badge-read-bg}"
    textColor: "{colors.badge-read-fg}"
  badge-skim:
    backgroundColor: "{colors.badge-skim-bg}"
    textColor: "{colors.badge-skim-fg}"
  badge-save:
    backgroundColor: "{colors.badge-save-bg}"
    textColor: "{colors.badge-save-fg}"
  badge-skip:
    backgroundColor: "{colors.badge-skip-bg}"
    textColor: "{colors.badge-skip-fg}"
  nav:
    height: 68px
    backgroundColor: rgba(255, 255, 255, 0.82)
    backdropFilter: blur(14px)
    borderBottom: 1px solid rgba(226, 232, 240, 0.7)
  nav-link:
    textColor: "{colors.text}"
  focus-ring:
    outline: 2px solid {colors.primary}
    outlineOffset: 2px
  bloom:
    background: radial-gradient(circle at 28% 45%, #2563EB 0%, #3B82F6 24%, #93C5FD 48%, #EFF6FF 70%, #FFFFFF 100%)
    grainOpacity: 0.03
    surfaces: extension onboarding and social assets only; retired on the marketing site
  plate:
    rounded: 0
    cornerMark: 12px L-shapes, 1px currentColor at 60%
    inset: 24px
  figure:
    rounded: 0
    borderColor: currentColor at 25%
    tag: JetBrains Mono 11px, inverted box
    caption: JetBrains Mono 12px, left title, right fact
  field-soft:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.text}"
  field-blue:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  field-ink:
    backgroundColor: "{colors.text}"
    textColor: "{colors.paper}"
---

# Winnow

## Overview

**Creative North Star:** "It told me whether to open it before I wasted time." Every surface leads with the decision word. If an element does not help the user decide faster, it goes.

**Product context:** Winnow is an open-source Chrome extension that judges whether an article or video is worth a reader's time before they open it: READ, SKIM, SAVE, or SKIP, with a confidence. It runs as a small card on pages and as inline pills on feeds such as Hacker News and YouTube. Users are people who read a lot on the web and resent wasted clicks. Peers are reader tools and browser utilities, not AI assistants. Project type: browser extension UI plus a single marketing page.

**Mode per surface:**
- Persuade: the landing page at `site/`. Editorial register (see Marketing site below): poster headlines, drenched colour fields, squared plates and figures. One message, one visual, one action per viewport still holds.
- Operate: the extension card, feed badges, onboarding, and options. Small judgment surfaces, never a dashboard.
- Read: documentation in `docs/`. Plain Markdown, no styling system needed.
- Experience: none. Winnow is a utility and must feel calmer than the page beneath it.

**Reference sites:** none researched. The system was authored in `docs/brand/DESIGN.md` and formalized here; the landing page spec is `docs/brand/LANDING_PAGE.md`.

**Key characteristics:**
- A decision word in caps and a percentage, before any explanation.
- One blue, one bloom, otherwise white and ink.
- Inter everywhere, so it reads as part of the browser rather than a brand shouting over it.
- Rounded capsules and soft pills; no sharp geometry, no illustration.
- Quiet: no red, no sparkles, no "AI is thinking" theatre.

## Colors

**Strategy:** Committed. Winnow Blue owns the page. Neutrals are slate-derived cool grays so that the blue reads as warm by contrast. There is no second accent; emphasis is weight, size, or the single blue.

**Light or dark:** Light by default. The use scene is a browser tab in daylight over someone else's page, so the card must be brighter and calmer than typical page chrome. Dark mode follows the OS and is restrained: Ink surfaces, blue kept as a signal color, never as a background field. The bloom dissolves into Ink instead of white.

Interaction and emphasis: `primary` for the primary action, the logo, active states, and the READ badge only. `signal` for hover and highlighted information. `soft` and `ice` carry the bloom's tail and low-emphasis panels. Everything that is not a decision or an action is `text`, `text-secondary`, or `text-muted`.

Decision badges are the only place four colors appear together, and three of them are near-neutral on purpose: READ is the single saturated element on any surface, SKIM is light blue, SAVE is ice, SKIP is subtle gray. Red is reserved for a genuine safety issue and does not exist in the current product. Rage bait, undisclosed ads, and AI filler are a quiet SKIP with a reason, not an alarm.

## Typography

Inter is the one face for display, headings, body, and labels, loaded from Google Fonts at 400, 500, 600, and 700 with `display=swap` and the system sans stack as fallback. It is on gstack's overused-as-display list; the tradeoff was stated and accepted because Winnow is a utility that should feel native to the browser, and a distinctive display face would make the card louder than the page it sits on. Register: plain, sentence case, short headlines. ALL CAPS is allowed only for tiny meta labels and the four decision words.

JetBrains Mono carries code samples and the typed-answer JSON on the landing page and in docs. Tabular numerals for confidences and timestamps.

Scale: display 56 to 72px at 1.0, H1 40 to 48 at 1.05, H2 28 to 32 at 1.15, H3 20 to 24 at 1.25, body 15 to 16 at 1.55, small 13 to 14 at 1.45, meta 11 to 12 at 1.3 with wide tracking. Levels differ by size, not weight alone. Display type never exceeds 72px; size is not hierarchy.

## Layout

Marketing: 12-column grid, `max-width: 1200px`, `padding-inline: 24px`, text blocks capped at 680px, hero heading at 560px. Asymmetry is allowed and encouraged; the page is a story, not a stack of equal cards. Background rhythm alternates bloom, white, ice, white, soft blue, white, ice, white, bloom, so the gradient appears exactly twice.

Product: vertical stacking, very few nested panels. The card is 320 to 360px wide with 16 to 20px padding. Feed badges are inline, pill-shaped, at most 1.2em tall, and never move existing page content. Popovers open on hover, focus, or tap and flip above when they would leave the viewport.

Spacing follows a 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Large gaps between sections, tight gaps inside components.

Responsive: two-column hero down to about 900px, then single column in this order: hero copy, hero card, CTA, problem, decision system, feed demos, video, personalization, trust, open source, final CTA. Nothing essential is hidden on mobile. 16px minimum side gutter, no horizontal scroll at 360px.

## Elevation & Depth

Depth comes from offset shadows with soft blur, thin borders, and surface tints, in that order of preference. Card: `0 8px 30px rgba(15,23,42,.08)` plus `0 1px 2px rgba(15,23,42,.04)`. Hover: `0 14px 40px rgba(15,23,42,.11)`. Marketing panels rely on whitespace and a 1px border; shadows are for the product card and popover only. No zero-offset glows, no frosted glass beyond the sticky nav's single blur, no 3D.

## Shapes

Product UI: buttons 10 to 12px. Badges are full pills. Small cards 14px, the product card 18px, large marketing panels 24px. Inputs 8px. Nested inner radius equals outer radius minus the gap. Not every container gets a large radius; the rhythm comes from mixing pills with restrained rectangles. Winnow uses rounded capsules, soft pills, rounded rectangles, soft gradient fields, and the three-piece W mark. It never uses hexagons, circuit lines, neural-network imagery, robots, floating blobs, or sparkles.

The mark: two rounded diagonal outer strokes and one centered rounded inverted wedge. White on Winnow Blue is primary; blue on white, white on Ink, and Ink on white are the approved variants. No outlines, shadows, strokes, or 3D on the logo. Minimum 16px in the toolbar, 20px in UI, 24px in navigation. Clear space is half the wedge height.

## Components

**Decision card (extension, page mode).** White surface, 1px border, 18px radius, card shadow, 320 to 360px. Header row: 12 to 16px W mark, "Winnow", confidence at right. Title in H3 weight. Decision badge before anything else, then two to four reason lines each from a template, then Read and Skip feedback buttons. Loading state shows a pulsing "Evaluating…" and nothing else. Error state uses `text-secondary` on white with one plain sentence. Focus-visible on every control; Escape dismisses. No charts, no illustrations, no sidebar.

**Feed badge.** Inline pill after the link, `decision` type style, the decision word plus a confidence dot or percentage. Loading shows "…", low confidence shows "?" with a title attribute. Hover or focus after 150ms opens the popover, which reuses the card body. Never shifts line height perceptibly.

**Buttons.** Primary: `primary` background, white text, 44px tall, 18px horizontal padding, 10px radius; hover darkens to `primary-hover` and lifts 1px. Secondary: text with an arrow or a thin border; never a gradient, never a ghost-button wall. Disabled: 50% opacity, no hover lift. Active: no lift.

**Inputs.** 1px `border`, 8px radius, `text` color, 2px `primary` focus ring at 2px offset. Labels above in `small` weight 500.

**Nav.** 64 to 72px, transparent at top, `rgba(255,255,255,.82)` with 14px blur once scrolled, a 0.7-alpha border. One primary CTA, "Add to Chrome". No mega menu.

**Popover.** Same tokens as the card, positioned fixed, flips vertically to stay in the viewport, closes on mouseleave with a 120ms grace, on focusout, and on Escape.

**Bloom.** The signature radial gradient with a 3% inline SVG grain overlay. Hero and final CTA only. Text over the bloom sits on the white or ice side, or is white over the blue core, and keeps WCAG AA.

## Marketing site: the editorial layer

The product is calm and rounded so it can sit quietly over someone else's page. The marketing site does not sit over anything; it is the one place Winnow speaks in its own voice, and it does so in an editorial register borrowed from print, not from SaaS templates.

- **Type.** Cabinet Grotesk (Fontshare, weights 500 to 800) is the poster face for H1, H2, and big numbers on the site only. H1 runs at 150px on a 1440 viewport, line-height 0.95, tracking -0.035em, spanning the full content width. Body stays Inter; labels, figure tags, footnotes, and the margin strip are JetBrains Mono. The extension never uses Cabinet Grotesk.
- **Colour fields.** Whole sections are drenched in one flat colour from the existing palette: paper, Soft Blue with Ink text, Winnow Blue with white text, Ink with paper text. No gradients on the site; the bloom is retired there and kept for onboarding and social assets. Rhythm: paper, soft, paper, blue, paper, soft, paper, ink.
- **Plates and figures.** Section content sits on a squared plate with four corner registration marks. Product demos are squared figures with a hairline border, a mono tag in an inverted box, and a mono caption row. Border radius is zero on the site; the only rounded elements are the extension's real decision badges inside figures, because those are the product.
- **Columns and rules.** Text runs in two or three ruled columns with a mono label above each, collapsing to one column with top rules below 820px.
- **Calls to action.** In the hero, large underlined text links in the poster face. In the nav, one squared Ink button. No pill buttons on the site.
- **Numbers.** Measured figures only, set in the poster face with a mono footnote naming the date, the model version, and the proof document.
- **Motion.** The same minimal-functional rules as the product; the one authored moment remains the card resolving from Evaluating to a decision.
- **Not borrowed.** No retro operating-system windows, bitmap fonts, dithered textures, live clocks, or gibberish margins. Those belong to other brands; the margin strip carries Winnow's own question ids instead.

## Do's and Don'ts

- Do: put the decision word and confidence before any explanation on every surface.
- Do: use Winnow Blue for exactly one thing per viewport, the primary action or the READ badge.
- Do: write reasons as fixed templates filled with typed answers; never render model prose.
- Do: keep the card calmer than the page underneath it; when in doubt, remove the element.
- Do: show "Evaluating…" while judging, and make the transition to the decision the one moment of motion.
- Don't: use red, or any alarm treatment, for SKIP, rage bait, ads, or AI filler.
- Don't: build a three-card feature grid, a dashboard, a testimonial row, fake metrics, or a logo marquee.
- Don't: put gradients anywhere except the bloom on onboarding and social assets; no gradient text, no gradient buttons, no gradients on the marketing site.
- Don't: use "AI-powered", "supercharge", "revolutionize", or "unlock" in any copy.
- Don't: show a number as a score out of ten; show a decision and a confidence.

## Motion

- **Approach:** minimal-functional. Motion explains filtering and deciding; it never performs thinking.
- **Easing:** `cubic-bezier(.2, .8, .2, 1)` for enter and move; ease-in for exit. No springs or overshoot in product UI.
- **Duration:** micro 120ms, default 180ms, slow 260ms, section reveal 260 to 400ms, demo sequences 600 to 900ms.
- **Scroll reveal:** opacity 0 to 1 with an 18px rise; whole sections, not individual paragraphs.
- **Reduced motion:** every transition becomes a simple fade or a static state; the hero card shows its first example without cycling.
- **The one authored moment:** a card holding "Evaluating…" resolves into a decision word, its badge and reasons fading up 8px over 180ms. Everything else on the page defers to it.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-19 | Initial design system formalized | Created by /design-consultation from the approved brand document `docs/brand/DESIGN.md` and landing page spec `docs/brand/LANDING_PAGE.md`; no research or outside voices, since the system was already approved and shipped on the website. |
| 2026-09-19 | Inter as the display face despite gstack's overused-face flag | The product must feel native to the browser; a distinctive display face would make the card louder than the page it sits on. Tradeoff stated once and accepted. |
| 2026-09-19 | No red anywhere; SKIP and junk warnings are neutral gray | Winnow makes a recommendation, not a threat. Red is held in reserve for a genuine safety issue. |
| 2026-09-19 | Marketing site adopts an editorial layer: Cabinet Grotesk poster headlines, corner-marked plates, drenched colour fields, squared figures, mono labels; product UI unchanged | User judged the calm site low budget against typesafe.ai. Editorial structure in Winnow's own palette gives the site a point of view while product, icons, and README stay one brand. Retro-computing chrome deliberately not borrowed. |
| 2026-09-19 | Creative North Star chosen as the user outcome, not the mood | "It told me whether to open it before I wasted time" is what a visitor can repeat; calm and minimal are enforced by the rules rather than by the anchor. |
