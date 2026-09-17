import { MAX_TRANSCRIPT_CHARS } from "../config";
import type { TranscriptSegment, VideoContent } from "../types";

export function getVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host !== "youtube.com") return null;
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = /^\/(?:shorts|embed|live)\/([^/?]+)/.exec(u.pathname);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isYouTubeWatch(url: string): boolean {
  return getVideoId(url) !== null;
}

/** Extract the balanced `{...}` starting at `start`, honouring string literals and escapes. */
function balancedObject(s: string, start: number): string | null {
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function findPlayerResponse(doc: Document): Any | undefined {
  const w = doc.defaultView as Any;
  if (w?.ytInitialPlayerResponse?.videoDetails) return w.ytInitialPlayerResponse;
  for (const s of doc.querySelectorAll("script")) {
    const txt = s.textContent ?? "";
    const m = /ytInitialPlayerResponse\s*=\s*\{/.exec(txt);
    if (!m) continue;
    const json = balancedObject(txt, m.index + m[0].length - 1);
    if (!json) continue;
    try {
      return JSON.parse(json);
    } catch {
      /* try next script */
    }
  }
  return undefined;
}

export function parseJson3(json: Any): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  for (const ev of json?.events ?? []) {
    const text = (ev.segs ?? []).map((s: Any) => s.utf8 ?? "").join("");
    if (!text.trim()) continue;
    out.push({ start: (ev.tStartMs ?? 0) / 1000, dur: (ev.dDurationMs ?? 0) / 1000, text: text.trim() });
  }
  return out;
}

export function parseTimedTextXml(xml: string): TranscriptSegment[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const out: TranscriptSegment[] = [];
  for (const el of doc.querySelectorAll("text")) {
    const text = (el.textContent ?? "").trim();
    if (!text) continue;
    out.push({ start: Number(el.getAttribute("start") ?? 0), dur: Number(el.getAttribute("dur") ?? 0), text });
  }
  return out;
}

function pickTrack(tracks: Any[]): Any | undefined {
  const en = tracks.filter((t) => String(t.languageCode ?? "").startsWith("en"));
  return en.find((t) => t.kind !== "asr") ?? en[0] ?? tracks[0];
}

function capSegments(segs: TranscriptSegment[]): TranscriptSegment[] {
  let total = 0;
  for (let i = 0; i < segs.length; i++) {
    total += segs[i]!.text.length + 1;
    if (total > MAX_TRANSCRIPT_CHARS) return segs.slice(0, i);
  }
  return segs;
}

/**
 * Caption URLs embedded in the watch page are gated by a proof-of-origin token since 2025 and return an
 * empty 200 body when fetched directly (observed 2026-09-18). The InnerTube player endpoint, asked as the
 * iOS client, hands back ungated URLs. Same-origin from the content script; no extra permissions.
 */
export async function fetchCaptionTracks(videoId: string): Promise<Any[]> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: { client: { clientName: "IOS", clientVersion: "20.10.4", deviceModel: "iPhone16,2", hl: "en" } },
        videoId,
      }),
    });
    if (!res.ok) return [];
    const j: Any = await res.json();
    return j?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetches captions for the chosen track: json3 first, raw timedtext XML as fallback.
 * Returns undefined on any failure (no tracks, network error, unparsable body) —
 * the caller still returns a VideoContent, just without `transcript`.
 */
async function fetchTranscript(pr: Any, videoId: string): Promise<TranscriptSegment[] | undefined> {
  const pageTracks: Any[] = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const tracks = (await fetchCaptionTracks(videoId)).concat(pageTracks);
  const track = pickTrack(tracks);
  if (!track?.baseUrl) return undefined;
  try {
    const res = await fetch(track.baseUrl + "&fmt=json3");
    if (res.ok) {
      const segs = parseJson3(await res.json());
      if (segs.length) return capSegments(segs);
    }
  } catch {
    /* fall through to XML */
  }
  try {
    const res = await fetch(track.baseUrl);
    if (!res.ok) return undefined;
    const segs = parseTimedTextXml(await res.text());
    return segs.length ? capSegments(segs) : undefined;
  } catch {
    return undefined;
  }
}

export async function extractYouTube(doc: Document, url: string): Promise<VideoContent | null> {
  const videoId = getVideoId(url);
  if (!videoId) return null;
  try {
    let pr = findPlayerResponse(doc);
    // After YouTube SPA navigation the inline player response still describes the first-loaded video.
    if (pr?.videoDetails?.videoId && pr.videoDetails.videoId !== videoId) pr = undefined;
    const vd = pr?.videoDetails ?? {};
    const meta = (sel: string) => doc.querySelector(sel)?.getAttribute("content")?.trim() || undefined;
    const title =
      meta("meta[name=title]") ??
      meta('meta[property="og:title"]') ??
      vd.title ??
      doc.title.replace(/\s*-\s*YouTube\s*$/, "");
    const channel =
      doc.querySelector("link[itemprop=name]")?.getAttribute("content")?.trim() || vd.author || undefined;
    const durMeta = meta("meta[itemprop=duration]"); // ISO 8601, e.g. PT12M34S
    let durationSec = Number(vd.lengthSeconds) || undefined;
    if (!durationSec && durMeta) {
      const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(durMeta);
      if (m) durationSec = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) || undefined;
    }
    const description = typeof vd.shortDescription === "string" ? vd.shortDescription.slice(0, 1000) : undefined;
    const transcript = await fetchTranscript(pr, videoId);
    return { kind: "video", url, videoId, title, channel, durationSec, transcript, description };
  } catch {
    return null;
  }
}

/** Split a transcript into exactly n roughly equal time spans ("s0".."s{n-1}"); a span with no words has text "". */
export function segmentTranscript(
  t: TranscriptSegment[],
  n: number,
): Array<{ id: string; start: number; end: number; text: string }> {
  if (!t.length || n < 1) return [];
  const first = t[0]!;
  const last = t[t.length - 1]!;
  const t0 = first.start;
  const t1 = last.start + last.dur;
  const span = Math.max((t1 - t0) / n, 0.001);
  const buckets: string[][] = Array.from({ length: n }, () => []);
  for (const seg of t) buckets[Math.min(n - 1, Math.floor((seg.start - t0) / span))]!.push(seg.text);
  return buckets.map((texts, i) => ({
    id: `s${i}`,
    start: Math.round(t0 + i * span),
    end: Math.round(i === n - 1 ? t1 : t0 + (i + 1) * span),
    text: texts.join(" "),
  }));
}
