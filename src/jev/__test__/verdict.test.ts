import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS as T } from "../../config";
import type { Judgment, JudgmentAnswers } from "../../types";
import { computeVerdict, densityDisplay, toCardModel } from "../verdict";

const base: JudgmentAnswers = {
  insight_density: { score: 3.5, confidence: 0.8, levels: 5 }, // 9/10
  already_known_to_reader: 0.2,
  content_type: { choice: "original_research", confidence: 0.9, probabilities: { original_research: 0.9 } },
  claims_supported: 0.8,
  undisclosed_sales_pitch: 0.05,
  ai_written: 0.1,
  payload_location: { choice: "middle", confidence: 0.6, probabilities: { middle: 0.6 } },
  serves_reader_goals: 0.85,
  topic: { choice: "science", confidence: 0.9, probabilities: { science: 0.9 } },
  jev_verdict: { choice: "read_now", confidence: 0.7, probabilities: { read_now: 0.7, skim: 0.2, save: 0.05, skip: 0.05 } },
};
const judgment = (over: Partial<JudgmentAnswers> = {}, rest: Partial<Judgment> = {}): Judgment => ({
  url: "https://example.com/a",
  title: "A",
  depth: "full",
  model: "jev-1.13.0",
  judgedAt: 0,
  readerStateVersion: 1,
  answers: { ...base, ...over },
  usage: { input_tokens: 100, output_tokens: 10 },
  readingMinutes: 8,
  ...rest,
});

describe("densityDisplay", () => {
  it("maps 0..4 to 1..10 and clamps", () => {
    expect(densityDisplay({ score: 0, confidence: 1, levels: 5 })).toBe(1);
    expect(densityDisplay({ score: 4, confidence: 1, levels: 5 })).toBe(10);
    expect(densityDisplay({ score: 2, confidence: 1, levels: 5 })).toBe(6);
    expect(densityDisplay({ score: 9, confidence: 1, levels: 5 })).toBe(10);
    expect(densityDisplay({ score: -1, confidence: 1, levels: 5 })).toBe(1);
  });
});

