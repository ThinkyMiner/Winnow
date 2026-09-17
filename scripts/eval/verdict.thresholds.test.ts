// Rule-level tests for computeVerdict with DEFAULT_THRESHOLDS and hand-built Judgments.
import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "../../src/config";
import { computeVerdict } from "../../src/jev/verdict";
import type { ContentType, Judgment, JudgmentAnswers, VerdictLabel } from "../../src/types";

const choice = <T extends string>(c: T, confidence = 0.9) =>
  ({ choice: c, confidence, probabilities: { [c]: confidence } }) as { choice: T; confidence: number; probabilities: Partial<Record<T, number>> };

/** A dense, novel, on-goal original_research judgment; override to break one rule at a time. */
function mk(over: Partial<JudgmentAnswers> = {}, top: Partial<Judgment> = {}): Judgment {
  return {
    url: "https://x.example/a",
    title: "t",
    depth: "full",
    model: "jev-1.13.0",
    judgedAt: 0,
    readerStateVersion: 1,
    usage: { input_tokens: 0, output_tokens: 0 },
    readingMinutes: 6,
    answers: {
      insight_density: { score: 3.6, confidence: 0.8, levels: 5 }, // ≈ 9/10
      already_known_to_reader: 0.2,
      content_type: choice<ContentType>("original_research"),
      claims_supported: 0.9,
      undisclosed_sales_pitch: 0.05,
      ai_written: 0.1,
      payload_location: choice("evenly"),
      serves_reader_goals: 0.9,
      topic: choice("software_engineering"),
      jev_verdict: choice<VerdictLabel>("read_now", 0.85),
      ...over,
    },
    ...top,
  };
}
const T = DEFAULT_THRESHOLDS;

describe("computeVerdict rules", () => {
  it("high density + low known + goal fit → read_now", () => {
    expect(computeVerdict(mk(), T).label).toBe("read_now");
  });

  it("same quality but 40 minutes → save", () => {
    expect(computeVerdict(mk({}, { readingMinutes: 40 }), T).label).toBe("save");
  });

  it("rage_bait → skip", () => {
    const v = computeVerdict(mk({ content_type: choice<ContentType>("rage_bait"), jev_verdict: choice<VerdictLabel>("skip") }), T);
    expect(v.label).toBe("skip");
  });

  it("undisclosed sales pitch at/above threshold → skip", () => {
    const v = computeVerdict(mk({ undisclosed_sales_pitch: T.skip_min_sales_pitch }), T);
    expect(v.label).toBe("skip");
  });

  it("opinion with unsupported claims is downgraded from read_now", () => {
    const v = computeVerdict(
      mk({ content_type: choice<ContentType>("opinion"), claims_supported: T.skip_max_claims_supported - 0.1 }),
      T,
    );
    expect(v.label).not.toBe("read_now");
  });

  it("low density and already known → skip", () => {
    const v = computeVerdict(
      mk({ insight_density: { score: 0.4, confidence: 0.8, levels: 5 }, already_known_to_reader: 0.9, serves_reader_goals: 0.2 }),
      T,
    );
    expect(v.label).toBe("skip");
  });

  it("flags low confidence when jev_verdict probability is below min_confidence", () => {
    const v = computeVerdict(mk({ jev_verdict: choice<VerdictLabel>("read_now", T.min_confidence - 0.1) }), T);
    expect(v.confidence).toBeLessThan(T.min_confidence);
    expect(v.firedRules.some((r: string) => /confiden/i.test(r))).toBe(true);
  });

  it("always reports reasons and fired rules", () => {
    const v = computeVerdict(mk(), T);
    expect(v.reasons.length).toBeGreaterThan(0);
    expect(Array.isArray(v.firedRules)).toBe(true);
  });
});
