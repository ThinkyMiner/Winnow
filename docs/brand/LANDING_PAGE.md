# Winnow Landing Page — Visual Direction, Structure & Interaction Spec

> **Brand:** Winnow  
> **Primary message:** Less noise. More signal.  
> **Product line:** Know before you click.  
> **Goal of this page:** Make the product understandable in under 15 seconds and desirable in under 60 seconds.

This document defines the complete landing-page direction for Winnow: visual language, section order, interaction model, page flow, responsive behavior, motion, copy hierarchy, and implementation guidance.

The page should feel like a **calm layer over the internet**. It should not look like an AI SaaS dashboard, an enterprise website, or a flashy tech landing page.

---

# 1. Core Landing Page Idea

The landing page should demonstrate one simple transformation:

```text
The web is noisy
      ↓
Winnow evaluates before you spend attention
      ↓
You immediately know:
READ / SKIM / SAVE / SKIP
      ↓
You spend time only where it matters
```

The website should visually behave the same way.

It should reduce cognitive load instead of introducing more of it.

---

# 2. Landing Page Goals

The page must answer these questions in this order:

1. **What is Winnow?**
2. **Why should I care?**
3. **What does it actually do on the web?**
4. **Can I trust its recommendations?**
5. **How does it learn what matters to me?**
6. **What does it look like in real use?**
7. **How do I install it?**

Do not lead with implementation details, model architecture, or “AI-powered” language.

The user should understand the benefit before the technology.

---

# 3. Visual Direction

## Overall Mood

Winnow should feel:

- airy
- calm
- focused
- precise
- soft
- intelligent
- browser-native
- premium but not luxury
- opinionated without being aggressive

The website should feel like it has **room to breathe**.

### Visual reference

The primary brand visual is:

- soft cobalt-blue bloom
- fading into pale blue / white
- slight grain
- large white Winnow mark
- generous negative space
- minimal use of text

This gradient should act as a signature visual field throughout the page.

---

# 4. Page Structure

Recommended full landing-page flow:

```text
01. Header / Nav
02. Hero
03. Live Product Demo Strip
04. The Problem
05. The Winnow Decision System
06. Browser Feed Demo
07. Video Payoff Demo
08. Personalization / Memory
09. Trust / Why This Recommendation
10. Open Source + Jev
11. Final CTA
12. Footer
```

The page should feel like a story rather than a stack of unrelated feature cards.

---

# 5. Header

## Layout

Desktop:

```text
┌────────────────────────────────────────────────────────────┐
│ [W] Winnow              How it works   GitHub   Privacy    │
│                                              [Add to Chrome]│
└────────────────────────────────────────────────────────────┘
```

Mobile:

```text
[W] Winnow                         [Add]
```

Optional overflow menu:

```text
How it works
GitHub
Privacy
```

## Visual Style

- height: `64–72px`
- white or near-white background
- subtle blur only if sticky
- no heavy border
- no oversized nav
- no mega menu

## Behavior

### Initial state
Transparent / white.

### On scroll
Use:

```css
background: rgba(255,255,255,0.82);
backdrop-filter: blur(14px);
border-bottom: 1px solid rgba(226,232,240,0.7);
```

### CTA
Primary button:

```text
Add to Chrome
```

Secondary action:

```text
GitHub
```

Do not show multiple competing CTA buttons.

---

# 6. Hero

The hero should communicate the product in one glance.

## Layout

Desktop:

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     Know before                                             │
│     you click.                      [interactive demo]       │
│                                                             │
│     Winnow tells you if something   YouTube / article card  │
│     is worth your time — read,      with live READ / SKIM   │
│     skim, save, or skip.            recommendation          │
│                                                             │
│     [ Add to Chrome ]  View GitHub                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Hero Copy

### Eyebrow

```text
LESS NOISE. MORE SIGNAL.
```

### Heading

```text
Know before
you click.
```

### Supporting text

```text
Winnow tells you if an article or video is worth your time —
read, skim, save, or skip.
```

### CTA

Primary:

```text
Add to Chrome
```

Secondary:

```text
View on GitHub
```

## Hero Visual

Do not use a generic browser mockup.

Use a **single content card** floating in the soft blue brand field.

Example:

