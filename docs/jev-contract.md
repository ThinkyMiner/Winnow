# Jev contract (source of truth)

Everything below marked **observed** was seen in a live call on 2026-09-18 with
`scripts/probe-jev.ts` or curl. Everything marked **documented** comes from
docs.typesafe.ai and was not independently exercised. Where docs and reality
disagreed, reality is recorded and the disagreement is called out.

Sources read: `docs.typesafe.ai/api.md`, `/models.md`, `/concepts/state.md`,
`/primitives.md`, `/confidence.md`, `/patterns/fan-out.md`,
`/model-jaggedness/jev-1.13.md`, `/sdk/javascript/*`, and the launch post
`typesafe.ai/blog/introducing-system-one-models-and-jev`. Index: `docs.typesafe.ai/llms.txt`.

## Endpoints

| Purpose | Method + URL | Status |
|---|---|---|
| Evaluate | `POST https://api.typesafe.ai/v1/systemone` | observed 200 |
| List models | `GET https://api.typesafe.ai/v1/models` | observed 200 |

Auth on both: `Authorization: Bearer <API_KEY>`. Body: `Content-Type: application/json`.
Response header of note: `x-typesafe-request-id: req_…` (observed). No rate-limit
headers were present on a 200. `retry-after` is documented for 429 and not observed.

## Request shape (observed)

```json
{
  "model": "jev-latest",
  "state": <string | object | array>,
  "questions": { "<id>": <Question>, ... }
}
```

- `state`: one state per request. Text only. Object recommended so questions can
  reference parts by path in backticks, e.g. "Is `items[2].title` clickbait?".
- `model`: `jev-latest` and `jev-preview` are the aliases this account lists
  (observed via `/v1/models`); both currently resolve to `jev-1.13.0`. Versioned
  IDs are accepted directly. **We pin `jev-1.13.0`** in `src/config.ts` because
  thresholds are tuned against it; the response `model` field reports the version
  that answered (observed `"jev-1.13.0"` when sending `jev-latest`).
- `questions`: non-empty map. IDs are ours; they are not shown to the model.

### Question types

| type | required fields | criteria shape |
|---|---|---|
| `noul` | `instructions` | optional `{ "true": str, "false": str }` |
| `choice` | `instructions`, `criteria` | `{ "<option>": str \| null, ... }` |
| `score` | `instructions`, `criteria` | `[ "<level 0>", "<level 1>", ... ]` ordered |

Documented: score needs ≥2 levels. **Observed: a one-level score returned 200**
with `score: 0, confidence: 1`. Do not rely on server validation for this; the
client validates ≥2 levels itself.

Documented: `instructions` may also be an object or array (advanced structure).
Not exercised; we send strings only.

