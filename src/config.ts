/**
 * All tunables in one place. Thresholds are user-editable via options sliders;
 * everything else is a constant.
 */

/** Pinned: thresholds were tuned against this version. See docs/jev-contract.md. */
export const JEV_MODEL = "jev-1.13.0";
export const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODELS_ENDPOINT = "https://api.typesafe.ai/v1/models";

export const JEV_RETRY = {
  maxRetries: 2,
  backoffInitialMs: 500,
  backoffMaxMs: 5000,
  backoffJitter: 0.25,
  maxRetryAfterMs: 60_000,
  timeoutMs: 15_000,
} as const;

/** Chars of article body sent to Jev in page mode (~6k tokens). Context rot above this. */
export const MAX_ARTICLE_CHARS = 24_000;
/** Chars of transcript text sent in page mode. */
export const MAX_TRANSCRIPT_CHARS = 24_000;
/** Chars of prefetched body per feed item (~500 words, enough to reach "full" depth at 400 words). */
export const MAX_FEED_ITEM_CHARS = 3_000;
/** Number of segments a transcript is split into for payload_segment. */
export const VIDEO_SEGMENTS = 8;
/** Items per Jev call in feed mode. */
export const FEED_BATCH_SIZE = 12;
/** Debounce before a feed batch is sent, so scrolling coalesces. */
export const FEED_BATCH_DEBOUNCE_MS = 400;
/** Concurrent link-text prefetches in the service worker. */
export const PREFETCH_CONCURRENCY = 3;
/** Below this, a page is not judged. */
export const MIN_ARTICLE_WORDS = 120;

export const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
export const CACHE_MAX_ENTRIES = 3000;
export const TOPIC_WINDOW_DAYS = 30;
export const FEEDBACK_LOG_MAX = 200;
/** Reader-state summary budget; readerState.summarizeForState() must stay under it. */
export const READER_SUMMARY_MAX_CHARS = 2_400;

export const STORAGE_KEYS = {
  apiKey: "jev_api_key",
  settings: "settings",
  readerState: "reader_state",
  /** Cache entries: `${cachePrefix}${sha256hex}` */
  cachePrefix: "c:",
  cacheIndex: "cache_index",
} as const;

/** Nothing runs on these hosts by default (page mode and feed mode). */
export const DEFAULT_EXCLUDED_HOSTS = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "docs.google.com",
  "sheets.google.com",
  "slides.google.com",
  "drive.google.com",
  "notion.so",
  "www.notion.so",
  "localhost",
];

export interface ThresholdMeta {
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

/** Flat so sliders and the eval harness can address every knob by key. */
export const THRESHOLD_META = {
  read_now_min_density: {
    label: "Read now: min insight density",
    help: "1–10 display scale.",
    min: 1, max: 10, step: 1, default: 7,
  },
  read_now_max_known: {
    label: "Read now: max already-known",
    help: "P(reader already knows this) must be at or below.",
    min: 0, max: 1, step: 0.05, default: 0.5,
  },
  read_now_min_goal_fit: {
    label: "Read now: min goal fit",
    help: "P(serves reader goals) must be at or above.",
    min: 0, max: 1, step: 0.05, default: 0.6,
  },
  skip_max_density: {
    label: "Skip: max insight density",
    help: "At or below this density, skip unless something else rescues it.",
    min: 1, max: 10, step: 1, default: 3,
  },
  skip_min_known: {
    label: "Skip: min already-known",
    help: "At or above this, skip.",
    min: 0, max: 1, step: 0.05, default: 0.8,
  },
  skip_min_sales_pitch: {
    label: "Skip: min undisclosed sales pitch",
    help: "At or above this, skip.",
    min: 0, max: 1, step: 0.05, default: 0.7,
  },
  skip_min_ai_written: {
    label: "Skip: min AI-written",
    help: "At or above this AND density below read-now, skip.",
    min: 0, max: 1, step: 0.05, default: 0.85,
  },
  skip_max_claims_supported: {
    label: "Skip: max claims supported",
    help: "Below this, opinion/news is downgraded one step.",
    min: 0, max: 1, step: 0.05, default: 0.3,
  },
  save_min_minutes: {
    label: "Save: min reading/watch minutes",
    help: "Read-now-quality items longer than this become save.",
    min: 3, max: 60, step: 1, default: 15,
  },
  min_confidence: {
    label: "Min confidence to show a verdict",
    help: "Below this the badge shows '?' instead of a label.",
    min: 0, max: 1, step: 0.05, default: 0.4,
  },
} as const satisfies Record<string, ThresholdMeta>;

export type ThresholdKey = keyof typeof THRESHOLD_META;
export type Thresholds = Record<ThresholdKey, number>;

export const DEFAULT_THRESHOLDS: Thresholds = Object.fromEntries(
  Object.entries(THRESHOLD_META).map(([k, m]) => [k, m.default]),
) as Thresholds;
