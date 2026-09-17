// One real call to Jev. Reads JEV_API_KEY from .env, asks two questions about a
// fixed paragraph, prints status, headers of interest, and the raw JSON body.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=", 2).map((s) => s.trim()) as [string, string]),
);
const key = env.JEV_API_KEY;
if (!key) throw new Error("JEV_API_KEY missing in .env");

const state = {
  title: "Why most productivity advice fails",
  text:
    "Most productivity advice fails because it optimizes the wrong variable. " +
    "It treats time as the bottleneck when attention is. A 2019 study of 1,200 knowledge workers " +
    "found that the median worker switched tasks every 3 minutes, and that recovery from each switch " +
    "took about 23 minutes. If you accept those numbers, the entire genre of time-blocking tips is " +
    "rearranging deck chairs. The fix is not a new calendar; it is fewer inputs. Close the channels " +
    "that create switches, and the time takes care of itself.",
  reader: { goals: "I want dense, original thinking about work; I skip generic self-help." },
};

const body = {
  model: "jev-latest",
  state,
  questions: {
    content_type: {
      type: "choice",
      instructions: "What kind of content is `text`?",
      criteria: {
        original_research: "Reports new data or experiments the author ran",
        opinion: "Argues a position; may cite others' work",
        news: "Reports a recent event",
        tutorial: "Teaches how to do something step by step",
        listicle: "A numbered or bulleted list of loosely related tips",
      },
    },
    already_known: {
      type: "noul",
      instructions: "Given `reader.goals`, would a reader who has read widely about productivity already know the main idea of `text`?",
    },
    insight_density: {
      type: "score",
      instructions: "How much non-obvious insight per paragraph does `text` contain?",
      criteria: ["Almost none; generic", "Some; one useful idea", "Dense; several specific, non-obvious ideas"],
    },
  },
};

const t0 = performance.now();
const res = await fetch("https://api.typesafe.ai/v1/systemone", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const ms = Math.round(performance.now() - t0);
const text = await res.text();
console.log("HTTP", res.status, res.statusText, `${ms}ms`);
for (const h of ["content-type", "retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-request-id"]) {
  const v = res.headers.get(h);
  if (v) console.log(`${h}: ${v}`);
}
console.log("--- raw body ---");
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.log(text); }