```text
┌──────────────────────────────────────┐
│ Deep dive into KV caching for LLMs  │
│ youtube.com                          │
│                                      │
│ READ · 92%                           │
│                                      │
│ High insight density                 │
│ New to you                           │
│ Not clickbait                        │
│ Best part: 4:32–8:10                 │
└──────────────────────────────────────┘
```

The card should look native to Winnow and realistic enough to feel like a real extension.

---

# 7. Hero Interaction

The hero should not be static.

## Interaction Concept

Cycle through sample content cards:

```text
Article → READ
YouTube video → SKIM
Ragebait article → SKIP
Long research piece → SAVE
```

Every 3–4 seconds:

1. content title fades
2. Winnow briefly shows:
   `Evaluating…`
3. decision badge appears
4. explanation bullets reveal
5. next example slides in

### Important

The animation should be subtle.

No dramatic AI “thinking” animation.

### Preferred Transition

```text
opacity: 0 → 1
transform: translateY(8px) → 0
duration: 180ms
```

---

# 8. Scroll Cue

At the bottom of the hero, show a subtle:

```text
See how it works ↓
```

This should disappear after the first scroll.

---

# 9. Section: The Problem

## Purpose

Explain the problem emotionally but without over-dramatizing it.

## Copy Direction

Heading:

```text
Your attention is expensive.
The internet acts like it isn't.
```

Supporting copy:

```text
Every feed is competing for the same thing: your next click.
Winnow adds a decision layer before that happens.
```

## Visual

Show a noisy feed on the left:

```text
13 links
8 thumbnails
6 clickbait titles
4 sponsored posts
```

Then visually fade / blur most of them.

On the right:

```text
3 things worth your time
```

The section should visually demonstrate **noise becoming signal**.

---

# 10. Interaction: Noise → Signal

As the user scrolls:

### Phase 1
Show cluttered content cards.

### Phase 2
Cards that are low-value gradually:

- reduce opacity
- desaturate
- shrink slightly

### Phase 3
The remaining useful cards stay sharp.

The transition should make the product idea obvious without text.

Do not animate more than `6–8` items.

---

# 11. Section: Decision System

## Heading

```text
Four answers.
That's usually enough.
```

## Subheading

```text
Winnow does not give you a paragraph when a decision will do.
```

## Layout

Use four large horizontal or grid cards:

```text
READ
Worth your time now.

SKIM
Useful, but only parts matter.

SAVE
Good, just not for right now.

SKIP
You are unlikely to get enough value from this.
```

## Desktop

```text
[ READ ] [ SKIM ] [ SAVE ] [ SKIP ]
```

## Mobile

Stack vertically.

---

# 12. Decision Card Interaction

Hover each card to reveal a compact explanation.

Example:

```text
READ
91% confidence

Why:
• high insight density
• new information
• relevant to your goals
```

### Hover motion

```text
translateY(-3px)
border-color → soft blue
shadow → slightly stronger
```

Do not make cards colorful by default.

Only `READ` may use full Winnow Blue.

---

# 13. Section: Feed Demo

## Purpose

Show how Winnow behaves **inside the sites people already use**.

## Heading

```text
It works where you already browse.
```

## Demo Tabs

Use:

```text
[ YouTube ] [ Hacker News ] [ Articles ]
```

Only one demo is visible at a time.

---

# 14. YouTube Demo

Show a simplified YouTube feed.

Example:

```text
┌────────────────────────────────────┐
│ [thumbnail]                        │
│ Building RAG from scratch          │
│ 24:18                              │
│                           SKIM 88% │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ [thumbnail]                        │
│ Why AI changes EVERYTHING!!!       │
│ 18:42                              │
│                           SKIP 95% │
└────────────────────────────────────┘
```

Winnow badges should appear inline without moving the layout.

### Hover behavior

Hovering a badge opens a small popover:

```text
SKIM · 88%

Good explanation,
but only 7 minutes are useful.

Best part:
09:20 → 16:14

[Jump there]
```

---

# 15. Hacker News Demo

Keep the feed mostly native.

Example:

```text
A new SQLite engine for AI workloads
github.com

READ · 87%
```

On hover:

```text
High technical density
New to you
Matches systems / infra interest
```

The badge should feel like metadata, not an advertisement.

---

# 16. Article Demo

