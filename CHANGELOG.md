# Changelog

All notable changes to Winnow are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-09-19

First public release.

### Added

- **Page mode.** A shadow-DOM card on articles (Mozilla Readability, 120-word minimum) and YouTube watch pages showing a read-now / skim / save / skip verdict with confidence, insight density (1–10), content type, already-known, claims supported, undisclosed sales pitch, AI-written, payload location, length, and up to four templated reasons. Read and Skip feedback buttons.
- **Video captions.** Caption tracks fetched through YouTube's InnerTube player endpoint (iOS client, same origin); transcript split into 8 segments; "Skip to" chips seek the player to the segment Jev picked as the core idea, with a runner-up when its probability is at least 0.25.
- **Feed mode.** Badges on Hacker News list pages, YouTube home/feed/search, and generic pages with 15 or more external links. Items are observed with IntersectionObserver, batched 12 per Jev call, and cancelled when they scroll far away. Hover or focus shows the full card.
- **Prefetch link text** (optional, off by default). Requests `<all_urls>` and fetches feed link targets in the service worker (3 concurrent, 8 s timeout, HTML only, 300 KB cap, 1,200 chars kept) so Jev sees body text.
- **Reader state.** Free-text goals, a rolling 30-day topic window from page-mode judgments, and a 200-entry Read/Skip log, summarised into every request under a 2,400-character budget. Goal changes bump a version that is part of every cache key.
- **Judgment cache** in `chrome.storage.local`: key `sha256(depth|url|readerStateVersion)`, 7-day TTL, 3,000 entries with insertion-order eviction, serialized writes.
- **Jev client** pinned to `jev-1.13.0`: request and response validation, 15 s timeout, 2 retries with jittered backoff on 408/429/5xx/network, `retry-after` honoured up to 60 s, all three observed error `detail` shapes accepted.
- **Eleven typed questions** (`insight_density`, `already_known_to_reader`, `content_type`, `claims_supported`, `undisclosed_sales_pitch`, `ai_written`, `payload_location`, `payload_segment`, `serves_reader_goals`, `topic`, `jev_verdict`) and an ordered rule set in `computeVerdict` with depth gating for body-dependent rules.
- **Options page**: goals, mode toggles, per-site feed toggles, prefetch toggle, excluded hosts, eleven threshold sliders with reset, clear cache, reset reader state, key rotation. Onboarding page on install verifies the key against `GET /v1/models`.
- **Eval harness** (`pnpm eval`): 40 original fixtures across 8 content classes, 30/10 tune/report split, confusion matrices, per-field checks, coordinate-wise grid search over thresholds, on-disk response cache, cost line. Report-split verdict agreement 80%, content-type agreement 90% with default thresholds against unreviewed goldens.
- **Dev preview** (`pnpm dev` → `/dev/preview.html`) rendering every card and badge state from fixtures, light and dark.
- 124 unit tests, CI (typecheck, test, build) and a tag-triggered release workflow that zips `dist/` onto a GitHub Release.

[Unreleased]: https://github.com/ThinkyMiner/Winnow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ThinkyMiner/Winnow/releases/tag/v0.1.0
