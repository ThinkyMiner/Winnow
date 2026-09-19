# The eval harness

`pnpm eval` judges every fixture with real Jev calls and compares the results with hand-written expectations. It exists so that changes to questions or thresholds are measured, not eyeballed. Code: `scripts/eval/run.ts` and `scripts/eval/metrics.ts`. Data: `fixtures/`.

## What a run does

1. Reads `JEV_API_KEY` from `.env` at the repo root (gitignored; the file has one line, `JEV_API_KEY=...`). Fails without it.
2. Loads `fixtures/golden.json`, `fixtures/reader.json` (a fixed `ReaderState` so every run sees the same reader), and every `fixtures/items/*.json`. Every item must have a golden entry.
3. For each item, builds the exact page-mode request the extension would build (`buildPageState` + `buildPageQuestions` with `summarizeForState(reader)`), hashes it, and looks in `.eval-cache/<id>.json`. On a hash match the stored response is reused; otherwise it calls Jev and writes the response there. Items are judged 5 at a time.
4. Builds a `Judgment` per item at `depth: "full"` and prints the report-split confusion matrices, accuracies, and per-field checks.
5. Unless `--report-only`, runs a coordinate-wise grid search over the thresholds on the tune split and prints a suggestion.
6. Prints total input tokens, estimated cost, and wall time. Exits non-zero if report-split verdict accuracy is below 50%.

## Flags

| Flag | Effect |
|---|---|
| `--no-cache` | Ignore `.eval-cache/` and call Jev for every item (responses are still written back) |
| `--report-only` | Skip the grid search; print only the report-split scores |
| `--items a,b,c` | Judge only these fixture ids (useful while writing a fixture) |

## The cache directory

`.eval-cache/` (gitignored) holds one file per fixture: `{ hash, response }`. The hash is the first 16 hex chars of sha256 over the serialized request, which includes the model pin, the state (fixture content plus reader summary), and every question. Change any of those and that item misses. Thresholds are not part of the request, so re-running after a `config.ts` change is free and instant.

## The split

`golden.json` has `split.tune` (30 ids) and `split.report` (10 ids). Anything that chooses thresholds may look at the tune split only. The report split is the number you quote. The current report split is:

```
dense-03-kl-divergence-exposition     dense-08-lock-free-queue-postmortem
dense-10-llm-eval-contamination-study opinion-02-types-vs-tests
listicle-04-8-python-libraries        ragebait-02-ai-bros
advertorial-03-vpn-guide              tutorial-02-postgres-partial-index
news-01-well-sourced-outage           video-01-payoff-late
```

One item from each content class, plus a fourth dense one. Do not move ids between splits to make a number look better.

## What gets scored

**Verdict confusion matrix**: gold rows × predicted columns over `read_now`, `skim`, `save`, `skip`, then accuracy. Predicted is `computeVerdict(judgment, DEFAULT_THRESHOLDS).label`.

**Content-type confusion matrix** (compact: labels that never appear are dropped) and accuracy, comparing `content_type.choice` against the golden.

**Per-field checks**, each printed as `passed/applicable` with a `FAIL <id> <value>` line per miss:

| Check | Golden field(s) | Passes when |
|---|---|---|
| insight_density in [min,max] | `insight_density_min`, `insight_density_max` | display density is inside the range (defaults 1 and 10) |
| already_known <= max | `already_known_max` | noul ≤ max |
| undisclosed_sales_pitch >= min | `undisclosed_sales_pitch_min` | noul ≥ min |
| ai_written >= min | `ai_written_min` | noul ≥ min |
| payload_location | `payload_location` | choice equals the golden |

A golden entry only needs `verdict` and `content_type`; the rest are optional and a check only applies to items that set the field.

## The grid search

`gridSearch` in `metrics.ts` is deliberately simple: for each threshold key independently, sweep its `min..max` by `step` while holding every other key at the default, and keep the value with the best tune-split verdict accuracy (ties go to the value closest to the default). It prints one line per key and then applies the whole suggested set to the report split.

Do not paste the suggestion into `config.ts` blindly. The last run moved tune accuracy from 80% to 83% and report accuracy from 80% to 70%: it found a threshold that fits 30 items and generalises worse. Use the output to see which knob the tune set is sensitive to, look at the specific items that flipped, and decide. If you do change a default, write down why in the PR and in `CHANGELOG.md`.

## Current numbers

With `jev-1.13.0`, `DEFAULT_THRESHOLDS`, and the unreviewed goldens:

| | Report split (10 items) |
|---|---|
| Verdict agreement | 80% |
| Content-type agreement | 90% |

A full 40-item run is about 113,570 input tokens, roughly $0.0048 at $0.042 per million. With a warm `.eval-cache/` it costs nothing and takes a second.

Known weakness visible in the matrices: `insight_density` saturates. Polished opinion pieces and tutorials often land at 9–10, the same as original research, so density alone does not separate "well written" from "new". Splitting that question is the first roadmap item.

## Reviewing goldens

`golden.json` is marked `"reviewed": false` and the harness prints a note about it on every run. The expected verdicts and types were written by the same model that wrote the fixtures, following the rules in the file's `_comment`: read_now = density ≥ 7, known ≤ 0.5, goal fit ≥ 0.6 and ≤ 15 min; save = same but longer; skip = rage bait / advertorial / low density / already known; else skim. Math expositions are labelled `tutorial` because it is the nearest bucket.

To review: read each fixture's `content.text` and `notes`, decide what verdict and type *you* would give the reader in `fixtures/reader.json`, correct the golden, and when you have been through all of them flip `reviewed` to `true`. Correcting a golden changes no request, so the cache stays warm and the re-run is free.

## Turning a wrong-verdict issue into a fixture

A [Wrong verdict](https://github.com/ThinkyMiner/Winnow/issues/new?template=wrong-verdict.yml) issue gives you a URL, the verdict shown, the verdict expected, and a line on why. To make it permanent:

1. **Write the item.** `fixtures/items/<class>-<nn>-<slug>.json`:

   ```json
   {
     "id": "opinion-07-static-typing-fatigue",
     "content": {
       "kind": "article",
       "url": "https://blog.example/static-typing-fatigue",
       "title": "…",
       "text": "…",
       "wordCount": 1480,
       "readingMinutes": 7,
       "byline": "…",
       "siteName": "…",
       "readabilityHit": true
     },
     "notes": "Reported in #NN as skip, expected skim: the piece argues a position with two cited surveys; density should land 5–6."
   }
   ```

   `content` is an `ExtractedContent` (see `src/types.ts`); for a video it is `{ kind: "video", url, videoId, title, channel, durationSec, transcript: [{ start, dur, text }], description }`. Do not paste the reporter's article verbatim unless you have the right to redistribute it; the existing fixtures are original prose on `.example` hosts that reproduce the *shape* of the problem, and that is the expectation for new ones.

2. **Add the golden.** In `fixtures/golden.json` under `items`:

   ```json
   "opinion-07-static-typing-fatigue": {
     "verdict": "skim",
     "content_type": "opinion",
     "insight_density_min": 4,
     "insight_density_max": 7,
     "notes": "From issue #NN."
   }
   ```

3. **Add the id to one split.** Prefer `split.report` when the class is under-represented there; otherwise `split.tune`. Never both.

4. **Run it.** `pnpm eval --items opinion-07-static-typing-fatigue` to check the item parses and see its raw answers, then a full `pnpm eval` for the new report numbers. Put both in the PR.

If the fixture reproduces the wrong verdict, it is now a regression test for whoever next moves a threshold. If it does not reproduce, that is worth knowing too: say so in the issue and keep the fixture anyway.
