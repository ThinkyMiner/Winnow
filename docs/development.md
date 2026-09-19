# Development

## Setup

Node 20 or newer (CI uses 22) and pnpm 10.

```sh
git clone https://github.com/ThinkyMiner/Winnow.git
cd Winnow
pnpm install
pnpm typecheck && pnpm test
pnpm build
```

For the eval harness and the probe script, put a Jev key in `.env` at the repo root:

```
JEV_API_KEY=sk-...
```

`.env`, `dist/`, `.eval-cache/`, and `node_modules/` are gitignored.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server. Open `http://localhost:5173/dev/preview.html` (or whatever port Vite prints) |
| `pnpm build` | Vite + `@crxjs/vite-plugin` build into `dist/` |
| `pnpm typecheck` | `tsc --noEmit` over `src`, `scripts`, `dev`, and `vite.config.ts` (strict, `noUncheckedIndexedAccess`) |
| `pnpm test` | Vitest, `src/**/*.test.ts` and `scripts/**/*.test.ts`; 124 tests in 16 files |
| `pnpm eval [--no-cache] [--report-only] [--items a,b]` | Judge the fixtures with real Jev calls; see [eval.md](eval.md) |
| `pnpm probe` | One raw request to `POST /v1/systemone` with a choice, a noul, and a score question; prints status, selected headers, and the body |

## Project layout

```
manifest.json           MV3 manifest; version lives here and in package.json
vite.config.ts          crx plugin, extra onboarding input, vitest include globs
src/
  types.ts              contracts: Jev wire types, enums, Judgment, CardModel, Settings, messages
  config.ts             model pin, endpoints, retry, caps, cache limits, THRESHOLD_META, storage keys
  background/           service worker (index, router, storage, messaging)
  jev/                  client, questions, verdict, cache, readerState, index (judgePage/judgeFeed)
    __test__/           tests for jev/ plus chromeMock.ts
  extract/              article (Readability), youtube, feed adapters, prefetch
    __fixtures__/       HTML fixtures for article tests
  ui/                   card, badge, templates, styles
  content/              page.ts and feed.ts entry points
  onboarding/           index.html + main.ts
  options/              index.html + main.ts
scripts/
  eval/                 run.ts, metrics.ts, and their tests
  probe-jev.ts
fixtures/
  items/*.json          40 ExtractedContent fixtures
  golden.json           expected verdicts, split, reviewed flag
  reader.json           fixed ReaderState for the eval
dev/
  preview.html/.ts      renders every card and badge state from dev/fixtures.ts
public/icons/           16/48/128 px icons copied into dist/
docs/                   this directory
.github/                CI, release, issue and PR templates
```

Module boundaries worth knowing:

- `src/types.ts` and `src/config.ts` are imported everywhere and import nothing from the rest of `src/` (types.ts takes `Thresholds` from config).
- `src/jev/client.ts`, `questions.ts`, `verdict.ts`, and `readerState.summarizeForState` have no `chrome.*` references so `scripts/eval/run.ts` can import them in Node.
- Only `src/background/` and `src/jev/` see the API key. `src/ui/` never imports from `src/jev/` or `src/extract/`; it renders a `CardModel`.

## Testing conventions

- Tests are **co-located**: `foo.ts` has `foo.test.ts` next to it. The exception is `src/jev/__test__/`, which holds the jev tests and the shared `chromeMock.ts`.
- Tests that need a DOM start with the comment `// @vitest-environment happy-dom` on line 1 (`src/ui/*.test.ts`, `src/extract/article|feed|youtube.test.ts`). Everything else runs in Node.
- happy-dom has no `IntersectionObserver`; `feed.test.ts` stubs one with `vi.stubGlobal` and fake timers. Copy that pattern for anything observer-based.
- `src/jev/__test__/chromeMock.ts` exports `installChromeMock()`, which installs an in-memory `chrome.storage.local` (`get`/`set`/`remove`/`clear`, values deep-cloned) on `globalThis` and returns the backing `Map` so tests can inspect it. Use it for anything touching `cache.ts`, `readerState.ts`, or `storage.ts`.
- `src/background/router.test.ts` mocks `../jev` and `../extract/prefetch` with `vi.mock` and tests `handle()` end to end, including the privileged-sender check.
- `scripts/eval/verdict.thresholds.test.ts` builds hand-made `Judgment`s through a `mk(overrides)` helper and asserts which rule fires. When you add a rule, add a case there.
- No network in tests. `client.test.ts` stubs `fetch`.

## The dev preview

```sh
pnpm dev
```

Open `/dev/preview.html`. It mounts a card for each of: loading, error (a 429 `jev_error`), ready article, ready video (with Skip-to chips), and low confidence; then a fake feed list with a badge per fixture; then an event log that prints feedback, seek, and dismiss callbacks. A **Dark** checkbox flips `color-scheme` and sets `data-wi-theme` so the shadow roots follow. No Jev, no extension APIs. Use it for any change under `src/ui/`.

## Loading the built extension

```sh
pnpm build
```

Then `chrome://extensions` → Developer mode → **Load unpacked** → pick `dist/`. After each rebuild, click the reload icon on the extension card. The onboarding tab opens on first install; the toolbar icon opens options.

Content scripts are injected on the next page load, not into already-open tabs. The service worker log is under the extension card's "service worker" link; note that `router.log` is compiled out unless you set `DEBUG = true` in `src/background/router.ts`, and even then it prints message types and error codes only.

### Automating the load (Chrome 137+)

Branded Chrome 137 and later ignores the `--load-extension` command-line flag. If you script extension loading (screenshots, end-to-end checks), launch Chrome with `--remote-debugging-pipe --enable-unsafe-extension-debugging` and call the DevTools Protocol method `Extensions.loadUnpacked` with the absolute path to `dist/`. Chrome for Testing and Chromium builds still honour `--load-extension`.

## Probing Jev

`pnpm probe` is the script that produced the observations in [jev-contract.md](jev-contract.md). Run it when you suspect the API changed (new error shape, new rate-limit headers, different answering model). If reality differs from the contract, update the contract with the date and the raw output, then fix the client.

## Release process

1. Bump the version in **both** `manifest.json` and `package.json` (they are `0.1.0` today; keep them equal).
2. Move the `[Unreleased]` entries in `CHANGELOG.md` under a new `## [X.Y.Z] - YYYY-MM-DD` heading and add the compare links at the bottom.
3. Commit, then tag and push the tag:

   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

4. `.github/workflows/release.yml` runs on any `v*` tag: installs with pnpm 10 on Node 22, runs `pnpm build`, zips the contents of `dist/` as `Winnow-vX.Y.Z.zip`, and attaches it to a GitHub Release with generated notes.
5. Check the release page, then install from the zip once as a user would ([install.md](install.md)) before announcing it.

CI (`.github/workflows/ci.yml`) runs `pnpm typecheck`, `pnpm test`, and `pnpm build` on pushes to `main`/`master` and on pull requests.
