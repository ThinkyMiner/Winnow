// Question specs, state builders, answer parser. Pure: no chrome.*, runs in Node for the eval harness.
import { MAX_TRANSCRIPT_CHARS, VIDEO_SEGMENTS } from "../config";
import {
  CONTENT_TYPES,
  PAYLOAD_LOCATIONS,
  QUESTION_IDS,
  TOPICS,
  VERDICT_LABELS,
  type ChoiceAnswer,
  type ExtractedContent,
  type FeedItem,
  type JevAnswer,
  type JevQuestion,
  type JevState,
  type JsonValue,
  type Judgment,
  type JudgmentAnswers,
  type QuestionBuildContext,
  type QuestionId,
  type QuestionSpec,
  type ReaderStateSummary,
  type TranscriptSegment,
} from "../types";

/** 64k tokens for state + questions (contract). 4 chars ≈ 1 token. */
export const MAX_REQUEST_CHARS = 64_000 * 4;

const PAGE = ["article", "video"] as const;
const ALL = ["article", "video", "feed"] as const;

/** Page mode: `content.text` (or `content.segments` for a video with transcript). Feed: the whole `items[n]`. */
const body = (path: string, ctx: QuestionBuildContext) =>
  path ? `\`${path}\`` : ctx.segmentCount ? "`content.segments`" : "`content.text`";
const item = (path: string) => (path ? `\`${path}\`` : "`content`");

const CONTENT_TYPE_CRITERIA: Record<(typeof CONTENT_TYPES)[number], string> = {
  original_research: "Reports new data, experiments, or first-hand investigation the author carried out",
  opinion: "Argues a position or interpretation; may cite others' work as support",
  news: "Reports a recent event or announcement without arguing for a position",
  tutorial: "Teaches how to do something step by step",
  listicle: "A numbered or bulleted list of loosely related tips or items",
  rage_bait:
    "Built to provoke: outrage framing, us-vs-them language, or an engagement-bait headline that overstates the body",
  advertorial: "Promotes a product, service, or company while presenting itself as editorial content",
  entertainment: "Exists to amuse or tell a story; does not try to inform or persuade",
};

const PAYLOAD_CRITERIA: Record<(typeof PAYLOAD_LOCATIONS)[number], string> = {
  intro: "In the opening paragraphs; the rest elaborates or repeats",
  middle: "In the middle; the opening is setup and the end is wrap-up",
  end: "Near the end; the reader must get through setup first",
  evenly: "Spread throughout; no single section carries it",
};

const VERDICT_CRITERIA: Record<(typeof VERDICT_LABELS)[number], string> = {
  read_now: "Dense, new to this reader, and serves `reader.goals`; worth reading in full now",
  skim: "Some value but padded, partly familiar, or only loosely related to `reader.goals`; skim for the payload",
  save: "Valuable and relevant to `reader.goals` but long or demanding; better read later with time set aside",
  skip: "Generic, already known to this reader, promotional, or rage-bait; not worth the time",
};

const nulls = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, null]));

