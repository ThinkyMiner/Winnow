// Pure: Judgment + Thresholds -> Verdict -> CardModel. Every string here is a template, never model prose.
import type { Thresholds } from "../config";
import type { CardModel, ContentType, Judgment, PayloadTimestamp, ScoreAnswer, Verdict, VerdictLabel } from "../types";
import { fmtTime } from "./questions";

/** 0..4 expected level index -> 1..10 display. A convenience, not a measurement (contract). */
export function densityDisplay(s: ScoreAnswer): number {
  const den = Math.max(1, s.levels - 1);
  return Math.min(10, Math.max(1, Math.round(1 + (s.score * 9) / den)));
}

const pct = (p: number) => `${Math.round(p * 100)}%`;
/** Noul confidence proxy (contract: nouls carry no confidence). */
const noulConf = (p: number) => Math.abs(p - 0.5) * 2;

const TYPE_LABEL: Record<ContentType, string> = {
  original_research: "original research",
  opinion: "opinion",
  news: "news",
  tutorial: "a tutorial",
  listicle: "a listicle",
  rage_bait: "rage bait",
  advertorial: "an advertorial",
  entertainment: "entertainment",
};

export function computeVerdict(j: Judgment, t: Thresholds): Verdict {
  const a = j.answers;
  const rules: string[] = [];
  const reasons: string[] = [];
  const contrib: number[] = [];
  const density = densityDisplay(a.insight_density);
  const ct = a.content_type;
  const minutes = j.readingMinutes ?? (j.durationSec != null ? j.durationSec / 60 : undefined);
  const long = minutes != null && minutes > t.save_min_minutes;
  const goalFit = a.serves_reader_goals >= t.read_now_min_goal_fit;
  let label: VerdictLabel | undefined;

  const fire = (rule: string, l: VerdictLabel, reason: string | undefined, ...c: number[]) => {
    label = l;
    rules.push(rule);
    if (reason) reasons.push(reason);
    contrib.push(...c);
  };

  if ((ct.choice === "rage_bait" || ct.choice === "advertorial") && ct.confidence >= 0.6) {
    fire(`content_type_${ct.choice}`, "skip", `Reads as ${TYPE_LABEL[ct.choice]} (${pct(ct.confidence)})`, ct.confidence);
  } else if (a.undisclosed_sales_pitch >= t.skip_min_sales_pitch) {
    fire("sales_pitch", "skip", `Likely a sales pitch (${pct(a.undisclosed_sales_pitch)})`, noulConf(a.undisclosed_sales_pitch));
  } else if (a.already_known_to_reader >= t.skip_min_known) {
    fire("already_known", "skip", `You likely know this already (${pct(a.already_known_to_reader)})`, noulConf(a.already_known_to_reader));
  } else if (density <= t.skip_max_density) {
    fire("low_density", "skip", `Insight density ${density}/10`, a.insight_density.confidence);
  } else if (a.ai_written >= t.skip_min_ai_written && density < t.read_now_min_density) {
    fire("ai_written", "skip", `Probably AI-written (${pct(a.ai_written)})`, noulConf(a.ai_written), a.insight_density.confidence);
  } else if (density >= t.read_now_min_density && a.already_known_to_reader <= t.read_now_max_known && goalFit) {
    fire(
      long ? "read_now_long_save" : "read_now",
      long ? "save" : "read_now",
      undefined,
      a.insight_density.confidence,
      noulConf(a.already_known_to_reader),
      noulConf(a.serves_reader_goals),
    );
  } else if (goalFit && density >= 5 && long) {
    fire("skim_long_save", "save", undefined, a.insight_density.confidence, noulConf(a.serves_reader_goals));
  } else if (a.jev_verdict.confidence >= 0.5) {
    // No threshold zone claimed this item; let Jev's own read break the tie.
    fire("jev_tiebreak", a.jev_verdict.choice, undefined, a.jev_verdict.confidence);
  } else {
    fire("default_skim", "skim", undefined, a.insight_density.confidence);
  }

  if ((ct.choice === "opinion" || ct.choice === "news") && a.claims_supported < t.skip_max_claims_supported && (label === "read_now" || label === "skim")) {
    fire("unsupported_claims", label === "read_now" ? "skim" : "skip", `Claims mostly unsupported (${pct(1 - a.claims_supported)})`, noulConf(a.claims_supported));
  }

  const final = label!;
  const mean = contrib.length ? contrib.reduce((x, y) => x + y, 0) / contrib.length : 0;
  const confidence = a.jev_verdict.probabilities[final] ?? mean;
  if (confidence < t.min_confidence) rules.push("low_confidence");

  // Always-on context lines, deduped against rule reasons.
  const extra = [
    `Insight density ${density}/10`,
    `Reads as ${TYPE_LABEL[ct.choice]} (${pct(ct.confidence)})`,
    goalFit ? `Serves your goals (${pct(a.serves_reader_goals)})` : undefined,
    payloadLine(j),
    minutes != null ? `~${Math.max(1, Math.round(minutes))} min ${j.readingMinutes != null ? "read" : "watch"}` : undefined,
  ];
  for (const r of extra) if (r && !reasons.includes(r)) reasons.push(r);

  return { label: final, confidence, reasons, firedRules: rules };
}

function payloadLine(j: Judgment): string | undefined {
  const [top] = payloadTimestamps(j) ?? [];
  return top ? `Core idea at ${fmtTime(top.start)}–${fmtTime(top.end)}` : undefined;
}

/** Top segment, plus a runner-up if Jev gave it ≥ 0.25. */
export function payloadTimestamps(j: Judgment): PayloadTimestamp[] | undefined {
  const ps = j.answers.payload_segment;
  if (!ps || !j.segments?.length) return undefined;
  const byId = new Map(j.segments.map((s) => [s.id, s]));
  const top = byId.get(ps.choice);
  if (!top) return undefined;
  const out: PayloadTimestamp[] = [{ start: top.start, end: top.end, label: "core idea" }];
  const runner = Object.entries(ps.probabilities)
    .filter(([id, p]) => id !== ps.choice && (p ?? 0) >= 0.25)
    .sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))[0];
  const second = runner && byId.get(runner[0]);
  if (second) out.push({ start: second.start, end: second.end, label: "also" });
  return out;
}

// ponytail: Judgment has no `kind`; infer from segments/duration/URL. Ask for `kind` on Judgment if this bites.
const isVideo = (j: Judgment) => !!j.segments || j.durationSec != null || /youtube\.com\/watch|youtu\.be\//.test(j.url);

export function toCardModel(j: Judgment, v: Verdict, fromCache: boolean): CardModel {
  const a = j.answers;
  return {
    url: j.url,
    title: j.title,
    kind: isVideo(j) ? "video" : "article",
    depth: j.depth,
    verdict: v,
    insightDensity: densityDisplay(a.insight_density),
    alreadyKnown: a.already_known_to_reader,
    contentType: a.content_type.choice,
    contentTypeConfidence: a.content_type.confidence,
    claimsSupported: a.claims_supported,
    undisclosedSalesPitch: a.undisclosed_sales_pitch,
    aiWritten: a.ai_written,
    payloadLocation: a.payload_location.choice,
    payloadTimestamps: payloadTimestamps(j),
    readingMinutes: j.readingMinutes,
    durationSec: j.durationSec,
    fromCache,
    judgedAt: j.judgedAt,
  };
}