describe("computeVerdict rules", () => {
  it("read_now when dense, new, on-goal", () => {
    const v = computeVerdict(judgment(), T);
    expect(v.label).toBe("read_now");
    expect(v.firedRules).toEqual(["read_now"]);
    expect(v.confidence).toBe(0.7);
    expect(v.reasons).toContain("Insight density 9/10");
    expect(v.reasons).toContain("Serves your goals (85%)");
    expect(v.reasons).toContain("~8 min read");
  });
  it("save instead of read_now when long", () => {
    const v = computeVerdict(judgment({}, { readingMinutes: 30 }), T);
    expect(v.label).toBe("save");
    expect(v.firedRules).toContain("read_now_long_save");
  });
  it("uses durationSec for videos", () => {
    const v = computeVerdict(judgment({}, { readingMinutes: undefined, durationSec: 40 * 60 }), T);
    expect(v.label).toBe("save");
    expect(v.reasons).toContain("~40 min watch");
  });
  it("skips rage bait / advertorial with confidence >= 0.6", () => {
    const v = computeVerdict(judgment({ content_type: { choice: "rage_bait", confidence: 0.7, probabilities: {} } }), T);
    expect(v.label).toBe("skip");
    expect(v.firedRules[0]).toBe("content_type_rage_bait");
    expect(v.reasons[0]).toBe("Reads as rage bait (70%)");
    const low = computeVerdict(judgment({ content_type: { choice: "advertorial", confidence: 0.5, probabilities: {} } }), T);
    expect(low.firedRules[0]).not.toBe("content_type_advertorial");
  });
  it("skips a sales pitch", () => {
    const v = computeVerdict(judgment({ undisclosed_sales_pitch: 0.74 }), T);
    expect(v.label).toBe("skip");
    expect(v.reasons[0]).toBe("Likely a sales pitch (74%)");
  });
  it("skips already-known", () => {
    const v = computeVerdict(judgment({ already_known_to_reader: 0.85 }), T);
    expect(v.label).toBe("skip");
    expect(v.reasons[0]).toBe("You likely know this already (85%)");
  });
  it("skips low density", () => {
    const v = computeVerdict(judgment({ insight_density: { score: 0.5, confidence: 0.9, levels: 5 } }), T);
    expect(v.label).toBe("skip");
    expect(v.firedRules).toContain("low_density");
    expect(v.reasons[0]).toBe("Insight density 2/10");
  });
  it("skips AI-written mid-density", () => {
    const v = computeVerdict(judgment({ ai_written: 0.88, insight_density: { score: 2, confidence: 0.9, levels: 5 } }), T);
    expect(v.label).toBe("skip");
    expect(v.reasons[0]).toBe("Probably AI-written (88%)");
    const dense = computeVerdict(judgment({ ai_written: 0.88 }), T);
    expect(dense.label).toBe("read_now");
  });
  it("downgrades unsupported opinion one step", () => {
    const v = computeVerdict(judgment({ content_type: { choice: "opinion", confidence: 0.9, probabilities: {} }, claims_supported: 0.1 }), T);
    expect(v.label).toBe("skim");
    expect(v.firedRules.slice(0, 2)).toEqual(["read_now", "unsupported_claims"]);
    const mid = computeVerdict(
      judgment({
        content_type: { choice: "news", confidence: 0.9, probabilities: {} },
        claims_supported: 0.1,
        serves_reader_goals: 0.2,
        jev_verdict: { choice: "skim", confidence: 0.6, probabilities: { skim: 0.6 } },
      }),
      T,
    );
    expect(mid.label).toBe("skip");
  });
  it("middle zone: long + on-goal + density>=5 -> save; else Jev tie-break; else skim", () => {
    const mid = { score: 2.5, confidence: 0.8, levels: 5 }; // 7 -> but knownness blocks read_now
    expect(computeVerdict(judgment({ insight_density: mid, already_known_to_reader: 0.6 }, { readingMinutes: 30 }), T).label).toBe("save");
    const tie = computeVerdict(judgment({ insight_density: mid, already_known_to_reader: 0.6, jev_verdict: { choice: "skip", confidence: 0.8, probabilities: { skip: 0.8 } } }), T);
    expect(tie.label).toBe("skip");
    expect(tie.firedRules).toContain("jev_tiebreak");
    const dflt = computeVerdict(judgment({ insight_density: mid, already_known_to_reader: 0.6, jev_verdict: { choice: "skip", confidence: 0.3, probabilities: {} } }), T);
    expect(dflt.label).toBe("skim");
    expect(dflt.firedRules).toContain("default_skim");
  });
  it("flags low_confidence but keeps the label", () => {
    const v = computeVerdict(judgment({ jev_verdict: { choice: "skip", confidence: 0.4, probabilities: { read_now: 0.1, skip: 0.4 } } }), T);
    expect(v.label).toBe("read_now");
    expect(v.confidence).toBe(0.1);
    expect(v.firedRules).toContain("low_confidence");
  });
  it("derives confidence from rule inputs when Jev has no probability for the label", () => {
    const v = computeVerdict(judgment({ undisclosed_sales_pitch: 0.9, jev_verdict: { choice: "read_now", confidence: 0.7, probabilities: { read_now: 0.7 } } }), T);
    expect(v.label).toBe("skip");
    expect(v.confidence).toBeCloseTo(0.8);
  });
});

describe("toCardModel", () => {
  const segs = [
    { id: "s0", start: 0, end: 840 },
    { id: "s1", start: 840, end: 1170 },
    { id: "s2", start: 1170, end: 1500 },
  ];
  it("renders payload timestamps and the core-idea reason", () => {
    const j = judgment(
      { payload_segment: { choice: "s1", confidence: 0.6, probabilities: { s0: 0.1, s1: 0.6, s2: 0.3 } } },
      { url: "https://youtube.com/watch?v=1", readingMinutes: undefined, durationSec: 1500, segments: segs },
    );
    const v = computeVerdict(j, T);
    expect(v.reasons).toContain("Core idea at 14:00–19:30");
    const c = toCardModel(j, v, true);
    expect(c.kind).toBe("video");
    expect(c.fromCache).toBe(true);
    expect(c.payloadTimestamps).toEqual([
      { start: 840, end: 1170, label: "core idea" },
      { start: 1170, end: 1500, label: "also" },
    ]);
    expect(c.insightDensity).toBe(9);
    expect(c.contentType).toBe("original_research");
  });
  it("omits the runner-up below 0.25 and timestamps for articles", () => {
    const j = judgment({ payload_segment: { choice: "s0", confidence: 0.9, probabilities: { s0: 0.9, s1: 0.1 } } }, { segments: segs });
    expect(toCardModel(j, computeVerdict(j, T), false).payloadTimestamps).toHaveLength(1);
    const art = toCardModel(judgment(), computeVerdict(judgment(), T), false);
    expect(art.kind).toBe("article");
    expect(art.payloadTimestamps).toBeUndefined();
  });
});
