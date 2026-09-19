# Configuration

Every tunable lives in `src/config.ts`. Thresholds are exposed as sliders on the options page and as knobs the eval grid search can move; everything else is a constant you change in code. This page is generated from that file; if they disagree, the file wins.

## Thresholds (`THRESHOLD_META`)

Each entry has a `label` and `help` (rendered on the options page), a slider range, and a `default`. `DEFAULT_THRESHOLDS` is derived from the defaults; `Settings.thresholds` stores the user's values merged over them, so a new key gets its default without a migration. The rules that read each key are in [how-judgments-work.md](how-judgments-work.md#the-verdict-rules-in-order).

| Key | Label | Help | Min | Max | Step | Default |
|---|---|---|---|---|---|---|
| `read_now_min_density` | Read now: min insight density | 1–10 display scale. | 1 | 10 | 1 | **7** |
| `read_now_max_known` | Read now: max already-known | P(reader already knows this) must be at or below. | 0 | 1 | 0.05 | **0.5** |
| `read_now_min_goal_fit` | Read now: min goal fit | P(serves reader goals) must be at or above. | 0 | 1 | 0.05 | **0.6** |
| `skip_max_density` | Skip: max insight density | At or below this density, skip unless something else rescues it. | 1 | 10 | 1 | **3** |
| `skip_min_known` | Skip: min already-known | At or above this, skip. | 0 | 1 | 0.05 | **0.8** |
| `skip_min_sales_pitch` | Skip: min undisclosed sales pitch | At or above this, skip. | 0 | 1 | 0.05 | **0.7** |
| `skip_min_ai_written` | Skip: min AI-written | At or above this AND density below read-now, skip. | 0 | 1 | 0.05 | **0.85** |
| `skip_max_claims_supported` | Skip: max claims supported | Below this, opinion/news is downgraded one step. | 0 | 1 | 0.05 | **0.3** |
| `save_min_minutes` | Save: min reading/watch minutes | Read-now-quality items longer than this become save. | 3 | 60 | 1 | **15** |
| `min_confidence` | Min confidence to show a verdict | Below this the badge shows '?' instead of a label. | 0 | 1 | 0.05 | **0.4** |

Some cut-offs in `computeVerdict` are fixed numbers, not sliders: the rage-bait/advertorial rule needs `content_type` confidence ≥ 0.6; the long-item save rule needs display density ≥ 5; the Jev tie-break needs `jev_verdict` confidence ≥ 0.5; a runner-up payload segment needs probability ≥ 0.25.

The options page renders one `<input type="range">` per key from this table (`src/options/main.ts`), and **Reset to defaults** writes `DEFAULT_THRESHOLDS` back.

## Model and endpoint

| Constant | Value | Notes |
|---|---|---|
| `JEV_MODEL` | `jev-1.13.0` | Pinned; thresholds were tuned against it. The response `model` field is stored on every `Judgment`. |
| `JEV_ENDPOINT` | `https://api.typesafe.ai/v1/systemone` | The only judgment endpoint |
| `JEV_MODELS_ENDPOINT` | `https://api.typesafe.ai/v1/models` | Used by `verifyKey` when you save a key |

### Pinning or moving the model