Show a normal article card:

```text
The State of AI Agents in 2026
12 min read

SKIM · 74%
```

Clicking the badge opens:

```text
Useful sections:
02. Tool orchestration
04. Memory architecture

Likely redundant:
Introduction
Market overview
```

---

# 17. Section: Video Payoff

## Heading

```text
Skip to the part that matters.
```

## Supporting Copy

```text
Winnow can tell you where the useful part begins — and take you there.
```

## Visual

Large video timeline:

```text
0:00 ──────────────── 18:42

      intro
      ██████████

                  useful section
                  █████████████████
                  09:20 → 16:14
```

CTA:

```text
Jump to payoff
```

---

# 18. Video Interaction

As user scrolls:

1. timeline appears
2. low-value segment fades
3. useful range highlights
4. playhead automatically jumps into the highlighted area

Do not autoplay sound.

The animation should communicate the concept without actual media playback.

---

# 19. Section: Personalization

## Heading

```text
Useful to you,
not useful in general.
```

## Copy

```text
Winnow learns what you read, skip, save, and already know.
Its decisions get more personal over time.
```

## Visual

Use a simple relationship diagram:

```text
What you read
      ↓
What you skip
      ↓
What you save
      ↓
What you already know
      ↓
Your Winnow
```

Then show two identical content cards with different recommendations:

```text
Person A → READ 92%
Person B → SKIP 81%
```

This communicates personalization instantly.

---

# 20. Personalization Interaction

Use a toggle:

```text
[ New user ] [ After 30 days ]
```

### New user

```text
SKIM · 67%
General signal quality
```

### After 30 days

```text
SKIP · 94%

You already know most of this.
```

This is one of the strongest product demonstrations on the page.

---

# 21. Section: Explainability

## Heading

```text
A decision without a black box.
```

## Copy

```text
Winnow tells you why it made the call.
```

## Card Example

```text
READ · 91%

Why:

+ High insight density
+ Relevant to your current goals
+ Mostly new information
+ No obvious sponsorship

Caution:

• Long introduction

Best part:
04:32 → 08:10
```

This section establishes trust.

---

# 22. Explainability Interaction

Click:

```text
Why?
```

to expand the reason list.

Default state should show no more than 3 reasons.

Use progressive disclosure.

Never show a giant model trace.

---

# 23. Section: Detecting Junk

## Heading

```text
Some things deserve a warning.
```

Show three subtle examples:

```text
Ragebait
Possible undisclosed ad
Likely AI-generated filler
```

Do not use bright danger-red unless necessary.

Use neutral warning treatment.

Example:

```text
SKIP · 96%

Possible engagement bait.
Low new-information density.
```

---

# 24. Section: Jev

This should appear later in the page.

Technology should support the product story, not lead it.

## Heading

```text
Decisions, not essays.
```

## Copy

```text
Winnow is powered by Jev, a decision model that returns typed answers instead of free-form text.
```

## Visual

Show:

```text
Input
↓
Jev
↓
{
  decision: "SKIM",
  confidence: 0.88,
  reasons: [...],
  best_part: "09:20-16:14"
}
```

Do not make this section too developer-heavy.

---

# 25. Open Source Section

## Heading

```text
Open source from day one.
```

Supporting copy:

```text
Inspect it. Fork it. Improve it.
Winnow is designed to be understandable, not mysterious.
```

Buttons:

```text
View GitHub
Read how it works
```

Optional small GitHub stars / contributors row.

Do not show fake metrics.

---

# 26. Final CTA

Use the strongest version of the brand gradient here.

## Layout

Large centered section:

```text
               [W]

      Spend attention better.

Winnow tells you what deserves your time
before you give it your time.

         [ Add to Chrome ]

           View on GitHub
```

### Background

Blue bloom should be strongest here.

Logo should be white.

---

# 27. Footer

Minimal.

```text
[W] Winnow

Less noise. More signal.

GitHub
Privacy
How it works
License

Open source.
```

No giant sitemap.

---

# 28. Page Motion System

Motion is used to explain filtering.

## Allowed Motion

- fade
- subtle slide
- soft scaling
- highlight transitions
- card reordering
- content fading
- timeline jump
- badge reveal

## Timing

