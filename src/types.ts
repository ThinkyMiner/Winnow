/**
 * Frozen contracts for Worth It. Every module builds against this file.
 * Subagents: do not edit. Report needed changes to the orchestrator.
 *
 * Sections:
 *   1. Jev wire types        — exactly what docs/jev-contract.md observed
 *   2. Domain enums          — the typed answer vocabulary
 *   3. Extraction            — what content scripts pull out of a page
 *   4. Judgment              — typed answers per item, post-parse
 *   5. Reader state          — the local profile sent with every judgment
 *   6. Verdict + CardModel   — what the UI renders (templated, never prose)
 *   7. Settings              — user-tunable, lives in chrome.storage.local
 *   8. Message protocol      — content script <-> service worker
 */

// ───────────────────────── 1. Jev wire types (observed) ─────────────────────────

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
export type JevState = string | JsonValue[] | { [k: string]: JsonValue };

export interface JevNoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}
export interface JevChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}
export interface JevScoreQuestion {
  type: "score";
  instructions: string;
  /** Ordered, ≥2 levels. Server does NOT enforce ≥2; client must. */
  criteria: string[];
}
export type JevQuestion = JevNoulQuestion | JevChoiceQuestion | JevScoreQuestion;

export interface JevRequest {
  model: string;
  state: JevState;
  questions: Record<string, JevQuestion>;
}

export interface JevNoulAnswer {
  type: "noul";
  /** P(yes) in [0,1]. No confidence field on nouls. */
  noul: number;
}
export interface JevChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}
export interface JevScoreAnswer {
  type: "score";
  /** Probability-weighted level index; fractional. */
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
}
export type JevAnswer = JevNoulAnswer | JevChoiceAnswer | JevScoreAnswer;

export interface JevUsage {
  input_tokens: number;
  output_tokens: number;
}
export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: JevUsage;
}

/** Observed `detail` shapes: string (400), object (400/401), pydantic array (422). */
export interface JevErrorBody {
  detail:
    | string
    | { error_type: string; message: string }
    | Array<{ type: string; loc: Array<string | number>; msg: string }>;
}

export type JevErrorKind =
  | "auth" // 401
  | "bad_request" // 400, 422 — our bug, never retry
  | "rate_limit" // 429
  | "overloaded" // 529, 5xx
  | "network" // fetch threw / timeout
  | "malformed_response"; // 200 but body did not parse against JevResponse

export interface JevError {
  kind: JevErrorKind;
  status?: number;
  message: string;
  requestId?: string;
  retryAfterMs?: number;
}

// ───────────────────────── 2. Domain enums ─────────────────────────

