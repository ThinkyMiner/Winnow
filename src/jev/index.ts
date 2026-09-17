// Judgment engine public surface. The service worker imports exactly this.
import { FEED_BATCH_SIZE, JEV_MODEL, JEV_MODELS_ENDPOINT, MAX_FEED_ITEM_CHARS, MIN_ARTICLE_WORDS } from "../config";
import type {
  CardModel,
  ExtractedContent,
  FeedAdapterId,
  FeedItem,
  FeedResult,
  JevUsage,
  Judgment,
  JudgmentDepth,
  Result,
  Settings,
} from "../types";
import { cache } from "./cache";
import { callJev, errorFromResponse, jevFail } from "./client";
import { buildFeedRequest, buildPageQuestions, buildPageState, parseAnswers } from "./questions";
import { readerState, summarizeForState } from "./readerState";
import { computeVerdict, toCardModel } from "./verdict";

export { cache, readerState };
export { callJev } from "./client";
export { buildFeedRequest, buildPageQuestions, buildPageState, parseAnswers, QUESTIONS } from "./questions";
export { computeVerdict, densityDisplay, toCardModel } from "./verdict";
export { summarizeForState } from "./readerState";
export { cacheKey } from "./cache";

export interface JudgeContext {
  apiKey: string;
  settings: Settings;
}

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (code: "content_too_short" | "internal", message: string): Result<never> => ({ ok: false, error: { code, message } });
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const card = (j: Judgment, ctx: JudgeContext, fromCache: boolean) =>
  toCardModel(j, computeVerdict(j, ctx.settings.thresholds), fromCache);

/** $0.042 per million input tokens; output tokens are free (contract). */
export const estimateCostUsd = (usage: JevUsage): number => (usage.input_tokens * 0.042) / 1e6;

export async function judgePage(content: ExtractedContent, ctx: JudgeContext): Promise<Result<CardModel>> {
  let depth: JudgmentDepth = "full";
  if (content.kind === "article") {
    if (words(content.text) < MIN_ARTICLE_WORDS) return fail("content_too_short", `fewer than ${MIN_ARTICLE_WORDS} words`);
  } else if (!content.transcript?.length) {
    if ((content.description ?? "").length < 200) return fail("content_too_short", "no transcript and description under 200 chars");
    depth = "snippet";
  }
  const rs = await readerState.get();
  const hit = await cache.get(content.url, depth, rs.version);
  if (hit) return ok(card(hit, ctx, true));

  const { state, segments, ctx: qctx } = buildPageState(content, summarizeForState(rs));
  const res = await callJev({ model: JEV_MODEL, state, questions: buildPageQuestions(content.kind, qctx) }, ctx.apiKey);
  if (!res.ok) return res;
  let answers;
  try {
    answers = parseAnswers(res.value.answers, "", qctx);
  } catch (e) {
    return jevFail({ kind: "malformed_response", message: (e as Error).message });
  }
  const judgment: Judgment = {
    url: content.url,
    title: content.title,
    depth,
    model: res.value.model,
    judgedAt: Date.now(),
    readerStateVersion: rs.version,
    answers,
    usage: res.value.usage,
    readingMinutes: content.kind === "article" ? content.readingMinutes : undefined,
    durationSec: content.kind === "video" ? content.durationSec : undefined,
    segments,
  };
  await Promise.all([cache.set(judgment), readerState.recordTopic(answers.topic.choice)]);
  return ok(card(judgment, ctx, false));
}

/** In-flight prefetches by url, and urls cancelled while a feed call was running. */
const inflight = new Map<string, AbortController>();
const cancelled = new Set<string>();

export function cancelFeed(urls: string[]): void {
  for (const u of urls) {
    cancelled.add(u);
    inflight.get(u)?.abort();
  }
}

export async function judgeFeed(
  items: FeedItem[],
  _adapter: FeedAdapterId,
  ctx: JudgeContext,
  opts?: { prefetch?: (url: string, signal: AbortSignal) => Promise<string | undefined> },
): Promise<Result<FeedResult>> {
  const unique = [...new Map(items.map((it) => [it.url, it])).values()];
  for (const it of unique) cancelled.delete(it.url); // a fresh request supersedes an old cancel
  const rs = await readerState.get();
  const cards: FeedResult["cards"] = {};
  const usage: JevUsage = { input_tokens: 0, output_tokens: 0 };

  const hits = await cache.getBatch(unique.map((it) => it.url), ["full", "snippet"], rs.version);
  for (const [url, j] of Object.entries(hits)) cards[url] = ok(card(j, ctx, true));
  const misses: Array<FeedItem & { text?: string }> = unique.filter((it) => !hits[it.url]);

  if (opts?.prefetch && misses.length) {
    const fetched = await Promise.allSettled(
      misses.map((it) => {
        const ac = new AbortController();
        inflight.set(it.url, ac);
        return opts.prefetch!(it.url, ac.signal).finally(() => inflight.delete(it.url));
      }),
    );
    fetched.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) misses[i]!.text = r.value.slice(0, MAX_FEED_ITEM_CHARS);
    });
  }

  const pending = misses.filter((it) => !cancelled.has(it.url));
  const reader = summarizeForState(rs);
  const chunks = Array.from({ length: Math.ceil(pending.length / FEED_BATCH_SIZE) }, (_, i) =>
    pending.slice(i * FEED_BATCH_SIZE, (i + 1) * FEED_BATCH_SIZE),
  );
  await Promise.all(
    chunks.map(async (chunk) => {
      const { state, questions } = buildFeedRequest(chunk, reader);
      const res = await callJev({ model: JEV_MODEL, state, questions }, ctx.apiKey);
      if (!res.ok) {
        for (const it of chunk) cards[it.url] = res; // partial failure: per-item, never whole-call
        return;
      }
      usage.input_tokens += res.value.usage.input_tokens;
      usage.output_tokens += res.value.usage.output_tokens;
      const share: JevUsage = {
        input_tokens: res.value.usage.input_tokens / chunk.length,
        output_tokens: res.value.usage.output_tokens / chunk.length,
      };
      const judged: Judgment[] = [];
      chunk.forEach((it, i) => {
        try {
          const answers = parseAnswers(res.value.answers, `i${i}_`, {});
          judged.push({
            url: it.url,
            title: it.title,
            depth: it.text && words(it.text) >= 400 ? "full" : "snippet",
            model: res.value.model,
            judgedAt: Date.now(),
            readerStateVersion: rs.version,
            answers,
            usage: share,
          });
        } catch (e) {
          cards[it.url] = jevFail({ kind: "malformed_response", message: (e as Error).message, requestId: undefined });
        }
      });
      await cache.set(...judged);
      for (const j of judged) cards[j.url] = ok(card(j, ctx, false));
    }),
  );
  for (const it of pending) cancelled.delete(it.url);
  return ok({ cards, usage, cacheHits: Object.keys(hits).length });
}

export async function verifyKey(apiKey: string): Promise<Result<{ model: string }>> {
  let res: Response;
  try {
    res = await fetch(JEV_MODELS_ENDPOINT, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    return jevFail({ kind: "network", message: (e as Error)?.message || String(e) });
  }
  if (!res.ok) return jevFail(await errorFromResponse(res));
  return ok({ model: JEV_MODEL });
}