```text
Micro interaction: 120ms
Default:           180ms
Section reveal:    260–400ms
Demo sequences:    600–900ms
```

## Easing

```css
cubic-bezier(.2, .8, .2, 1)
```

## Scroll Reveal

Recommended:

```css
opacity: 0;
transform: translateY(18px);
```

to:

```css
opacity: 1;
transform: translateY(0);
```

Do not animate every paragraph independently.

---

# 29. Scroll Behavior

The page should use standard browser scrolling.

Avoid:

- scroll hijacking
- forced snap scrolling
- horizontal page scroll
- long pinned animation sequences
- huge parallax effects

One or two short sticky demonstration sections are acceptable.

---

# 30. Suggested Sticky Section

The best candidate:

```text
"It works where you already browse."
```

Keep the left side sticky:

```text
YouTube
Hacker News
Articles
```

while examples change on the right during scroll.

Do not keep the section pinned for more than roughly `1.5 viewport heights`.

---

# 31. Background Rhythm

Do not make every section white.

Suggested sequence:

```text
Hero               → blue bloom
Problem            → white
Decision system    → ice
Feed demo           → white
Video               → soft blue
Personalization     → white
Explainability      → ice
Jev/Open source     → white
Final CTA           → blue bloom
```

This creates visual rhythm without using decorative gradients everywhere.

---

# 32. Section Width

Use:

```css
max-width: 1200px;
margin-inline: auto;
padding-inline: 24px;
```

Text-heavy areas:

```css
max-width: 680px;
```

Hero heading:

```css
max-width: 560px;
```

---

# 33. Border Radius System

```text
Buttons:        10–12px
Badges:         999px
Small cards:    14px
Product cards:  18px
Large panels:   24px
```

Do not give every container a large rounded rectangle.

---

# 34. Shadows

Use sparingly.

### Product Card

```css
box-shadow:
  0 10px 35px rgba(15,23,42,.08),
  0 1px 2px rgba(15,23,42,.04);
```

### Hover

```css
box-shadow:
  0 14px 40px rgba(15,23,42,.11);
```

Marketing panels should mostly rely on whitespace and borders.

---

# 35. Buttons

## Primary

```text
Add to Chrome
```

Style:

```css
background: #2563EB;
color: #FFFFFF;
height: 44px;
padding: 0 18px;
border-radius: 10px;
```

Hover:

```css
background: #1D4ED8;
transform: translateY(-1px);
```

## Secondary

Text or subtle border.

```text
View GitHub →
```

Avoid ghost-button overload.

---

# 36. Cursor Interactions

Use cursor-based reactions only in demos.

Examples:

- feed badge highlights on hover
- result card expands slightly
- “why?” opens explanation
- video timeline reveals best segment

Do not make backgrounds chase the cursor.

---

# 37. Responsive Strategy

## Desktop

- two-column hero
- side-by-side demonstrations
- max width `1200px`

## Tablet

- reduce heading size
- keep hero two-column until ~`900px`
- simplify demo cards

## Mobile

Everything becomes single-column.

Order:

```text
Hero copy
Hero demo
CTA
Problem
Decision system
Feed demos
Video
Personalization
Trust
Open source
Final CTA
```

Do not hide important content on mobile.

---

# 38. Mobile Hero

Recommended:

```text
LESS NOISE. MORE SIGNAL.

Know before
you click.

Winnow tells you whether something
is worth your time.

[ Add to Chrome ]

[ product decision card ]
```

Hero should fit mostly within the first `1.2–1.4` viewport heights.

---

# 39. Mobile Navigation

Use:

```text
[W] Winnow                  [Get Winnow]
```

Optional menu icon only if more navigation is required.

The install CTA should remain visible.

---

# 40. Accessibility

Requirements:

- WCAG AA contrast
- semantic heading order
- visible focus styles
- keyboard-accessible demo tabs
- hover interactions also work on focus / tap
- no essential information conveyed only by animation
- support `prefers-reduced-motion`
- decorative gradients should not reduce text readability

Reduced-motion mode should replace transitions with simple fades.

---

# 41. Performance

The page should feel fast.

Targets:

```text
LCP < 2.5s
CLS < 0.1
INP < 200ms
```

Avoid:

