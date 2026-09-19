# Winnow brand quick reference

**Less noise. More signal.** · *Know before you click.* Full system: [docs/brand/DESIGN.md](../../docs/brand/DESIGN.md).

## Palette

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

Type: Inter (fallback `ui-sans-serif, system-ui, sans-serif`), sentence case.

## Badges

| Verdict | Background | Text |
|---|---|---|
| Read | `#2563EB` | `#FFFFFF` |
| Skim | `#DBEAFE` | `#1D4ED8` |
| Save | `#F1F5F9` | `#334155` |
| Skip | `#E2E8F0` | `#475569` |

Pill radius; confidence after the label (`READ · 91%`); no red for Skip unless it is a safety issue.

## Logo

Do: use the rounded three-piece W as drawn in `mark.svg`; white on Winnow Blue first, then blue on white, white on Ink, Ink on white for monochrome; keep clear space of half the centre wedge's height; 16 px minimum in the toolbar, 20 px in UI, 24 px in navigation.

Don't: redraw or restyle the mark; add outlines, strokes, shadows, or 3D effects; use the old node/network mark; place it on busy or gradient-clashing backgrounds; rotate it.

## Files

| File | Contents |
|---|---|
| `mark.svg` / `mark-white.svg` / `mark-ink.svg` | Mark in Winnow Blue / white / Ink, viewBox `0 0 100 100` |
| `favicon.svg` | Blue mark |
| `logo.svg` / `logo-white.svg` | Lockup, mark + "Winnow" wordmark, Ink / white |
| `app-icon-primary.png` | 512 px, white mark on blue rounded square |
| `app-icon-light.png` | 512 px, blue mark on white, 1 px Border stroke |
| `app-icon-dark.png` | 512 px, white mark on Ink |
| `og.png` | 1200×630 link preview (copy of the social pack file) |
| `brand-board.png` | Reference board |
| `social/` | Social pack, below |
| `../../public/icons/{16,32,48,128}.png` | Extension icons (primary app icon) |

## Social sizes

| File | Size | Use |
|---|---|---|
| `winnow-profile-square-1080.png` | 1080×1080 | Profile / square post |
| `winnow-instagram-portrait-1080x1350.png` | 1080×1350 | Portrait post |
| `winnow-story-reel-1080x1920.png` | 1080×1920 | Story / Reel / Short |
| `winnow-landscape-1920x1080.png` | 1920×1080 | Landscape / thumbnail |
| `winnow-og-link-preview-1200x630.png` | 1200×630 | Open Graph |
| `winnow-x-header-1500x500.png` | 1500×500 | X header |
| `winnow-linkedin-cover-1584x396.png` | 1584×396 | LinkedIn cover |
| `winnow-facebook-cover-1640x624.png` | 1640×624 | Facebook cover |
| `winnow-youtube-channel-art-2560x1440.png` | 2560×1440 | YouTube channel art |