export const CONTENT_TYPES = [
  "original_research",
  "opinion",
  "news",
  "tutorial",
  "listicle",
  "rage_bait",
  "advertorial",
  "entertainment",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const PAYLOAD_LOCATIONS = ["intro", "middle", "end", "evenly"] as const;
export type PayloadLocation = (typeof PAYLOAD_LOCATIONS)[number];

export const VERDICT_LABELS = ["read_now", "skim", "save", "skip"] as const;
export type VerdictLabel = (typeof VERDICT_LABELS)[number];

/** Closed topic taxonomy. Jev picks one per item; feeds ReaderState.topics. */
export const TOPICS = [
  "software_engineering",
  "ai_ml",
  "science",
  "math",
  "hardware",
  "security",
  "startups_business",
  "economics_finance",
  "politics_policy",
  "health_medicine",
  "productivity_selfhelp",
  "design",
  "culture_arts",
  "history",
  "gaming",
  "sports",
  "consumer_tech_products",
  "other",
] as const;
export type Topic = (typeof TOPICS)[number];

// ───────────────────────── 3. Extraction ─────────────────────────

export interface TranscriptSegment {
  /** seconds */
  start: number;
  /** seconds */
  dur: number;
  text: string;
}

export interface ArticleContent {
  kind: "article";
  url: string;
  title: string;
  /** Readable body text, already capped by the extractor (see config.MAX_ARTICLE_CHARS). */
  text: string;
  wordCount: number;
  readingMinutes: number;
  byline?: string;
  siteName?: string;
  /** True when Readability found a body; false when heuristics fell back to <main>/<article>. */
  readabilityHit: boolean;
}

export interface VideoContent {
  kind: "video";
  url: string;
  videoId: string;
  title: string;
  channel?: string;
  durationSec?: number;
  /** Absent when no captions; UI must degrade gracefully. */
  transcript?: TranscriptSegment[];
  description?: string;
}

export type ExtractedContent = ArticleContent | VideoContent;

/** One link in a feed. `element` never crosses the message boundary. */
export interface FeedItem {
  url: string;
  title: string;
  /** Anything cheap the adapter can see: domain, points, comment count, channel, view count, snippet. */
  snippet?: string;
  /** For YouTube feed items. */
  videoId?: string;
}

export type FeedAdapterId = "hn" | "youtube" | "generic";

// ───────────────────────── 4. Judgment ─────────────────────────

/** IDs of the questions we ask. Suffix-free; the client prefixes `i<n>_` in feed batches. */
export const QUESTION_IDS = [
  "insight_density",
  "already_known_to_reader",
  "content_type",
  "claims_supported",
  "undisclosed_sales_pitch",
  "ai_written",
  "payload_location",
  "payload_segment", // video only, Choice over segment ids
  "serves_reader_goals",
  "topic",
  "jev_verdict", // speculative: Jev's own read_now/skim/save/skip; used for confidence + tie-break
] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export interface QuestionSpec {
  id: QuestionId;
  /** Which content kinds this question applies to. */
  appliesTo: ReadonlyArray<"article" | "video" | "feed">;
  /**
   * Build the wire question. `path` is the state path prefix for the item,
   * e.g. "" for page mode (state.content) or "items[3]" in a feed batch.
   */
  build(path: string, ctx: QuestionBuildContext): JevQuestion;
}

export interface QuestionBuildContext {
  /** Number of transcript segments when kind === "video" and transcript present. */
  segmentCount?: number;
}

/** How much of the item Jev saw. Cache keys include this. */
export type JudgmentDepth = "full" | "snippet";

export interface ChoiceAnswer<T extends string = string> {
  choice: T;
  confidence: number;
  probabilities: Partial<Record<T, number>>;
}
export interface ScoreAnswer {
  /** Raw Jev expected level index. */
  score: number;
  confidence: number;
  levels: number;
}

/** Typed, parsed answers. All optional fields are absent when the question was not asked. */
export interface JudgmentAnswers {
  /** 5-level score, 0..4. Display 1–10 via verdict.ts. */
  insight_density: ScoreAnswer;
  already_known_to_reader: number;
  content_type: ChoiceAnswer<ContentType>;
  claims_supported: number;
  undisclosed_sales_pitch: number;
  ai_written: number;
  payload_location: ChoiceAnswer<PayloadLocation>;
  /** Choice over "s0".."sN"; only for video with transcript. */
  payload_segment?: ChoiceAnswer<string>;
  serves_reader_goals: number;
  topic: ChoiceAnswer<Topic>;
  jev_verdict: ChoiceAnswer<VerdictLabel>;
}

export interface Judgment {
  url: string;
  title: string;
  depth: JudgmentDepth;
  model: string;
  judgedAt: number;
  readerStateVersion: number;
  answers: JudgmentAnswers;
  /** Per-item share of the call's usage (whole call / items in batch). */
  usage: JevUsage;
  /** Copied from content so verdict.ts can compute save/skim by length without re-extracting. */
  readingMinutes?: number;
  durationSec?: number;
  /** Segment boundaries used for payload_segment, so timestamps can be rendered. */
  segments?: Array<{ id: string; start: number; end: number }>;
}

// ───────────────────────── 5. Reader state ─────────────────────────

export type FeedbackAction = "read" | "skip";

export interface FeedbackEntry {
  url: string;
  title: string;
  topic?: Topic;
  action: FeedbackAction;
  at: number;
}

export interface TopicCount {
  topic: Topic;
  count: number;
  lastSeen: number;
}

export interface ReaderState {
  /** Bumps whenever goals change. Part of every cache key. */
  version: number;
  /** Free text typed by the user in options. */
  goals: string;
  /** Rolling window; see config.TOPIC_WINDOW_DAYS. */
  topics: TopicCount[];
  /** Capped; see config.FEEDBACK_LOG_MAX. */
  feedback: FeedbackEntry[];
}

/** What actually goes into Jev state. Built by readerState.summarizeForState(); ≤ ~600 tokens. */
export interface ReaderStateSummary {
  goals: string;
  frequent_topics: Topic[];
  recently_read_titles: string[];
  recently_skipped_titles: string[];
}

// ───────────────────────── 6. Verdict + CardModel ─────────────────────────

export interface Verdict {
  label: VerdictLabel;
  /** Probability Jev assigned to `label`, or a rule-derived value in [0,1]. */
  confidence: number;
  /** Template-rendered strings keyed to answers. Never model prose. */
  reasons: string[];
  /** Which thresholds fired, for eval and debugging. */
  firedRules: string[];
}

export interface PayloadTimestamp {
  start: number;
  end: number;
  /** e.g. "core idea" */
  label: string;
}

export interface CardModel {
  url: string;
  title: string;
  kind: "article" | "video";
  depth: JudgmentDepth;
  verdict: Verdict;
  insightDensity: number; // 1..10
  alreadyKnown: number; // 0..1
  contentType: ContentType;
  contentTypeConfidence: number;
  claimsSupported: number;
  undisclosedSalesPitch: number;
  aiWritten: number;
  payloadLocation: PayloadLocation;
  payloadTimestamps?: PayloadTimestamp[];
  readingMinutes?: number;
  durationSec?: number;
  fromCache: boolean;
  judgedAt: number;
}

// ───────────────────────── 7. Settings ─────────────────────────

import type { Thresholds } from "./config";

export interface Settings {
  pageMode: boolean;
  feedMode: boolean;
  feedSites: Record<FeedAdapterId, boolean>;
  /** Hostnames where nothing runs. Seeded from config.DEFAULT_EXCLUDED_HOSTS. */
  excludedHosts: string[];
  /** Fetch linked pages to judge on body text instead of title+snippet. Needs optional <all_urls>. */
  prefetchLinkText: boolean;
  thresholds: Thresholds;
}

// ───────────────────────── 8. Message protocol ─────────────────────────

/** Content script → service worker. Reply type is `ResponseFor<M>`. */
export type ContentMessage =
  | { type: "JUDGE_PAGE"; content: ExtractedContent }
  | { type: "JUDGE_FEED"; pageUrl: string; adapter: FeedAdapterId; items: FeedItem[] }
  | { type: "FEED_CANCEL"; pageUrl: string; urls: string[] }
  | { type: "FEEDBACK"; url: string; title: string; action: FeedbackAction }
  | { type: "GET_SETTINGS" }
  | { type: "GET_STATUS" };

export type JudgeErrorCode =
  | "no_key"
  | "excluded_host"
  | "disabled"
  | "content_too_short"
  | "jev_error"
  | "internal";

export interface JudgeError {
  code: JudgeErrorCode;
  message: string;
  jev?: JevError;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: JudgeError };

export interface FeedResult {
  /** Keyed by FeedItem.url. Missing key = cancelled or dropped. */
  cards: Record<string, Result<CardModel>>;
  usage: JevUsage;
  cacheHits: number;
}

export interface Status {
  hasKey: boolean;
  model: string;
  cacheEntries: number;
  readerStateVersion: number;
}

export type ResponseFor<M extends ContentMessage> = M extends { type: "JUDGE_PAGE" }
  ? Result<CardModel>
  : M extends { type: "JUDGE_FEED" }
    ? Result<FeedResult>
    : M extends { type: "FEED_CANCEL" }
      ? Result<null>
      : M extends { type: "FEEDBACK" }
        ? Result<null>
        : M extends { type: "GET_SETTINGS" }
          ? Result<Settings>
          : M extends { type: "GET_STATUS" }
            ? Result<Status>
            : never;

/** Onboarding/options page → service worker. */
export type PageMessage =
  | { type: "SET_KEY"; key: string } // verifies with a live call before storing
  | { type: "CLEAR_KEY" }
  | { type: "SET_SETTINGS"; settings: Settings }
  | { type: "SET_GOALS"; goals: string } // bumps readerState.version
  | { type: "CLEAR_CACHE" }
  | { type: "RESET_READER_STATE" }
  | { type: "GET_SETTINGS" }
  | { type: "GET_STATUS" };

export type PageResponseFor<M extends PageMessage> = M extends { type: "SET_KEY" }
  ? Result<{ model: string }>
  : M extends { type: "GET_SETTINGS" }
    ? Result<Settings>
    : M extends { type: "GET_STATUS" }
      ? Result<Status>
      : Result<null>;

/** Typed wrapper both sides use. Implemented in src/background/messaging.ts (agent A). */
export type SendMessage = <M extends ContentMessage | PageMessage>(
  msg: M,
) => Promise<M extends ContentMessage ? ResponseFor<M> : M extends PageMessage ? PageResponseFor<M> : never>;