export const QUESTIONS: Record<QuestionId, QuestionSpec> = {
  insight_density: {
    id: "insight_density",
    appliesTo: ALL,
    build: (p, ctx) => ({
      type: "score",
      instructions: `How much specific, non-obvious, well-supported insight does ${body(p, ctx)} contain?`,
      criteria: [
        "Generic; nothing a casual reader wouldn't already assume",
        "Mostly generic; one mildly useful point buried in filler",
        "Moderate; one or two specific ideas, thinly supported",
        "Good; several specific ideas, most backed by evidence or examples",
        "Dense; several specific, non-obvious, well-supported ideas",
      ],
    }),
  },
  already_known_to_reader: {
    id: "already_known_to_reader",
    appliesTo: ALL,
    build: (p, ctx) => ({
      type: "noul",
      instructions: `Would a reader with the goals in \`reader.goals\`, who often reads \`reader.frequent_topics\` and recently read \`reader.recently_read_titles\`, already know the main idea of ${body(p, ctx)}?`,
      criteria: {
        true: "The main idea is standard knowledge for someone with that reading history, or restates a recently read title",
        false: "The main idea would be new to that reader, or lies outside their frequent topics",
      },
    }),
  },
  content_type: {
    id: "content_type",
    appliesTo: ALL,
    build: (p, ctx) => ({
      type: "choice",
      instructions: `What kind of content is ${body(p, ctx)}?`,
      criteria: CONTENT_TYPE_CRITERIA,
    }),
  },
  claims_supported: {
    id: "claims_supported",
    appliesTo: PAGE,
    build: (p, ctx) => ({
      type: "noul",
      instructions: `Are the main factual claims in ${body(p, ctx)} supported by cited sources, data, or worked examples within the text?`,
      criteria: {
        true: "Most key claims point to a named source, dataset, or worked example present in the text",
        false: "Key claims are asserted without sources, data, or examples",
      },
    }),
  },
  undisclosed_sales_pitch: {
    id: "undisclosed_sales_pitch",
    appliesTo: ALL,
    build: (p, ctx) => ({
      type: "noul",
      instructions: `Does ${body(p, ctx)} steer the reader toward buying or signing up for a specific product or service without disclosing that it is promotional?`,
      criteria: {
        true: "Recommends or links a specific product or service the author benefits from, with no sponsorship or affiliate disclosure",
        false: "No product push, or the promotion is clearly labelled as sponsored, affiliate, or the author's own product",
      },
    }),
  },
  ai_written: {
    id: "ai_written",
    appliesTo: PAGE,
    build: (p, ctx) => ({
      type: "noul",
      instructions: `Was ${body(p, ctx)} most likely generated by an AI language model rather than written by a person?`,
      criteria: {
        true: "Uniform paragraph rhythm, hedged generic phrasing, listicle scaffolding, absence of specifics or first-hand detail",
        false: "Uneven rhythm, concrete specifics, first-hand detail, an idiosyncratic voice",
      },
    }),
  },
  payload_location: {
    id: "payload_location",
    appliesTo: PAGE,
    build: (p, ctx) => ({
      type: "choice",
      instructions: `Where in ${body(p, ctx)} is the most valuable idea concentrated?`,
      criteria: PAYLOAD_CRITERIA,
    }),
  },
  payload_segment: {
    id: "payload_segment",
    appliesTo: ["video"],
    build: (_p, ctx) => ({
      type: "choice",
      instructions: "Which of `content.segments` contains the core idea or main payoff of the video?",
      criteria: nulls(Array.from({ length: ctx.segmentCount ?? 0 }, (_, i) => `s${i}`)),
    }),
  },
  serves_reader_goals: {
    id: "serves_reader_goals",
    appliesTo: ALL,
    build: (p) => ({
      type: "noul",
      instructions: `Does ${item(p)} directly serve the goals in \`reader.goals\`? If \`reader.goals\` is empty the goals are unspecified: answer whether ${item(p)} would interest a curious generalist who wants to learn something new.`,
      criteria: {
        true: "The main idea advances at least one stated goal (or, with no goals, teaches a generalist something new)",
        false: "Unrelated to the stated goals, or only tangentially related",
      },
    }),
  },
  topic: {
    id: "topic",
    appliesTo: ALL,
    build: (p) => ({
      type: "choice",
      instructions: `Which single topic best describes ${item(p)}?`,
      criteria: {
        ...nulls(TOPICS),
        consumer_tech_products: "Gadgets, apps, or devices reviewed or announced for consumers",
        productivity_selfhelp: "Advice on habits, focus, careers, or personal improvement",
        other: "None of the other topics fits",
      },
    }),
  },
  jev_verdict: {
    id: "jev_verdict",
    appliesTo: ALL,
    build: (p) => ({
      type: "choice",
      instructions: `For the reader described in \`reader\`, what should they do with ${item(p)}?`,
      criteria: VERDICT_CRITERIA,
    }),
  },
};

