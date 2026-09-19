# Editing questions

Winnow asks Jev a fixed set of typed questions. Adding one, or changing what an existing one asks, is a five-file change plus an eval run. The wire format and Jev's quirks are in [jev-contract.md](jev-contract.md); what each current question does is in [how-judgments-work.md](how-judgments-work.md).

## The pieces

| Where | What |
|---|---|
| `src/types.ts` → `QUESTION_IDS` | The closed list of ids. Add yours here first; the type system then points at every other site. |
| `src/types.ts` → `JudgmentAnswers` | The parsed, typed field the answer lands in: `number` for a noul, `ChoiceAnswer<T>` for a choice, `ScoreAnswer` for a score. Optional (`?`) only if the question is conditionally asked, like `payload_segment`. |
| `src/jev/questions.ts` → `QUESTIONS` | One `QuestionSpec` per id: `appliesTo` (`"article"`, `"video"`, `"feed"`) and `build(path, ctx)` returning the wire question. |
| `src/jev/questions.ts` → `parseAnswers` | One line that pulls the answer out of the response and, for questions not asked in feed mode, supplies a neutral default. |
| `src/jev/verdict.ts` → `computeVerdict` / `toCardModel` | Where the answer changes a rule, a reason line, or a card field. |
| `src/ui/templates.ts`, `src/ui/card.ts` | If the card shows it: the template strings and the row. |
| `scripts/eval/run.ts` → `GoldenItem` + `checks` | If the eval should check it: a golden field and a check. |

`FEED_QUESTION_IDS` is derived from `appliesTo.includes("feed")`; you do not maintain it by hand.

## Adding a question, end to end

Say you want `reproducible`: a noul for whether an article gives enough detail to reproduce its result.

1. **`QUESTION_IDS`** in `src/types.ts`: add `"reproducible"`.

2. **`JudgmentAnswers`**: add `reproducible: number;`.

3. **`QUESTIONS`** in `src/jev/questions.ts`:

   ```ts
   reproducible: {
     id: "reproducible",
     appliesTo: PAGE, // article + video; use ALL to include feed items
     build: (p, ctx) => ({
       type: "noul",
       instructions: `Does ${body(p, ctx)} give enough concrete detail (code, parameters, data sources, steps) that a competent reader could reproduce its main result?`,
       criteria: {
         true: "Names the specific tools, versions, parameters, or data, and the order of steps",
         false: "Describes results or ideas without the specifics needed to redo them",
       },
     }),
   },
   ```

   `body(p, ctx)` yields `` `content.text` `` (or `` `content.segments` `` for a segmented video) in page mode and `` `items[n]` `` in a feed batch. Use `item(p)` when the question is about the item as a whole rather than its text.

4. **`parseAnswers`**: add a line in the returned object.

   ```ts
   reproducible: asked("reproducible") ? noul("reproducible") : 0.5,
   ```

   `asked()` already knows about `appliesTo` through `FEED_SET`; you only choose the default that fires no rule when the question was not asked. For a choice, use `choice("id", OPTIONS)`; for a score, `score("id")`.

5. **Use it.** In `computeVerdict`, either add a rule in the chain (mind the order; see the table in [how-judgments-work.md](how-judgments-work.md#the-verdict-rules-in-order)) or add a context line to `extra`. Any threshold you introduce goes in `THRESHOLD_META` in `src/config.ts` so it is a slider and a grid-search knob. If the card should show the value, add a field to `CardModel`, copy it in `toCardModel`, and add a `row(...)` in `renderCardBody`. Keep the visible text a template.

6. **Eval.** Add an optional golden field (`reproducible_min?: number`) to `GoldenItem` in `scripts/eval/run.ts`, a `Check` that reads it, and values for the fixtures where you have an opinion.

7. **Tests.** `src/jev/__test__/questions.test.ts` builds page and feed requests and parses canned answers; extend the canned answer map there or `parseAnswers` will throw `missing answer "reproducible"`. `scripts/eval/verdict.thresholds.test.ts` builds hand-made `Judgment`s through `mk()`; its base answers need the new field.

Then `pnpm typecheck && pnpm test`.

## Changing an existing question

Editing `instructions` or `criteria` is a one-file change, but it changes what Jev answers, so treat it as a threshold change: run the eval before and after. The eval cache is keyed by the hash of the whole request, so edited questions miss the cache automatically and cost real tokens (about half a cent for all 40 fixtures).

If you remove a question, delete it from `QUESTION_IDS` and `JudgmentAnswers` first and follow the compiler.

## Writing for Jev

From the jaggedness notes in [jev-contract.md](jev-contract.md#model-behaviour-notes-that-shape-our-questions-documented-jev-113-jaggedness-page):

- **It reads literally.** "Is this good?" gets you Jev's idea of good. State the exact condition in `instructions` and put the boundary cases in `criteria`. Compare the `already_known_to_reader` criteria, which spell out "restates a recently read title".
- **It cannot count or do arithmetic.** Do not ask for word counts, reading time, percentages, or "how many sources". Compute those in code and ask the qualitative question.
- **It cannot generate text.** To get "where is the payload" for a video, the transcript is split into `s0`…`s7` in code and Jev is asked a choice over those ids. Any "which part" question needs the parts enumerated in the state.
- **Context rot.** Every extra field in the state costs accuracy on every question. Reference only what the question needs (`` `content.text` ``, `` `reader.goals` ``), and keep caps tight.
- **Not adversarially robust.** Rage bait that says "this isn't rage bait" and advertorials that say "this is an independent review" can move the answer. Make `criteria` describe observable features (framing, disclosure present or absent), not the author's claim about itself.
- **Do not read exact numbers out of a `score`.** Use ordered levels with clear descriptions and treat the fractional `score` as a display convenience. Winnow maps 0–4 to 1–10 and the goldens only check ranges.
- **Nouls have no confidence.** If you need one, the code uses `|noul − 0.5| × 2`.
- **Reference the reader explicitly.** Questions that should be personal say so: `` `reader.goals` ``, `` `reader.frequent_topics` ``. `serves_reader_goals` also tells Jev what to do when goals are empty, because otherwise it will guess.
- **Choice criteria may be `null`** for options whose name is self-explanatory (`topic`, `payload_segment`), but describe anything that could be read two ways.

## Then run the eval

```sh
pnpm eval
```

Look at the **REPORT split** block only: verdict confusion matrix, verdict accuracy, content-type accuracy, and the per-field checks. That is 10 items nobody tuned on. The tune-split numbers and the grid-search suggestion below them are for finding candidate thresholds, not for declaring victory; the last search moved tune accuracy up and report accuracy down, which is what overfitting 30 items looks like. Paste the report-split before/after into your PR. Details in [eval.md](eval.md).
