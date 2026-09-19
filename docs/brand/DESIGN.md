# Winnow — Design System

> **Brand idea:** Less noise. More signal.  
> **Product promise:** Know before you click.

Winnow should feel calm, selective, intelligent, and slightly opinionated. It is not a generic “AI assistant” brand. The design should communicate that Winnow protects attention by filtering low-value content before the user spends time on it.

---

## 1. Brand Direction

### Personality

Winnow is:

- Calm
- Minimal
- Focused
- Intelligent
- Trustworthy
- Slightly opinionated
- Internet-native

Winnow is **not**:

- Futuristic / cyberpunk
- Overly “AI-looking”
- Neon-heavy
- Gamified
- Corporate
- Noisy
- Dashboard-heavy
- Full of gradients everywhere

The product should feel like a quiet layer over the web.

---

## 2. Logo

### Primary Mark

Use the **rounded Winnow “W” mark**.

The mark is made from:

- Two rounded diagonal outer strokes
- One centered rounded inverted wedge
- Strong symmetry
- Soft geometry
- No outlines
- No additional symbols

The logo should always be recognizable at browser-extension icon size.

### Important

**Do not use the earlier node / network / molecule-style mark.**  
The approved Winnow mark is the rounded three-piece `W`.

### Preferred Variants

1. **White mark on Winnow Blue**
2. **Winnow Blue mark on white**
3. **White mark on Ink**
4. **Ink mark on white** when a monochrome version is required

### Clear Space

Keep at least `0.5x` the height of the center wedge around the full mark.

### Minimum Size

- Browser toolbar icon: `16px`
- UI usage: `20px`
- Product navigation: `24px`
- Marketing: no practical maximum

Do not add shadows, outlines, strokes, or 3D effects to the logo itself.

---

## 3. Color System

### Core Palette

| Token | Hex | Usage |
|---|---|---|
| Winnow Blue | `#2563EB` | Primary actions, logo, active states |
| Signal Blue | `#3B82F6` | Hover states, highlighted information |
| Soft Blue | `#93C5FD` | Supporting gradients, low-emphasis UI |
| Ice | `#EFF6FF` | Panels, subtle backgrounds |
| White | `#FFFFFF` | Main surfaces |
| Ink | `#0F172A` | Primary text |
| Slate | `#475569` | Secondary text |
| Muted | `#94A3B8` | Metadata, captions |
| Border | `#E2E8F0` | Dividers and component borders |

### CSS Tokens

```css
:root {
  --winnow-blue: #2563EB;
  --signal-blue: #3B82F6;
  --soft-blue: #93C5FD;
  --ice: #EFF6FF;

  --white: #FFFFFF;
  --ink: #0F172A;
  --slate: #475569;
  --muted: #94A3B8;
  --border: #E2E8F0;

  --surface: #FFFFFF;
  --surface-soft: #F8FAFC;
}
```

---

## 4. Signature Gradient

The gradient is one of Winnow's main visual identifiers.

It should look like a **soft blue bloom dissolving into white**, not a conventional linear UI gradient.

### Direction

Use:

- Deep blue concentrated toward one side
- A soft mid-blue transition
- White / ice fading out across the remaining area
- Slight blur
- Very subtle grain

Example approximation:

```css
background:
  radial-gradient(
    circle at 28% 45%,
    #2563EB 0%,
    #3B82F6 24%,
    #93C5FD 48%,
    #EFF6FF 70%,
    #FFFFFF 100%
  );
```

For marketing artwork, add subtle noise at around `2–4%` opacity.

### Avoid

- Hard gradient edges
- Purple / pink gradients
- Rainbow gradients
- Glossy 3D lighting
- Excessive blur that reduces contrast

---

## 5. Typography

### Primary Typeface

**Inter**

Use Inter across product UI and marketing.

Fallback:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### Type Scale

| Style | Size | Weight | Line Height |
|---|---:|---:|---:|
| Display | 56–72px | 700 | 1.0 |
| H1 | 40–48px | 700 | 1.05 |
| H2 | 28–32px | 650 | 1.15 |
| H3 | 20–24px | 600 | 1.25 |
| Body | 15–16px | 400 | 1.55 |
| Small | 13–14px | 400 | 1.45 |
| Meta | 11–12px | 500 | 1.3 |

### Typography Rules

- Headlines should be short.
- Avoid overly clever marketing copy in UI.
- Use sentence case.
- Avoid ALL CAPS except tiny metadata labels.
- Keep body text comfortable and sparse.