export const FEED_QUESTION_IDS: readonly QuestionId[] = QUESTION_IDS.filter((id) => QUESTIONS[id].appliesTo.includes("feed"));

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Split a transcript into ≤ VIDEO_SEGMENTS chunks of equal entry count; Jev cannot do time math, so labels are ours. */
export function segmentTranscript(t: TranscriptSegment[]): Array<{ id: string; start: number; end: number; text: string }> {
  if (!t.length) return [];
  const per = Math.ceil(t.length / VIDEO_SEGMENTS);
  const out: Array<{ id: string; start: number; end: number; text: string }> = [];
  for (let i = 0; i < t.length; i += per) {
    const chunk = t.slice(i, i + per);
    const first = chunk[0]!;
    const last = chunk[chunk.length - 1]!;
    out.push({ id: `s${out.length}`, start: first.start, end: last.start + last.dur, text: chunk.map((x) => x.text).join(" ") });
  }
  // ponytail: per-segment char cap truncates each segment's tail; good enough for "where is the payload".
  const cap = Math.floor(MAX_TRANSCRIPT_CHARS / out.length);
  return out.map((s) => (s.text.length > cap ? { ...s, text: s.text.slice(0, cap) } : s));
}

export function buildPageState(
  content: ExtractedContent,
  reader: ReaderStateSummary,
): { state: JevState; segments?: Judgment["segments"]; ctx: QuestionBuildContext } {
  const c: Record<string, JsonValue> = { kind: content.kind, title: content.title };
  const ctx: QuestionBuildContext = {};
  let segments: Judgment["segments"];
  if (content.kind === "article") {
    c.text = content.text;
    if (content.byline) c.byline = content.byline;
    if (content.siteName) c.site = content.siteName;
    c.reading_minutes = content.readingMinutes;
  } else {
    if (content.channel) c.byline = content.channel;
    c.site = "YouTube";
    if (content.durationSec) c.duration_minutes = Math.round(content.durationSec / 60);
    const segs = segmentTranscript(content.transcript ?? []);
    if (segs.length >= 2) {
      c.segments = segs.map((s) => ({ id: s.id, start_label: fmtTime(s.start), text: s.text }));
      segments = segs.map(({ id, start, end }) => ({ id, start, end }));
      ctx.segmentCount = segs.length;
    } else {
      c.text = segs[0]?.text ?? content.description ?? "";
    }
  }
  const state = capForBudget({ reader: { ...reader }, content: c }, buildPageQuestions(content.kind, ctx));
  return { state, segments, ctx };
}

export function buildPageQuestions(kind: "article" | "video", ctx: QuestionBuildContext): Record<string, JevQuestion> {
  const out: Record<string, JevQuestion> = {};
  for (const id of QUESTION_IDS) {
    const spec = QUESTIONS[id];
    if (!spec.appliesTo.includes(kind)) continue;
    if (id === "payload_segment" && (ctx.segmentCount ?? 0) < 2) continue;
    out[id] = spec.build("", ctx);
  }
  return out;
}

/** Feed batch: one state with `items[]`, question ids `i<n>_<QuestionId>`. */
export function buildFeedRequest(
  items: Array<FeedItem & { text?: string }>,
  reader: ReaderStateSummary,
): { state: JevState; questions: Record<string, JevQuestion> } {
  const state = {
    reader: { ...reader },
    items: items.map((it) => {
      const o: Record<string, JsonValue> = { title: it.title };
      if (it.snippet) o.snippet = it.snippet;
      if (it.text) o.text = it.text;
      return o;
    }),
  };
  const questions: Record<string, JevQuestion> = {};
  items.forEach((_, n) => {
    for (const id of FEED_QUESTION_IDS) questions[`i${n}_${id}`] = QUESTIONS[id].build(`items[${n}]`, {});
  });
  return { state: capForBudget(state, questions), questions };
}

/**
 * Trim every `text` field in `state` proportionally so state + questions fit `maxChars`.
 * ponytail: 4 chars/token estimate; config caps (24k article, 1.2k/feed item) keep us far below the
 * 64k limit, so this is a safety net, not a tokenizer. The 32k "state + longest question" limit is
 * implied by staying under half of 64k for state, which the caps also guarantee.
 */
