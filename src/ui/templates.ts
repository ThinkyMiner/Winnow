/** Every user-visible string. Keyed to typed answers; never model prose. */
import type { ContentType, JudgeErrorCode, PayloadLocation, VerdictLabel } from "../types";

export const VERDICT_TEXT: Record<VerdictLabel, { label: string; short: string; color: string }> = {
  read_now: { label: "Read now", short: "GO", color: "var(--wi-go)" },
  skim: { label: "Skim", short: "~", color: "var(--wi-skim)" },
  save: { label: "Save", short: "SAVE", color: "var(--wi-save)" },
  skip: { label: "Skip", short: "SKIP", color: "var(--wi-skip)" },
};

export const CONTENT_TYPE_TEXT: Record<ContentType, string> = {
  original_research: "Original research",
  opinion: "Opinion",
  news: "News",
  tutorial: "Tutorial",
  listicle: "Listicle",
  rage_bait: "Rage bait",
  advertorial: "Advertorial",
  entertainment: "Entertainment",
};

export const PAYLOAD_LOCATION_TEXT: Record<PayloadLocation, string> = {
  intro: "In the intro",
  middle: "In the middle",
  end: "At the end",
  evenly: "Spread evenly",
};

export const ERROR_TEXT: Record<JudgeErrorCode, string> = {
  no_key: "Add your Jev key in Worth It options",
  excluded_host: "Worth It is off on this site",
  disabled: "Worth It is turned off",
  content_too_short: "Not enough text to judge",
  jev_error: "Jev couldn't judge this",
  internal: "Something went wrong in Worth It",
};

export const pct = (p: number): string => `${Math.round(p * 100)}%`;

export function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export const minutesText = (m: number): string => (m < 1 ? "<1 min" : `${Math.round(m)} min`);

export const confidenceText = (c: number): "high" | "medium" | "low" =>
  c >= 0.8 ? "high" : c >= 0.5 ? "medium" : "low";
