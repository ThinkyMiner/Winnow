# Winnow

**Less noise. More signal.**

A Chrome extension that tells you whether an article or video is worth your time before you open it, using [Jev](https://typesafe.ai) from TypeSafe. Jev answers typed questions with calibrated probabilities; it never writes prose. Every word you see on a card is a template filled from those typed answers.

## What it does

- **Page mode.** On any article or YouTube video, a small card in the top-right shows a verdict (read now / skim / save / skip) with confidence, plus insight density, content type, how likely you already know it, whether claims are supported, whether it is an undisclosed sales pitch, whether it reads as AI-written, and where the payload sits. For videos with captions, "skip to" chips seek the player to the segment Jev picked as the core idea.
- **Feed mode.** On Hacker News, YouTube home/search, and any page with many external links, each link that scrolls into view gets a tiny badge. Hover shows the full card. Items are judged in batches of 12 per Jev call and cached for seven days.
- **Reader state.** Your goals (typed in options), the topics you have consumed, and your read/skip feedback are summarised into every judgment, so "worth it" means "worth it for you".

## Load unpacked

```
pnpm install
pnpm build
```

Open `chrome://extensions`, turn on Developer mode, click "Load unpacked", and pick the `dist/` folder. The onboarding page opens on install: paste your Jev API key from `console.typesafe.ai/settings/keys` and click Verify. It makes one live call to `GET /v1/models` and stores the key only if that succeeds.

## Where the key lives

Only in `chrome.storage.local` under `jev_api_key`, read only by the service worker. Content scripts never see it, and it is never logged. For the eval harness and probe script it lives in `.env` as `JEV_API_KEY=...`, which is gitignored.

## Commands

| Command | What it does |
|---|---|
| `pnpm build` | Builds the extension into `dist/` |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm eval` | Judges 40 fixtures with real Jev calls, prints confusion matrices, suggests thresholds |
| `pnpm probe` | One raw Jev call; prints the response body |
| `pnpm dev` then open `/dev/preview.html` | Renders cards and badges from fixture data, no Jev needed |

## Editing questions and thresholds

- Questions live in `src/jev/questions.ts`, one `QuestionSpec` per ID in `QUESTION_IDS` (`src/types.ts`). Each builds a Jev noul, choice, or score question. Jev reads instructions literally, so state the exact condition and put edge cases in the criteria. Adding a question means adding its ID to `QUESTION_IDS`, a field on `JudgmentAnswers`, a spec here, and a parse line in `parseAnswers`.
- Verdict rules are in `src/jev/verdict.ts`, a pure function of a `Judgment` and `Thresholds`.
- Thresholds are in `src/config.ts` under `THRESHOLD_META`. Each entry drives an options slider and is a knob the eval grid search can move. Change a default there; do not tune to make `pnpm eval` pass, since the harness tunes on 30 items and reports on the other 10 for exactly that reason.
- Model is pinned to `jev-1.13.0` in `src/config.ts`. Thresholds were set against it. Move the pin deliberately.

## Adding a feed adapter

In `src/extract/feed.ts`:

1. Write a `Scanner`: `(doc: Document) => Array<{ item: FeedItem; element: HTMLElement }>`. Return the link URL, title, a cheap snippet (domain, points, channel, view count), and the element to observe.
2. Add a branch in `detectFeed()` that matches the host and path and returns `makeAdapter("<id>", doc, yourScanner, isSpa)`.
3. Add the ID to `FeedAdapterId` in `src/types.ts` and a toggle default in `src/background/storage.ts`.

Badges are attached after the first anchor matching `.titleline > a, a#video-title-link, a#video-title, #video-title` inside the element, else after the element itself (`src/content/feed.ts`).

## Eval goldens

`fixtures/golden.json` has `reviewed: false`. The expected verdicts were written by the model that wrote the fixtures, not by you. Correct them, flip `reviewed` to true, and rerun `pnpm eval`. The 30/10 tune/report split is fixed in the same file.

## Known limits

- **Paywalls and login walls.** The page-mode card judges whatever Readability can see. A teaser paragraph gets judged as the article.
- **Feed items are judged on title plus snippet by default.** Body-dependent rules (density, AI-written, claims) are disabled at that depth, so badges lean on content type, goal fit, and Jev's own verdict. Turning on "prefetch link text" in options requests the `<all_urls>` permission and fetches each linked page in the service worker; extraction there is string-based, not Readability, since the service worker has no DOM.
- **Videos without captions** are judged on title and description only, at snippet depth, with no skip-to chips. Caption URLs embedded in the watch page are token-gated by YouTube and return empty bodies; the extension fetches tracks through the InnerTube player endpoint instead, which can break when YouTube changes it.
- **YouTube in-app navigation.** Stale player data from the first-loaded video is discarded when its ID does not match the URL, so the transcript comes from InnerTube. Feed badges do not cover Shorts shelves.
- **Jev accuracy.** Jev 1.13 is early access. On the 40 fixtures it scores 80% verdict agreement with the unreviewed goldens on the held-out split. Insight density saturates: well-written opinion pieces and tutorials often score 9 or 10 like original research. Rage bait and advertorials that argue for their own classification can move the answer.
- **Cost.** One HN front page of 30 items is one to three Jev calls and about 34,000 input tokens, or roughly $0.0015 at $0.042 per million. A long article is about 2,000 to 8,000 tokens.
- **No throttle.** The client retries with backoff on 429 but does not pace itself against the 250,000 tokens/s and 1,200 requests/min account limits.

## Layout

```
src/types.ts          frozen contracts and message protocol
src/config.ts         model pin, limits, thresholds, storage keys
src/background/       service worker: the only place that calls Jev
src/jev/              client, questions, verdict, cache, reader state
src/extract/          Readability, YouTube transcript, feed adapters, prefetch
src/ui/               shadow-DOM card and badge, templates
src/content/          page.ts and feed.ts glue
src/onboarding/       key entry
src/options/          goals, toggles, sliders, cache and key management
scripts/eval/         eval harness; fixtures/ holds items and goldens
docs/jev-contract.md  observed Jev API behaviour, the source of truth
```