export function capForBudget<S extends JevState>(state: S, questions: Record<string, JevQuestion>, maxChars = MAX_REQUEST_CHARS): S {
  const total = JSON.stringify(state).length + JSON.stringify(questions).length;
  if (total <= maxChars) return state;
  const clone = JSON.parse(JSON.stringify(state)) as S;
  const holders: Array<Record<string, JsonValue>> = [];
  const walk = (v: JsonValue) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if (typeof v.text === "string") holders.push(v);
      Object.values(v).forEach(walk);
    }
  };
  walk(clone as JsonValue);
  const textChars = holders.reduce((n, h) => n + (h.text as string).length, 0);
  if (!textChars) return clone;
  const keep = Math.max(0, textChars - (total - maxChars)) / textChars;
  for (const h of holders) h.text = (h.text as string).slice(0, Math.floor((h.text as string).length * keep));
  return clone;
}

const FEED_SET: ReadonlySet<string> = new Set(FEED_QUESTION_IDS);

/**
 * Typed parse of a Jev answer map. Throws on a missing or mistyped answer.
 * `prefix` "" means page mode (full set); `i<n>_` means a feed batch (reduced set), where
 * unasked answers get neutral defaults that fire no rule.
 */
export function parseAnswers(answers: Record<string, JevAnswer>, prefix: string, ctx: QuestionBuildContext): JudgmentAnswers {
  const feed = prefix !== "";
  const asked = (id: QuestionId) =>
    id === "payload_segment" ? !feed && (ctx.segmentCount ?? 0) >= 2 : !feed || FEED_SET.has(id);
  const get = (id: QuestionId): JevAnswer => {
    const a = answers[prefix + id];
    if (!a) throw new Error(`missing answer "${prefix + id}"`);
    return a;
  };
  const noul = (id: QuestionId): number => {
    const a = get(id);
    if (a.type !== "noul") throw new Error(`answer "${prefix + id}" is ${a.type}, expected noul`);
    return a.noul;
  };
  const choice = <T extends string>(id: QuestionId, options: readonly T[]): ChoiceAnswer<T> => {
    const a = get(id);
    if (a.type !== "choice") throw new Error(`answer "${prefix + id}" is ${a.type}, expected choice`);
    if (!(options as readonly string[]).includes(a.choice)) throw new Error(`answer "${prefix + id}": unknown option "${a.choice}"`);
    const probabilities: Partial<Record<T, number>> = {};
    for (const o of options) if (typeof a.probabilities[o] === "number") probabilities[o] = a.probabilities[o];
    return { choice: a.choice as T, confidence: a.confidence, probabilities };
  };
  const score = (id: QuestionId) => {
    const a = get(id);
    if (a.type !== "score") throw new Error(`answer "${prefix + id}" is ${a.type}, expected score`);
    return { score: a.score, confidence: a.confidence, levels: Object.keys(a.legend).length };
  };
  const segmentIds = Array.from({ length: ctx.segmentCount ?? 0 }, (_, i) => `s${i}`);
  return {
    insight_density: score("insight_density"),
    already_known_to_reader: noul("already_known_to_reader"),
    content_type: choice("content_type", CONTENT_TYPES),
    claims_supported: asked("claims_supported") ? noul("claims_supported") : 0.5,
    undisclosed_sales_pitch: noul("undisclosed_sales_pitch"),
    ai_written: asked("ai_written") ? noul("ai_written") : 0,
    payload_location: asked("payload_location")
      ? choice("payload_location", PAYLOAD_LOCATIONS)
      : { choice: "evenly", confidence: 0, probabilities: {} },
    ...(asked("payload_segment") ? { payload_segment: choice("payload_segment", segmentIds) } : {}),
    serves_reader_goals: noul("serves_reader_goals"),
    topic: choice("topic", TOPICS),
    jev_verdict: choice("jev_verdict", VERDICT_LABELS),
  };
}
