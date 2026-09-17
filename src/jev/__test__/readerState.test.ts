import { beforeEach, describe, expect, it } from "vitest";
import { FEEDBACK_LOG_MAX, READER_SUMMARY_MAX_CHARS } from "../../config";
import { readerState, summarizeForState } from "../readerState";
import { installChromeMock } from "./chromeMock";

beforeEach(() => installChromeMock());

describe("readerState", () => {
  it("bumps version only when goals change", async () => {
    expect((await readerState.get()).version).toBe(1);
    expect((await readerState.setGoals("learn Rust")).version).toBe(2);
    expect((await readerState.setGoals("learn Rust")).version).toBe(2);
    expect((await readerState.setGoals("learn Zig")).version).toBe(3);
    await readerState.reset();
    expect(await readerState.get()).toEqual({ version: 1, goals: "", topics: [], feedback: [] });
  });

  it("records topics and caps feedback", async () => {
    await readerState.recordTopic("science");
    await readerState.recordTopic("science");
    await readerState.recordTopic("math");
    expect((await readerState.get()).topics.map((t) => [t.topic, t.count])).toEqual([["science", 2], ["math", 1]]);
    for (let i = 0; i < FEEDBACK_LOG_MAX + 5; i++) await readerState.recordFeedback({ url: `u${i}`, title: `t${i}`, action: "read" });
    const fb = (await readerState.get()).feedback;
    expect(fb).toHaveLength(FEEDBACK_LOG_MAX);
    expect(fb[0]?.url).toBe("u5");
  });
});

describe("summarizeForState", () => {
  it("stays under budget with 200 long titles and long goals", () => {
    const now = Date.now();
    const s = summarizeForState({
      version: 1,
      goals: "g".repeat(2000),
      topics: [
        { topic: "math", count: 5, lastSeen: now },
        { topic: "gaming", count: 9, lastSeen: now },
        { topic: "history", count: 1, lastSeen: now - 40 * 86400_000 },
      ],
      feedback: Array.from({ length: 200 }, (_, i) => ({ url: `u${i}`, title: `Title ${i} ` + "x".repeat(300), action: i % 2 ? "read" : "skip", at: now - i })),
    });
    expect(JSON.stringify(s).length).toBeLessThanOrEqual(READER_SUMMARY_MAX_CHARS);
    expect(s.goals).toHaveLength(600);
    expect(s.frequent_topics).toEqual(["gaming", "math"]);
    expect(s.recently_read_titles.length).toBeLessThanOrEqual(8);
    expect(s.recently_read_titles[0]).toMatch(/^Title 199 /);
    expect(s.recently_read_titles[0]).toHaveLength(80);
  });
});