- large autoplay background videos
- WebGL backgrounds
- heavy animation libraries for simple effects
- dozens of high-resolution screenshots

Use CSS gradients instead of image backgrounds where possible.

---

# 42. Recommended Technical Approach

No framework requirement is imposed by the design system.

For implementation, prefer:

```text
Semantic HTML
CSS / Tailwind
Small amount of JS
IntersectionObserver
CSS transitions
```

If using React:

```text
LandingPage
├── Header
├── Hero
│   └── DecisionDemo
├── NoiseToSignal
├── DecisionSystem
├── FeedDemo
│   ├── YouTubeDemo
│   ├── HackerNewsDemo
│   └── ArticleDemo
├── VideoPayoffDemo
├── PersonalizationDemo
├── Explainability
├── DetectionSignals
├── JevSection
├── OpenSource
├── FinalCTA
└── Footer
```

Avoid using a heavy animation dependency unless the interaction truly requires it.

---

# 43. Suggested Content Data Structure

Keep demo content separate from components.

```ts
type WinnowDecision = "READ" | "SKIM" | "SAVE" | "SKIP";

type DemoContent = {
  title: string;
  source: string;
  type: "article" | "video" | "post";
  decision: WinnowDecision;
  confidence: number;
  reasons: string[];
  bestPart?: {
    start: string;
    end: string;
  };
};
```

This allows all demo sections to use realistic shared examples.

---

# 44. Hero Demo Example Data

```ts
const examples = [
  {
    title: "Deep dive into KV caching for LLMs",
    source: "YouTube",
    decision: "READ",
    confidence: 92,
    reasons: [
      "High insight density",
      "Mostly new to you",
      "Not clickbait"
    ],
    bestPart: {
      start: "04:32",
      end: "08:10"
    }
  },
  {
    title: "Why AI changes EVERYTHING",
    source: "YouTube",
    decision: "SKIP",
    confidence: 95,
    reasons: [
      "Low new-information density",
      "Likely engagement bait",
      "Mostly repeats topics you already know"
    ]
  }
];
```

---

# 45. Microcopy

Preferred:

```text
Evaluating…
Why?
Best part
Jump there
New to you
Already familiar
Likely sponsored
High insight density
```

Avoid:

```text
Analyzing with AI…
Processing your personalized intelligence…
Our model believes…
Generating recommendation…
```

The product should feel like a utility, not a chatbot.

---

# 46. Landing Page Story in One Screen

The most important idea:

```text
BEFORE WINNOW

title → curiosity → click → 18 minutes → regret


WITH WINNOW

title → SKIM · 88% → jump to 09:20 → useful 7 minutes
```

This can appear as a simple visual comparison somewhere between the Problem and Feed Demo sections.

---

# 47. Visual Hierarchy

At any point on the page:

1. One main message
2. One main product visual
3. One optional action

Do not place:

- title
- subtitle
- 4 cards
- diagram
- screenshot
- CTA
- badges

all in the same viewport.

Winnow should practice what it preaches.

---

# 48. Things to Avoid

Do not use:

- glowing glassmorphism everywhere
- generic AI spheres
- neural networks
- robot illustrations
- purple gradients
- starfield backgrounds
- scrolling logo marquees
- testimonial carousels without real users
- fake metrics
- meaningless “trusted by” logos
- enormous dashboard screenshots
- excessive text
- floating 3D icons
- random decorative blobs
- animated gradients behind every section

---

# 49. First Version Scope

For V1 of the landing page, ship these sections first:

```text
Header
Hero + interactive recommendation demo
Problem / Noise → Signal
READ / SKIM / SAVE / SKIP
YouTube + Hacker News demo
Video payoff
Personalization
Explainability
Open source
Final CTA
Footer
```

Everything else is optional.

This keeps the page focused while still making the product feel complete.

---

# 50. Final Experience

A visitor should leave the landing page thinking:

```text
"Oh. This tells me whether something is worth opening
before I waste time on it."
```

Not:

```text
"This is some kind of AI browser assistant."
```

That distinction should guide every design and copy decision.

---

# 51. Final Design Rule

When choosing between:

```text
more impressive
```

and

```text
more immediately understandable
```

choose:

```text
more immediately understandable
```

Winnow exists to reduce noise.

The landing page should be the clearest demonstration of that principle.