---

## 6. Brand Copy

### Primary Tagline

> **Less noise. More signal.**

### Product Line

> **Know before you click.**

### Supporting Lines

- Your time matters.
- Read. Skim. Save. Skip.
- Browse better.
- Find the signal.
- Spend attention carefully.

The tone should be concise and confident.

Avoid phrases like:

- “AI-powered intelligence platform”
- “Revolutionize your browsing”
- “Unlock productivity”
- “Supercharge your workflow”

---

## 7. Product Decision Language

The core Winnow decision system is:

- **READ**
- **SKIM**
- **SAVE**
- **SKIP**

These should appear before verbose explanation.

Example:

```text
READ · 91%
High insight density
New to you
Not clickbait
Best section: 04:32–08:10
```

### Confidence

Confidence should be visible but secondary.

Good:

```text
READ · 91%
```

Avoid:

```text
AI SCORE: 9.1/10
```

Winnow is making a recommendation, not gamifying content.

---

## 8. Decision Badge Design

### Read

- Primary blue
- White text
- Highest visual emphasis

### Skim

- Light blue background
- Blue or Ink text

### Save

- Ice / neutral background
- Ink text

### Skip

- Neutral or dark text on subtle gray
- Avoid aggressive red unless there is an actual safety issue

Example tokens:

```css
.badge-read {
  background: #2563EB;
  color: #FFFFFF;
}

.badge-skim {
  background: #DBEAFE;
  color: #1D4ED8;
}

.badge-save {
  background: #F1F5F9;
  color: #334155;
}

.badge-skip {
  background: #E2E8F0;
  color: #475569;
}
```

---

## 9. Browser Extension UI

The extension should feel like a **small judgment card**, not a mini-dashboard.

### Card Anatomy

```text
┌─────────────────────────────────┐
│ W  Winnow              92%      │
│                                 │
│ Deep dive into KV caching       │
│ for LLMs                        │
│                                 │
│ [ READ ] [ Skim ] [ Save ]      │
│                                 │
│ ● High insight density          │
│ ● Not clickbait                 │
│ ● You haven't read this yet     │
│ ● Best part: 4:32–8:10          │
└─────────────────────────────────┘
```

### Card Rules

- Max width: `320–360px`
- White surface
- `16–20px` padding
- `14–18px` radius
- Thin border
- Extremely subtle shadow
- No sidebar
- No unnecessary charting
- No decorative illustrations inside the card

### Suggested Component Tokens

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;

--shadow-card:
  0 8px 30px rgba(15, 23, 42, 0.08);
```

---

## 10. Feed Badges

On Hacker News, YouTube, Reddit, etc., Winnow should be visible without becoming distracting.

Examples:

```text
READ · 87%
SKIM · 73%
SKIP · 94%
```

### Rules

- Keep badges compact.
- Do not move existing site content.
- Prefer inline placement.
- Avoid large floating cards until hover / click.
- Logo can appear at `12–16px`.
- Badge radius: pill.
- Use Winnow Blue sparingly.

---

## 11. Video Experience

For video content, Winnow may show:

```text
SKIM · 88%

Best part
04:32 → 08:10

Skip intro
Jump to payoff
```

The “jump to payoff” interaction should feel like a utility, not a video player replacement.

---

## 12. Layout System

### Spacing Scale

Use a simple 4px base:

```text
4
8
12
16
24
32
48
64
96
```

### Container Widths

- Product cards: `320–420px`
- Modal / detail panel: `560–720px`
- Marketing content: `1120–1200px`
- Reading width: `640–720px`

### Grid

Marketing:

- 12-column
- Large whitespace
- Strong asymmetry allowed
- Avoid filling every area

Product:

- Simple vertical stacking
- Very few nested panels

---

## 13. Shapes

Winnow uses:

- Rounded capsules
- Soft pills
- Rounded rectangles
- Soft gradient fields
- The three-piece W mark

Avoid:

- Sharp geometric patterns
- Hexagons
- Neural-network imagery
- Circuit graphics
- Robot illustrations
- 3D floating blobs
- Generic AI sparkles

---

## 14. Iconography

Use simple outline icons.

Recommended style:

- `1.5–2px` stroke
- Rounded ends
- Minimal detail
- `16px`, `20px`, `24px`

Useful icons:

- Bookmark
- Clock
- Eye
- Play
- Skip
- External link
- Spark / signal
- Shield
- Chevron

Do not use icons decoratively when text is clearer.

---

## 15. Motion

Motion should communicate filtering and decision-making.

### Good Motion

- Soft fade
- Small scale-in
- Badge transition
- Loading shimmer
- Content “sorting” into a decision

### Timing

```text
Fast:     120ms
Default:  180ms
Slow:     260ms
```

Use:

```css
transition-timing-function: cubic-bezier(.2, .8, .2, 1);
```

Avoid bouncy spring animations in normal UI.

---

## 16. Loading State

Winnow should look like it is **evaluating**, not “thinking dramatically.”

Good:

```text
Checking signal…
```

or

```text
Evaluating…
```

A minimal pulse or moving blue highlight is enough.

Avoid:

```text
Our AI is deeply analyzing this content...
```

---

## 17. Landing Page Direction

### Hero

Recommended structure:

```text
[Winnow logo]

