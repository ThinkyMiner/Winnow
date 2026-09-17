// Eval harness: judge every fixture with Jev, score against golden.json, suggest thresholds.
// Usage: pnpm eval [--no-cache] [--report-only] [--items id1,id2]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_THRESHOLDS, JEV_MODEL, THRESHOLD_META, type ThresholdKey, type Thresholds } from "../../src/config";
import { callJev } from "../../src/jev/client";
import { buildPageQuestions, buildPageState, parseAnswers } from "../../src/jev/questions";
import { summarizeForState } from "../../src/jev/readerState";
import { computeVerdict, densityDisplay } from "../../src/jev/verdict";
import {
  CONTENT_TYPES,
  VERDICT_LABELS,
  type ContentType,
  type ExtractedContent,
  type JevRequest,
  type JevResponse,
  type Judgment,
  type PayloadLocation,
  type ReaderState,
  type VerdictLabel,
} from "../../src/types";
import { accuracy, confusionMatrix, gridSearch, type Pair } from "./metrics";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CACHE_DIR = join(ROOT, ".eval-cache");
const USD_PER_MTOK = 0.042;

interface FixtureItem {
  id: string;
  content: ExtractedContent;
  notes: string;
}
interface GoldenItem {
  verdict: VerdictLabel;
  content_type: ContentType;
  insight_density_min?: number;
  insight_density_max?: number;
  already_known_max?: number;
  undisclosed_sales_pitch_min?: number;
  ai_written_min?: number;
  payload_location?: PayloadLocation;
  notes?: string;
}
interface Golden {
  reviewed: boolean;
  split: { tune: string[]; report: string[] };
  items: Record<string, GoldenItem>;
}

// ── args + env ──
const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const opt = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const noCache = flag("--no-cache");
const reportOnly = flag("--report-only");
const only = opt("--items")?.split(",").map((s) => s.trim()).filter(Boolean);

const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=", 2).map((s) => s.trim()) as [string, string]),
);
const apiKey = env.JEV_API_KEY;
if (!apiKey) throw new Error("JEV_API_KEY missing in .env");

// ── load fixtures ──
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const golden = readJson<Golden>(join(ROOT, "fixtures/golden.json"));
const reader = readJson<ReaderState>(join(ROOT, "fixtures/reader.json"));
const itemsDir = join(ROOT, "fixtures/items");
const items = readdirSync(itemsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => readJson<FixtureItem>(join(itemsDir, f)))
  .filter((it) => !only || only.includes(it.id));
if (items.length === 0) throw new Error("no fixture items matched");
for (const it of items) if (!golden.items[it.id]) throw new Error(`no golden for ${it.id}`);
if (!golden.reviewed) console.log("note: golden.json is marked reviewed:false — labels are unreviewed guesses.\n");

// ── judge ──
const summary = summarizeForState(reader);
const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

async function judge(it: FixtureItem): Promise<{ j: Judgment; cached: boolean }> {
  const { content } = it;
  const { state, segments, ctx } = buildPageState(content, summary);
  const questions = buildPageQuestions(content.kind, ctx);
  const req: JevRequest = { model: JEV_MODEL, state, questions };
  const hash = sha(JSON.stringify(req));
  const cachePath = join(CACHE_DIR, `${it.id}.json`);

  let resp: JevResponse | undefined;
  let cached = false;
  if (!noCache && existsSync(cachePath)) {
    const c = readJson<{ hash: string; response: JevResponse }>(cachePath);
    if (c.hash === hash) {
      resp = c.response;
      cached = true;
    }
  }
  if (!resp) {
    const r = await callJev(req, apiKey!);
    if (!r.ok) throw new Error(`${it.id}: jev ${r.error.code} ${r.error.message}`);
    resp = r.value;
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath, JSON.stringify({ hash, response: resp }, null, 2));
  }

  const j: Judgment = {
    url: content.url,
    title: content.title,
    depth: "full",
    model: resp.model,
    judgedAt: Date.now(),
    readerStateVersion: reader.version,
    answers: parseAnswers(resp.answers, "", ctx),
    usage: resp.usage,
    readingMinutes: content.kind === "article" ? content.readingMinutes : undefined,
    durationSec: content.kind === "video" ? content.durationSec : undefined,
    segments,
  };
  return { j, cached };
}

const t0 = performance.now();
const judged = new Map<string, Judgment>();
let cacheHits = 0;
// ponytail: 5-wide chunks; a real pool if the fixture set grows past ~100
for (let i = 0; i < items.length; i += 5) {
  const chunk = items.slice(i, i + 5);
  const results = await Promise.all(chunk.map(judge));
  chunk.forEach((it, k) => {
    const r = results[k]!;
    judged.set(it.id, r.j);
    if (r.cached) cacheHits++;
    process.stdout.write(`${r.cached ? "cache" : "jev  "} ${it.id}\n`);
  });
}
console.log();

// ── scoring ──
const has = (ids: string[]) => ids.filter((id) => judged.has(id));
const tuneIds = has(golden.split.tune);
const reportIds = has(golden.split.report);
const verdictPairs = (ids: string[], t: Thresholds): Pair[] =>
  ids.map((id) => [golden.items[id]!.verdict, computeVerdict(judged.get(id)!, t).label]);
const verdictAcc = (ids: string[], t: Thresholds) => accuracy(verdictPairs(ids, t));
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