## Response shape (observed)

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "content_type": {
      "type": "choice", "choice": "opinion", "confidence": 1,
      "probabilities": { "opinion": 1, "news": 0, "original_research": 0, "listicle": 0, "tutorial": 0 }
    },
    "already_known": { "type": "noul", "noul": 0.58 },
    "insight_density": {
      "type": "score", "score": 1.83, "confidence": 0.75,
      "legend": { "0": "Almost none; generic", "1": "Some; one useful idea", "2": "Dense; several specific, non-obvious ideas" },
      "probabilities": { "0": 0, "1": 0.17, "2": 0.83 }
    }
  },
  "usage": { "input_tokens": 644, "output_tokens": 92 }
}
```

- Noul: `noul` ∈ [0,1], probability of yes. **No confidence field.** Treat
  `|noul − 0.5| × 2` as a confidence proxy in code if one is needed.
- Choice: `choice` is argmax; `probabilities` sums to 1; `confidence` ∈ [0,1].
- Score: `score` is the probability-weighted level index (can be fractional);
  `legend` maps `"0".."n"` to the level text; `probabilities` keyed by level
  index as strings; `confidence` ∈ [0,1].
- Probabilities are rounded to 2 decimals in observed responses (0.58, 0.17, 0.83).

## Batching semantics

- **Many questions per state: yes** (documented and observed). All questions are
  evaluated in parallel against the same state; adding questions adds tokens but
  little latency. Use speculative fan-out: ask everything, ignore in code.
- **Many states per call: not supported as a first-class field.** Observed
  workaround, used for feed mode: put items in `state.items[]` and write one
  question per item per judgment, referencing `items[i]` by path. Observed with
  3 items × 2 choice questions: all six answers correct, 1,128 input tokens,
  1.22 s wall clock. Question IDs are ours, so `i0_type`, `i1_type`… is fine.
- Feed-mode cost model (observed from the batch above): ~150 tokens per item of
  title+snippet state, plus ~60–90 tokens per question. Full choice questions
  with six described options cost ~90 tokens each; repeat per item.

## Limits (documented, not exercised)

- 64k tokens for all `state` + `questions` together.
- 32k tokens for `state` + the longest single question.
- Choice cardinality up to 255 options (launch post).
- Rate limits for jev-1.13: 250,000 tokens/s and 1,200 requests/min per account,
  "adjusting dynamically, can change without notice". Over-limit returns 429.

## Pricing (documented)

$0.042 per million input tokens ($42 per billion). Output tokens free.
Observed probe: 644 input tokens ≈ $0.000027. Observed 3-item feed batch:
1,128 tokens ≈ $0.000047.

## Latency (observed)

Single page-style call: 1,245 ms. Three-item feed batch: 1,221 ms.
Docs claim 70–500 ms end-to-end; observed is 2–3× that from this network.

## Error shapes (observed unless noted)

| HTTP | When | Body |
|---|---|---|
| 400 | semantic validation, e.g. noul with no instructions | `{"detail": "Noul question must have criteria or instructions: q"}` (string) |
| 400 | unknown model | `{"detail": {"error_type": "api_usage_error", "message": "Unknown model: jev-9.9.9"}}` |
| 401 | bad key | `{"detail": {"error_type": "authentication_error", "message": "Cannot authenticate with the server. Please check your API key and try again."}}` |
| 422 | schema validation, e.g. empty `questions` | `{"detail": [{"type": "too_short", "loc": ["body","questions"], "msg": "…", "input": {}, "ctx": {…}}]}` (pydantic array) |
| 429 | rate limit | documented; not observed. Retry with exponential backoff; honor `retry-after` if present |
| 529 | overloaded | documented; not observed. Retry with backoff |

**Docs vs reality:** the docs list only 401/422/429/529. Reality also returns 400
with two different `detail` shapes. `detail` is therefore `string | {error_type,
message} | ValidationError[]`; the client must accept all three.

Retry policy we adopt (mirrors the official SDK defaults, documented):
max 2 retries, initial backoff 500 ms doubling to 5,000 ms max, 25% jitter,
retry on 408/429/5xx/529 and network errors, honor `retry-after` up to 60 s.
Never retry 400/401/422.

## Model behaviour notes that shape our questions (documented, jev-1.13 jaggedness page)

- Reads instructions literally. State the exact condition; put edge cases in criteria.
- Cannot count or do arithmetic. Word counts, reading time, and timestamp math stay in code.
- Cannot generate text. To get "where is the payload" for a video, we split the
  transcript into segments in code and ask a Choice over segment IDs.
- Accuracy degrades with irrelevant state ("context rot"). Send only what the
  question needs; cap article text and reader-state summary.
- Not adversarially robust. Rage-bait and advertorial content can argue for its
  own classification; criteria must be explicit.
- Don't interpolate exact numbers from `score`. We map a 5-level density score to
  a 1–10 display value; that number is a display convenience, not a measurement.

## What the probe script does

`pnpm probe` reads `JEV_API_KEY` from `.env`, sends one request with a choice, a
noul, and a score question against a fixed paragraph plus a `reader.goals`
field, and prints status, selected headers, and the raw body. Output above is
the unedited result of that run.
