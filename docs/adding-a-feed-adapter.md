# Adding a feed adapter

A feed adapter tells Winnow how to find links on one kind of page so each can get a badge. Three exist: `hn`, `youtube`, and `generic`. Adding one touches four files and one test. Everything below is in `src/extract/feed.ts` unless noted.

## 1. Write a scanner

```ts
type Found = { item: FeedItem; element: HTMLElement };
type Scanner = (doc: Document) => Found[];
```

The scanner is synchronous, takes the document, and returns every candidate link it can see right now. For each one:

- `item.url`: run the href through `normalizeUrl(href, doc.baseURI)`. It resolves relative URLs, drops non-http(s) schemes, strips the hash, and removes `utm_*` params. Skip the item if it returns `null`.
- `item.title`: the link text, whitespace-collapsed (`text(el)` helper).
- `item.snippet`: anything cheap that helps a title-only judgment: domain, points, comment count, channel, view count, duration, a sentence from the surrounding block. Join parts with `" · "`. Keep it short; feed items are judged on title + snippet.
- `item.videoId`: only for YouTube-style items.
- `element`: the DOM node to observe for visibility and to hang the badge on. For HN it is the `.athing` row; for YouTube the renderer element; for the generic scanner the anchor itself.

Scanners are called on every rescan, so they must be idempotent: `makeAdapter` skips elements already marked `data-winnow="1"`.

Example, lobste.rs (not shipped; illustrative):

```ts
function scanLobsters(doc: Document): Found[] {
  const out: Found[] = [];
  for (const row of doc.querySelectorAll<HTMLElement>("li.story")) {
    const a = row.querySelector<HTMLAnchorElement>(".link > a.u-url");
    if (!a) continue;
    const url = normalizeUrl(a.getAttribute("href") ?? "", doc.baseURI);
    if (!url) continue;
    const snippet = [text(row.querySelector(".domain")), text(row.querySelector(".score")), text(row.querySelector(".comments_label"))]
      .filter(Boolean)
      .join(" · ");
    out.push({ item: { url, title: text(a), snippet }, element: row });
  }
  return out;
}
```

## 2. Add a `detectFeed` branch

`detectFeed(doc, url, enabled)` decides which adapter, if any, applies to the current page. Match on hostname (already stripped of `www.` / `m.`) and path, check the site toggle, and return `makeAdapter(id, doc, scanner, isSpa)`:

```ts
if (host === "lobste.rs") {
  return enabled.lobsters && (u.pathname === "/" || u.pathname === "/newest") ? makeAdapter("lobsters", doc, scanLobsters) : null;
}
```

Put the branch before the generic fallback. Return `null` when the page is on the host but not a list page (an HN comment thread, a YouTube watch page), otherwise the generic scanner may badge it instead.

`makeAdapter(id, doc, scan, spa = false)` gives you:

- two `IntersectionObserver`s (200 px margin to report visible, 600 px to report hidden), a 400 ms coalescing timer, and the `data-winnow` de-duplication;
- with `spa = true`, a rescan 300 ms after any `yt-navigate-finish` event or DOM mutation under `ytd-page-manager` (or `body`). Set it for single-page apps that replace the list without a navigation. The event name is YouTube's; for another SPA you would add its own trigger inside `makeAdapter`.

## 3. Extend the id union

In `src/types.ts`:

```ts
export type FeedAdapterId = "hn" | "youtube" | "generic" | "lobsters";
```

`Settings.feedSites` is `Record<FeedAdapterId, boolean>`, so the compiler will now point you at every place that needs the new key.

## 4. Add the settings default and toggle

`src/background/storage.ts`:

```ts
feedSites: { hn: true, youtube: true, generic: true, lobsters: true },
```

`getSettings` merges stored `feedSites` over these defaults, so existing users get the new toggle on without a migration.

The options page renders a checkbox per id from `FEEDS` in `src/options/main.ts` and matching `<input id="feed-<id>">` markup in `src/options/index.html`; add both.

## 5. Check the badge anchor

`src/content/feed.ts` decides where the badge goes:

```ts
function anchorFor(el: HTMLElement): HTMLElement {
  return el.querySelector<HTMLElement>(".titleline > a, a#video-title-link, a#video-title, #video-title") ?? el;
}
```

The badge is inserted immediately after the first element matching that selector inside your `element`, or after `element` itself. If your scanner returns a row and the title link is somewhere inside it, add its selector to this list so the badge lands next to the title rather than after the whole row.

## 6. Test it

Feed tests run under happy-dom with a hand-written HTML snippet and a fake `IntersectionObserver`, because happy-dom has none. Copy the pattern from `src/extract/feed.test.ts`:

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectFeed } from "./feed";

const ALL = { hn: true, youtube: true, generic: true, lobsters: true };
const parse = (html: string, base: string) =>
  new DOMParser().parseFromString(`<base href="${base}">` + html, "text/html");

class FakeIO {
  static instances: FakeIO[] = [];
  observed: Element[] = [];
  constructor(public cb: IntersectionObserverCallback, public opts: IntersectionObserverInit) { FakeIO.instances.push(this); }
  observe(el: Element) { this.observed.push(el); }
  disconnect() {}
  fire(visible: boolean, els = this.observed) {
    this.cb(els.map((target) => ({ target, isIntersecting: visible })) as IntersectionObserverEntry[], this as never);
  }
}
beforeEach(() => { FakeIO.instances = []; vi.stubGlobal("IntersectionObserver", FakeIO); vi.useFakeTimers(); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const HTML = `<ol>
<li class="story"><span class="link"><a class="u-url" href="https://blog.example.com/post">A real post</a></span>
  <span class="domain">blog.example.com</span> <span class="score">42</span> <a class="comments_label">12 comments</a></li>
</ol>`;

describe("lobsters adapter", () => {
  it("detects the front page and yields items", () => {
    const doc = parse(HTML, "https://lobste.rs/");
    const ad = detectFeed(doc, "https://lobste.rs/", ALL);
    expect(ad?.id).toBe("lobsters");
    const onVisible = vi.fn();
    ad!.observe(onVisible, vi.fn());
    const [near] = FakeIO.instances as [FakeIO];
    near.fire(true);
    vi.advanceTimersByTime(250);
    expect(onVisible).toHaveBeenCalledTimes(1);
    const [{ item }] = onVisible.mock.calls[0]![0];
    expect(item).toEqual({ url: "https://blog.example.com/post", title: "A real post", snippet: "blog.example.com · 42 · 12 comments" });
  });

  it("does not activate on a comment page", () => {
    const doc = parse(HTML, "https://lobste.rs/s/abc/a_real_post");
    expect(detectFeed(doc, "https://lobste.rs/s/abc/a_real_post", ALL)).toBeNull();
  });
});
```

Existing tests that build an `enabled` map (`ALL` in `feed.test.ts`, and any `feedSites` literal in `src/background/*.test.ts`) will need the new key or the typecheck fails; that is the compiler doing its job.

Then:

```sh
pnpm typecheck && pnpm test
pnpm build
```

Load `dist/` unpacked, open the site, and check that badges appear next to titles, that hovering shows the card, and that scrolling a long way past an item while it is still loading removes its badge (the cancel path).

## What you do not need to touch

- `judgeFeed` takes the adapter id but does not branch on it; every adapter produces `FeedItem[]` and gets the same 7 feed questions.
- The cache key is the item URL, so an item that appears on two feeds is judged once.
- The Jev request format, the verdict, and the badge rendering are adapter-agnostic.
