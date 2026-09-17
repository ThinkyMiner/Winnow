import { describe, expect, it } from "vitest";
import type { ArticleContent, JevAnswer, ReaderStateSummary, VideoContent } from "../../types";
import { buildFeedRequest, buildPageQuestions, buildPageState, capForBudget, FEED_QUESTION_IDS, parseAnswers } from "../questions";

const reader: ReaderStateSummary = { goals: "dense thinking", frequent_topics: [], recently_read_titles: [], recently_skipped_titles: [] };

describe("buildFeedRequest", () => {
  it("prefixes question ids with i<n>_ and references items[n]", () => {
    const { state, questions } = buildFeedRequest([{ url: "a", title: "A", snippet: "s" }, { url: "b", title: "B", text: "body" }], reader);
    expect(Object.keys(questions)).toHaveLength(2 * FEED_QUESTION_IDS.length);
    expect(questions.i1_content_type?.instructions).toContain("`items[1]`");
    expect(questions.i0_topic).toBeDefined();
    expect(questions.i0_claims_supported).toBeUndefined();
    expect((state as { items: unknown[] }).items).toEqual([{ title: "A", snippet: "s" }, { title: "B", text: "body" }]);
  });
});

describe("buildPageState", () => {
  it("gives a video with transcript segments, labels, and a payload_segment choice", () => {
    const video: VideoContent = {
      kind: "video",
      url: "https://youtube.com/watch?v=x",
      videoId: "x",
      title: "T",
      durationSec: 1200,
      transcript: Array.from({ length: 40 }, (_, i) => ({ start: i * 30, dur: 30, text: `line ${i}` })),
    };
    const { state, segments, ctx } = buildPageState(video, reader);
    const content = (state as { content: { segments: Array<{ id: string; start_label: string }>; text?: string } }).content;
    expect(content.segments).toHaveLength(8);
    expect(content.segments[1]).toMatchObject({ id: "s1", start_label: "2:30" });
    expect(content.text).toBeUndefined();
    expect(segments?.[7]).toEqual({ id: "s7", start: 1050, end: 1200 });
    expect(ctx.segmentCount).toBe(8);
    const qs = buildPageQuestions("video", ctx);
    expect(Object.keys((qs.payload_segment as { criteria: object }).criteria)).toEqual(segments!.map((s) => s.id));
    expect(qs.insight_density?.instructions).toContain("`content.segments`");
  });

  it("omits payload_segment for an article", () => {
    const qs = buildPageQuestions("article", {});
    expect(qs.payload_segment).toBeUndefined();
    expect(qs.claims_supported?.instructions).toContain("`content.text`");
  });
});

describe("capForBudget", () => {
  it("trims text fields to fit the budget", () => {
    const state = { items: [{ title: "a", text: "x".repeat(1000) }, { title: "b", text: "y".repeat(1000) }] };
    const q = buildFeedRequest([{ url: "a", title: "a" }], reader).questions;
    const qLen = JSON.stringify(q).length;
    const capped = capForBudget(state, q, qLen + 1000);
    expect(JSON.stringify(capped).length + qLen).toBeLessThanOrEqual(qLen + 1000);
    expect(capped.items[0]!.text.length).toBe(capped.items[1]!.text.length);
    expect(state.items[0]!.text).toHaveLength(1000); // input untouched
  });
});

describe("parseAnswers", () => {
  const noul = (n: number): JevAnswer => ({ type: "noul", noul: n });
  const choice = (c: string): JevAnswer => ({ type: "choice", choice: c, confidence: 0.9, probabilities: { [c]: 0.9 } });
  const feed: Record<string, JevAnswer> = {
    i2_insight_density: { type: "score", score: 3.1, confidence: 0.7, legend: { 0: "a", 1: "b", 2: "c", 3: "d", 4: "e" }, probabilities: {} },
    i2_already_known_to_reader: noul(0.2),
    i2_content_type: choice("opinion"),
    i2_undisclosed_sales_pitch: noul(0.1),
    i2_serves_reader_goals: noul(0.8),
    i2_topic: choice("science"),
    i2_jev_verdict: choice("read_now"),
  };
  it("parses a feed item with defaults for unasked questions", () => {
    const a = parseAnswers(feed, "i2_", {});
    expect(a.insight_density).toEqual({ score: 3.1, confidence: 0.7, levels: 5 });
    expect(a.claims_supported).toBe(0.5);
    expect(a.ai_written).toBe(0);
    expect(a.payload_location.choice).toBe("evenly");
    expect(a.payload_segment).toBeUndefined();
  });
  it("throws on missing and mistyped answers", () => {
    expect(() => parseAnswers(feed, "", {})).toThrow(/missing answer "insight_density"/);
    expect(() => parseAnswers({ ...feed, i2_topic: noul(0.5) }, "i2_", {})).toThrow(/expected choice/);
    expect(() => parseAnswers({ ...feed, i2_topic: choice("cooking") }, "i2_", {})).toThrow(/unknown option/);
  });
});

describe("article state", () => {
  it("carries byline, site, reading_minutes", () => {
    const art: ArticleContent = { kind: "article", url: "u", title: "T", text: "body", wordCount: 1, readingMinutes: 3, byline: "B", siteName: "S", readabilityHit: true };
    expect((buildPageState(art, reader).state as { content: object }).content).toEqual({ kind: "article", title: "T", text: "body", byline: "B", site: "S", reading_minutes: 3 });
  });
});