Know before
you click.

Winnow tells you if something is worth your time —
read, skim, save, or skip.

[ Add to Chrome ]   Learn more →
```

Use the Winnow blue bloom in the background.

### Below Hero

Keep the page focused on:

1. Decision before click
2. Personalized knowledge awareness
3. Clickbait / ad / AI-content detection
4. Video payoff jumping
5. Learning from user behavior

Avoid generic feature grids with 12+ cards.

---

## 18. Social Identity

Social assets should use:

- Blue bloom background
- Large white Winnow mark
- Significant negative space
- Very little text

Preferred compositions:

```text
[ large W ]
```

or

```text
Winnow
Less noise. More signal.
```

### Standard Sizes

- `1080 × 1080` — Profile / square post
- `1080 × 1350` — Portrait post
- `1080 × 1920` — Story / Reel / Short
- `1920 × 1080` — Landscape / thumbnail
- `1200 × 630` — Open Graph
- `1500 × 500` — X header
- `1584 × 396` — LinkedIn cover
- `1640 × 624` — Facebook cover
- `2560 × 1440` — YouTube channel art

---

## 19. Dark Mode

Dark mode should be restrained.

```css
[data-theme="dark"] {
  --surface: #0F172A;
  --surface-soft: #111827;
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --border: #1E293B;
}
```

Use blue as a signal color, not as the entire background.

The Winnow mark can remain white.

---

## 20. Accessibility

Minimum targets:

- WCAG AA contrast
- 44×44px interactive hit area where possible
- Never rely only on color for READ / SKIM / SAVE / SKIP
- Keyboard-navigable extension UI
- Visible focus state
- Respect `prefers-reduced-motion`

Focus ring:

```css
outline: 2px solid #2563EB;
outline-offset: 2px;
```

---

## 21. Design Principles

Before adding a UI element, ask:

### 1. Does this help the user decide faster?

If not, remove it.

### 2. Is the recommendation obvious in under two seconds?

The main decision must dominate.

### 3. Is this calmer than the page underneath it?

Winnow should reduce noise, not add another layer of it.

### 4. Are we showing evidence without overwhelming the user?

Show the top reasons first. Expand for detail.

### 5. Does this still look like Winnow without the logo?

The blue bloom, typography, whitespace, and quiet UI should make the brand recognizable.

---

## 22. Recommended Asset Structure

```text
public/
└── brand/
    ├── logo-mark.svg
    ├── logo-mark-white.svg
    ├── logo-lockup.svg
    ├── logo-lockup-white.svg
    ├── favicon.svg
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-128.png
    └── social/
        ├── square.png
        ├── portrait.png
        ├── story.png
        ├── landscape.png
        └── og.png
```

---

## 23. Final Rule

When there is a choice between:

> **more impressive**

and

> **more useful**

choose **more useful**.

Winnow exists to reduce the amount of attention users have to spend.

The design should do the same.

---

## 24. Addendum (2026-09-19): the marketing site speaks in an editorial register

Section 17 above described a soft, bloom-based landing page. After building it, the site read as templated. The marketing site now uses an editorial layer, defined in the root `DESIGN.md` under "Marketing site: the editorial layer": Cabinet Grotesk poster headlines, corner-marked plates, whole sections drenched in one palette colour, squared figures with mono tags, ruled text columns, underlined text calls to action. Palette, mark, and Inter body are unchanged. The product UI in sections 7 to 11 is unchanged and remains rounded and calm. The bloom stays for onboarding and social assets. Retro-computing chrome from reference sites is deliberately not borrowed.