console.log(`=== REPORT split (${reportIds.length} items) — the honest numbers ===\n`);
console.log("verdict (gold rows × predicted cols):");
console.log(confusionMatrix(VERDICT_LABELS, verdictPairs(reportIds, DEFAULT_THRESHOLDS)));
const reportAcc = verdictAcc(reportIds, DEFAULT_THRESHOLDS);
console.log(`verdict accuracy: ${pct(reportAcc)}\n`);

console.log("content_type (compact):");
const ctPairs: Pair[] = reportIds.map((id) => [golden.items[id]!.content_type, judged.get(id)!.answers.content_type.choice]);
console.log(confusionMatrix(CONTENT_TYPES, ctPairs, true));
console.log(`content_type accuracy: ${pct(accuracy(ctPairs))}\n`);

type Check = { name: string; applies: (g: GoldenItem) => boolean; pass: (g: GoldenItem, j: Judgment) => boolean; show: (j: Judgment) => string };
const checks: Check[] = [
  {
    name: "insight_density in [min,max]",
    applies: (g) => g.insight_density_min !== undefined || g.insight_density_max !== undefined,
    pass: (g, j) => {
      const d = densityDisplay(j.answers.insight_density);
      return d >= (g.insight_density_min ?? 1) && d <= (g.insight_density_max ?? 10);
    },
    show: (j) => `density=${densityDisplay(j.answers.insight_density)}`,
  },
  {
    name: "already_known <= max",
    applies: (g) => g.already_known_max !== undefined,
    pass: (g, j) => j.answers.already_known_to_reader <= g.already_known_max!,
    show: (j) => `known=${j.answers.already_known_to_reader.toFixed(2)}`,
  },
  {
    name: "undisclosed_sales_pitch >= min",
    applies: (g) => g.undisclosed_sales_pitch_min !== undefined,
    pass: (g, j) => j.answers.undisclosed_sales_pitch >= g.undisclosed_sales_pitch_min!,
    show: (j) => `pitch=${j.answers.undisclosed_sales_pitch.toFixed(2)}`,
  },
  {
    name: "ai_written >= min",
    applies: (g) => g.ai_written_min !== undefined,
    pass: (g, j) => j.answers.ai_written >= g.ai_written_min!,
    show: (j) => `ai=${j.answers.ai_written.toFixed(2)}`,
  },
  {
    name: "payload_location",
    applies: (g) => g.payload_location !== undefined,
    pass: (g, j) => j.answers.payload_location.choice === g.payload_location,
    show: (j) => `payload=${j.answers.payload_location.choice}`,
  },
];
for (const c of checks) {
  const ids = reportIds.filter((id) => c.applies(golden.items[id]!));
  if (ids.length === 0) continue;
  const fails = ids.filter((id) => !c.pass(golden.items[id]!, judged.get(id)!));
  console.log(`${c.name}: ${ids.length - fails.length}/${ids.length} pass`);
  for (const id of fails) console.log(`  FAIL ${id} ${c.show(judged.get(id)!)}`);
}
console.log();

// ── threshold suggestion (tune split only) ──
if (!reportOnly && tuneIds.length > 0) {
  console.log(`=== Threshold search on TUNE split (${tuneIds.length} items) ===\n`);
  const ranges = Object.fromEntries(
    Object.entries(THRESHOLD_META).map(([k, m]) => [k, { min: m.min, max: m.max, step: m.step }]),
  ) as Record<ThresholdKey, { min: number; max: number; step: number }>;
  const { suggested, perKey } = gridSearch(ranges, DEFAULT_THRESHOLDS, (t) => verdictAcc(tuneIds, t));
  const w = Math.max(...Object.keys(perKey).map((k) => k.length)) + 2;
  for (const [k, r] of Object.entries(perKey)) {
    const changed = r.value !== DEFAULT_THRESHOLDS[k as ThresholdKey];
    console.log(
      `${k.padEnd(w)} ${String(DEFAULT_THRESHOLDS[k as ThresholdKey]).padStart(5)} -> ${String(r.value).padStart(5)}  tune ${pct(r.before)} -> ${pct(r.after)}${changed ? "" : "  (unchanged)"}`,
    );
  }
  console.log(`\ncombined suggested set: tune ${pct(verdictAcc(tuneIds, DEFAULT_THRESHOLDS))} -> ${pct(verdictAcc(tuneIds, suggested))}`);
  console.log(`same set on REPORT split: ${pct(reportAcc)} -> ${pct(verdictAcc(reportIds, suggested))}`);
  console.log(`\nTuned on ${tuneIds.length} items, reported on ${reportIds.length}; report-split numbers are the honest ones.`);
  console.log("\n// paste into src/config.ts THRESHOLD_META defaults if you agree:");
  console.log(JSON.stringify(suggested, null, 2));
  console.log();
}

// ── cost ──
const tokens = [...judged.values()].reduce((a, j) => a + j.usage.input_tokens, 0);
console.log(
  `${judged.size} items, ${cacheHits} from cache, ${tokens.toLocaleString()} input tokens ≈ $${((tokens / 1e6) * USD_PER_MTOK).toFixed(4)}, ${((performance.now() - t0) / 1000).toFixed(1)}s wall`,
);

if (reportIds.length > 0 && reportAcc < 0.5) {
  console.error(`\nFAIL: report-split verdict accuracy ${pct(reportAcc)} < 50%`);
  process.exit(1);
}
