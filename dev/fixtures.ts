import type { CardModel } from "../src/types";

const base = { depth: "full" as const, fromCache: false, judgedAt: 1_758_150_000_000 };

export const FIXTURES: CardModel[] = [
  {
    ...base, kind: "article",
    url: "https://example.com/wal-fsync", title: "What fsync actually guarantees, and what Postgres does about it",
    verdict: { label: "read_now", confidence: 0.86, firedRules: ["read_now"], reasons: [
      "High insight density (8/10)", "Mostly new to you", "Fits your goals: databases", "Claims are well supported",
    ] },
    insightDensity: 8, alreadyKnown: 0.2, contentType: "original_research", contentTypeConfidence: 0.9,
    claimsSupported: 0.85, undisclosedSalesPitch: 0.05, aiWritten: 0.1, payloadLocation: "middle", readingMinutes: 9,
  },
  {
    ...base, kind: "article", fromCache: true,
    url: "https://example.com/ten-tips", title: "10 TypeScript tips every developer should know in 2026",
    verdict: { label: "skim", confidence: 0.62, firedRules: ["skim_default"], reasons: [
      "Medium insight density (5/10)", "You likely know half of this", "Payload spread evenly",
    ] },
    insightDensity: 5, alreadyKnown: 0.55, contentType: "listicle", contentTypeConfidence: 0.95,
    claimsSupported: 0.6, undisclosedSalesPitch: 0.1, aiWritten: 0.45, payloadLocation: "evenly", readingMinutes: 6,
  },
  {
    ...base, kind: "article",
    url: "https://example.com/transformers-survey", title: "A 40-page survey of efficient attention mechanisms",
    verdict: { label: "save", confidence: 0.78, firedRules: ["read_now", "save_long"], reasons: [
      "High insight density (9/10)", "Long read: 42 min", "Fits your goals: ai_ml",
    ] },
    insightDensity: 9, alreadyKnown: 0.3, contentType: "original_research", contentTypeConfidence: 0.88,
    claimsSupported: 0.9, undisclosedSalesPitch: 0.02, aiWritten: 0.15, payloadLocation: "end", readingMinutes: 42,
  },
  {
    ...base, kind: "article",
    url: "https://example.com/best-vpn", title: "Why every remote team needs this one productivity tool (sponsored)",
    verdict: { label: "skip", confidence: 0.91, firedRules: ["skip_sales_pitch", "skip_ai_written"], reasons: [
      "Undisclosed sales pitch (82%)", "Likely AI-written (88%)", "Low insight density (2/10)", "Claims poorly supported",
    ] },
    insightDensity: 2, alreadyKnown: 0.7, contentType: "advertorial", contentTypeConfidence: 0.93,
    claimsSupported: 0.2, undisclosedSalesPitch: 0.82, aiWritten: 0.88, payloadLocation: "intro", readingMinutes: 4,
  },
  {
    ...base, kind: "video",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "How CRDTs actually merge: a whiteboard walkthrough",
    verdict: { label: "read_now", confidence: 0.81, firedRules: ["read_now"], reasons: [
      "High insight density (7/10)", "Fits your goals: distributed systems", "Core idea is in the middle",
    ] },
    insightDensity: 7, alreadyKnown: 0.35, contentType: "tutorial", contentTypeConfidence: 0.87,
    claimsSupported: 0.75, undisclosedSalesPitch: 0.0, aiWritten: 0.05, payloadLocation: "middle", durationSec: 1460,
    payloadTimestamps: [
      { start: 372, end: 555, label: "core idea" },
      { start: 1102, end: 1285, label: "worked example" },
    ],
  },
  {
    ...base, kind: "article", depth: "snippet",
    url: "https://example.com/hot-take", title: "The real reason your standups are broken",
    verdict: { label: "skim", confidence: 0.34, firedRules: ["low_confidence", "skim_default"], reasons: [
      "Judged from title and snippet only", "Opinion piece",
    ] },
    insightDensity: 4, alreadyKnown: 0.5, contentType: "opinion", contentTypeConfidence: 0.5,
    claimsSupported: 0.4, undisclosedSalesPitch: 0.1, aiWritten: 0.3, payloadLocation: "end", readingMinutes: 5,
  },
];
