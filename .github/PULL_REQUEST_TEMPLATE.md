## What

<!-- One or two sentences. Which module, what changed. -->

## Why

<!-- The problem, the issue number if there is one, and why this is the fix. -->

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] If questions, thresholds, or `computeVerdict` changed: ran `pnpm eval` and pasted the **report-split** numbers before and after below
- [ ] Docs updated for any behaviour a doc describes (`README.md`, `docs/*.md`)
- [ ] No model prose reaches the UI; every new user-visible string is a template in `src/ui/templates.ts` or a `computeVerdict` reason
- [ ] No new network endpoints, no new dependencies (or an issue links to the discussion)
- [ ] One module per PR

## Eval (if applicable)

```
report split before:  verdict __%  content_type __%
report split after:   verdict __%  content_type __%
```
