# Contributing to Winnow

Thanks for helping. This is a small volunteer project; the rules below keep it reviewable.

## Before you open a PR

```sh
pnpm install
pnpm typecheck && pnpm test
```

Both must be green. CI runs the same two commands plus `pnpm build` on every push and pull request (`.github/workflows/ci.yml`).

## Ground rules

- **Small PRs, one module per PR.** A change to `src/jev/verdict.ts` and a change to `src/ui/card.ts` are two PRs.
- **Commit messages** are conventional-ish: `fix(verdict): gate ai_written on depth`, `docs: expand eval guide`, `feat(feed): lobste.rs adapter`. Scope is the module directory. Nobody will reject a PR over the format, but keep the first line under 72 characters and say what changed.
- **Model prose never reaches the UI.** Every user-visible string comes from a template in `src/ui/templates.ts` or from `computeVerdict` reasons keyed to typed answers. Jev does not generate text, and Winnow must not start pretending it does. If you find yourself rendering a string that came back from the network, stop.
- **No new network endpoints.** The extension talks to `https://api.typesafe.ai/v1/systemone` and `GET /v1/models`, and (in page mode on YouTube) to YouTube's own same-origin InnerTube and caption URLs. Adding any other host is a privacy-policy change and needs an issue first.
- **No new dependencies without discussion.** The runtime dependency list is one entry (`@mozilla/readability`). Open an issue before adding anything to `dependencies` or `devDependencies`.
- **`src/types.ts` is a contract.** If a change needs a new field on `Judgment`, `CardModel`, or a message type, say so in the PR description and keep the change additive where possible.
- **Only the service worker calls Jev.** Content scripts and extension pages message it; they never hold the key.

## Changing questions or thresholds

Read [docs/editing-questions.md](docs/editing-questions.md) and [docs/eval.md](docs/eval.md) first. In short:

1. Make the change.
2. Run `pnpm eval` (needs `JEV_API_KEY=...` in a gitignored `.env`; a full run costs about half a cent).
3. Report the **report-split** numbers in the PR, before and after. Ignore the tune-split numbers and do not paste the grid-search suggestion into `config.ts` without a reason you can write down.

## Adding a fixture

Wrong-verdict issues become fixtures. The shape is in [docs/eval.md](docs/eval.md#turning-a-wrong-verdict-issue-into-a-fixture): one JSON file in `fixtures/items/` with `id`, `content` (an `ExtractedContent`), and `notes`, plus a golden entry in `fixtures/golden.json`. Add the id to exactly one of `split.tune` or `split.report`.

Use text you have the right to redistribute. The existing fixtures are original prose written for the harness with `.example` hostnames; follow that pattern rather than pasting a real article.

## Adding a feed adapter

[docs/adding-a-feed-adapter.md](docs/adding-a-feed-adapter.md) walks through the scanner, the `detectFeed` branch, the type union, the settings default, and the test.

## Docs

If a change alters behaviour a doc describes, update the doc in the same PR. The docs index is in the [README](README.md#development). `docs/jev-contract.md` is a record of observed API behaviour; only change it after a live probe (`pnpm probe`) and date the observation.

## Reporting

- Bugs: [Bug report](https://github.com/ThinkyMiner/Winnow/issues/new?template=bug.yml)
- Verdicts you disagree with: [Wrong verdict](https://github.com/ThinkyMiner/Winnow/issues/new?template=wrong-verdict.yml)
- Security: see [SECURITY.md](SECURITY.md)

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