1. Check what your account can see: `pnpm probe` prints the answering model in the response body, and `GET /v1/models` (with your key) lists the aliases. `jev-latest` and `jev-preview` are aliases; versioned ids like `jev-1.13.0` are accepted directly.
2. Change `JEV_MODEL` in `src/config.ts`. Do not use an alias in the pin: the whole point is that the thresholds and the eval cache correspond to one version.
3. Run `pnpm eval --no-cache` (the on-disk eval cache is keyed by the request hash, which includes the model string, so a plain `pnpm eval` would also miss, but `--no-cache` makes it explicit). Compare the report-split numbers with the ones in [eval.md](eval.md#current-numbers).
4. If the numbers moved, decide whether to adjust defaults by reading the confusion matrix, not by pasting the grid-search output. Record the new model and numbers in `CHANGELOG.md` and `docs/eval.md`.

Cached judgments in users' browsers are not invalidated by a model change; they age out after 7 days, or **Clear cache** on the options page drops them immediately.

## Retry policy (`JEV_RETRY`)

| Field | Value |
|---|---|
| `maxRetries` | 2 |
| `backoffInitialMs` | 500 |
| `backoffMaxMs` | 5,000 |
| `backoffJitter` | 0.25 (±25%) |
| `maxRetryAfterMs` | 60,000 (cap on a `retry-after` header) |
| `timeoutMs` | 15,000 per attempt |

Retried: 408, 429, 5xx (including 529), network errors. Never retried: 400, 401, 422. There is no client-side throttle against the account rate limits (250k tokens/s, 1,200 req/min, documented by TypeSafe and subject to change).

## Content caps

| Constant | Value | Where it applies |
|---|---|---|
| `MAX_ARTICLE_CHARS` | 24,000 | Article body sent in page mode (~6k tokens); cut at a sentence end past the halfway mark when possible |
| `MAX_TRANSCRIPT_CHARS` | 24,000 | Transcript text in page mode, both when fetching and when splitting into segments |
| `MAX_FEED_ITEM_CHARS` | 3,000 | Prefetched body per feed item (~500 words, enough to reach `full` depth) |
| `VIDEO_SEGMENTS` | 8 | Maximum segments a transcript is split into for `payload_segment` |
| `MIN_ARTICLE_WORDS` | 120 | Below this the extractor returns nothing and no card appears |
| `MAX_REQUEST_CHARS` (`questions.ts`) | 256,000 | Safety net: state + questions are trimmed to this (~64k tokens at 4 chars/token) |

## Feed mode

| Constant | Value | Where it applies |
|---|---|---|
| `FEED_BATCH_SIZE` | 12 | Items per Jev call in `judgeFeed` |
| `FEED_BATCH_DEBOUNCE_MS` | 400 | Coalescing window before a batch of newly visible feed items is sent |
| `PREFETCH_CONCURRENCY` | 3 | Parallel link-text fetches in the service worker |
| `GENERIC_MIN` (`feed.ts`) | 15 | External links with ≥ 15-char titles needed before the generic adapter activates; also the minimum title length |
| `GENERIC_CAP` (`feed.ts`) | 150 | Maximum links the generic scanner returns |
| Prefetch timeout / body cap (`prefetch.ts`) | 8 s / 300 KB | Per fetch; HTML content types only, `credentials: "omit"` |

## Cache and reader state

| Constant | Value |
|---|---|
| `CACHE_TTL_MS` | 7 days |
| `CACHE_MAX_ENTRIES` | 3,000 (oldest by insertion evicted on write) |
| `TOPIC_WINDOW_DAYS` | 30 |
| `FEEDBACK_LOG_MAX` | 200 entries |
| `READER_SUMMARY_MAX_CHARS` | 2,400 (JSON length of the summary sent to Jev) |

## Storage keys (`STORAGE_KEYS`)

All in `chrome.storage.local`.

| Key | Holds |
|---|---|
| `jev_api_key` | The API key (string) |
| `settings` | `Settings` |
| `reader_state` | `ReaderState` |
| `c:<sha256>` | One cached `Judgment` with `storedAt` |
| `cache_index` | `[{ key, at }]`, oldest first |

## Default excluded hosts (`DEFAULT_EXCLUDED_HOSTS`)

Seeded into `Settings.excludedHosts` on first run; edit the list on the options page. A host matches exactly or as a suffix (`.` + host).

```
mail.google.com
outlook.live.com
outlook.office.com
docs.google.com
sheets.google.com
slides.google.com
drive.google.com
notion.so
www.notion.so
localhost
```

Independently of this list, `isExcluded` in `src/background/router.ts` refuses every non-`https:` URL and every loopback or private-network hostname.

## Settings defaults (`DEFAULT_SETTINGS` in `src/background/storage.ts`)

| Field | Default |
|---|---|
| `pageMode` | true |
| `feedMode` | true |
| `feedSites` | `{ hn: true, youtube: true, generic: true }` |
| `excludedHosts` | the list above |
| `prefetchLinkText` | false |
| `thresholds` | `DEFAULT_THRESHOLDS` |
