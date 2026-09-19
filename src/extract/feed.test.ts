// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEED_BATCH_DEBOUNCE_MS } from "../config";
import { detectFeed, normalizeUrl } from "./feed";

const ALL = { hn: true, youtube: true, generic: true };
const parse = (html: string, base: string) => {
  const d = new DOMParser().parseFromString(`<base href="${base}">` + html, "text/html");
  return d;
};

// happy-dom has no IntersectionObserver; a stub that reports every observed element visible.
class FakeIO {
  static instances: FakeIO[] = [];
  observed: Element[] = [];
  constructor(public cb: IntersectionObserverCallback, public opts: IntersectionObserverInit) {
    FakeIO.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  disconnect() {}
  fire(visible: boolean, els = this.observed) {
    this.cb(els.map((target) => ({ target, isIntersecting: visible })) as IntersectionObserverEntry[], this as never);
  }
}
beforeEach(() => {
  FakeIO.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIO);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const HN = `<table><tbody>
<tr class="athing" id="1"><td class="title"><span class="titleline"><a href="https://blog.example.com/post">A real post</a><span class="sitebit"> (<a><span class="sitestr">blog.example.com</span></a>)</span></span></td></tr>
<tr><td class="subtext"><span class="score">142 points</span> by x <a href="item?id=1">98&nbsp;comments</a></td></tr>
<tr class="athing" id="2"><td class="title"><span class="titleline"><a href="item?id=2">Ask HN: Is this a feed?</a></span></td></tr>
<tr><td class="subtext"><span class="score">10 points</span> <a href="item?id=2">discuss</a></td></tr>
<tr class="athing" id="3"><td class="title"><span class="titleline"><a href="https://other.org/x#frag">Third</a></span></td></tr>
<tr><td class="subtext"><span class="score">3 points</span> <a href="item?id=3">1 comment</a></td></tr>
</tbody></table>`;

describe("hn adapter", () => {
  it("detects list pages and yields items with snippets", () => {
    const doc = parse(HN, "https://news.ycombinator.com/news");
    const ad = detectFeed(doc, "https://news.ycombinator.com/news", ALL);
    expect(ad?.id).toBe("hn");
    const onVisible = vi.fn();
    const onHidden = vi.fn();
    const off = ad!.observe(onVisible, onHidden);
    expect(FakeIO.instances).toHaveLength(2);
    const [near, far] = FakeIO.instances as [FakeIO, FakeIO];
    expect(near.observed).toHaveLength(3);
    expect(doc.querySelectorAll('[data-winnow="1"]')).toHaveLength(3);

    near.fire(true);
    expect(onVisible).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FEED_BATCH_DEBOUNCE_MS);
    expect(onVisible).toHaveBeenCalledTimes(1);
    const items = onVisible.mock.calls[0]![0].map((x: { item: unknown }) => x.item);
    expect(items).toEqual([
      { url: "https://blog.example.com/post", title: "A real post", snippet: "blog.example.com · 142 points · 98 comments" },
      { url: "https://news.ycombinator.com/item?id=2", title: "Ask HN: Is this a feed?", snippet: "news.ycombinator.com · 10 points · discuss" },
      { url: "https://other.org/x", title: "Third", snippet: "other.org · 3 points · 1 comment" },
    ]);

    far.fire(false, [near.observed[0]!]);
    expect(onHidden).toHaveBeenCalledWith(["https://blog.example.com/post"]);
    off();
  });

  it("ignores item pages and disabled adapter", () => {
    const doc = parse(HN, "https://news.ycombinator.com/item?id=1");
    expect(detectFeed(doc, "https://news.ycombinator.com/item?id=1", ALL)).toBeNull();
    expect(detectFeed(doc, "https://news.ycombinator.com/", { ...ALL, hn: false })).toBeNull();
  });
});

describe("youtube adapter", () => {
  const YT = `<ytd-page-manager>
<ytd-rich-item-renderer><a id="video-title-link" href="/watch?v=aaa11111111" title="First video"></a><div id="channel-name">Chan A</div><div id="metadata-line"><span>1.2M views</span><span>2 days ago</span></div><ytd-thumbnail-overlay-time-status-renderer> 12:34 </ytd-thumbnail-overlay-time-status-renderer></ytd-rich-item-renderer>
<ytd-video-renderer><a id="video-title" href="/watch?v=bbb22222222">Second video</a></ytd-video-renderer>
<ytd-rich-item-renderer><a id="video-title-link" href="/playlist?list=PL1" title="Not a video"></a></ytd-rich-item-renderer>
</ytd-page-manager>`;
  it("selects renderers and builds canonical watch urls", () => {
    const doc = parse(YT, "https://www.youtube.com/");
    const ad = detectFeed(doc, "https://www.youtube.com/feed/subscriptions", ALL);
    expect(ad?.id).toBe("youtube");
    const onVisible = vi.fn();
    ad!.observe(onVisible, vi.fn());
    FakeIO.instances[0]!.fire(true);
    vi.advanceTimersByTime(FEED_BATCH_DEBOUNCE_MS);
    const items = onVisible.mock.calls[0]![0].map((x: { item: unknown }) => x.item);
    expect(items).toEqual([
      { url: "https://www.youtube.com/watch?v=aaa11111111", title: "First video", snippet: "Chan A · 1.2M views · 2 days ago · 12:34", videoId: "aaa11111111" },
      { url: "https://www.youtube.com/watch?v=bbb22222222", title: "Second video", snippet: "", videoId: "bbb22222222" },
    ]);
  });
  it("not on watch pages", () => {
    const doc = parse(YT, "https://www.youtube.com/");
    expect(detectFeed(doc, "https://www.youtube.com/watch?v=aaa11111111", ALL)).toBeNull();
  });
});

describe("generic adapter", () => {
  const links = (n: number, host = "ext") =>
    Array.from({ length: n }, (_, i) => `<div><a href="https://${host}${i}.com/a?utm_source=x">External link number ${i}</a> some context text</div>`).join("");
  it("needs ≥15 external anchors", () => {
    const doc = parse(links(14), "https://mysite.com/");
    expect(detectFeed(doc, "https://mysite.com/", ALL)).toBeNull();
    const doc2 = parse(links(15) + `<nav>${links(5, "nav")}</nav>`, "https://mysite.com/");
    expect(detectFeed(doc2, "https://mysite.com/", ALL)?.id).toBe("generic");
  });
  it("skips nav, same-host, short text; de-dups by url", () => {
    const html =
      links(15) +
      `<nav><a href="https://ext0.com/other">Navigation link long enough</a></nav>` +
      `<a href="https://mysite.com/internal">Internal link long enough</a>` +
      `<a href="https://ext0.com/a?utm_medium=y#top">External link number 0 again</a>` +
      `<a href="https://ext99.com/">short</a>`;
    const doc = parse(html, "https://mysite.com/");
    const ad = detectFeed(doc, "https://mysite.com/", ALL)!;
    const onVisible = vi.fn();
    ad.observe(onVisible, vi.fn());
    FakeIO.instances[0]!.fire(true);
    vi.advanceTimersByTime(FEED_BATCH_DEBOUNCE_MS);
    const items = onVisible.mock.calls[0]![0].map((x: { item: { url: string; snippet?: string } }) => x.item);
    expect(items).toHaveLength(15);
    expect(items[0]).toEqual({ url: "https://ext0.com/a", title: "External link number 0", snippet: "some context text" });
    expect(items.every((i: { url: string }) => !i.url.includes("utm_") && !i.url.includes("mysite"))).toBe(true);
  });
});

describe("normalizeUrl", () => {
  it("strips hash and utm", () => {
    expect(normalizeUrl("/x?utm_source=a&b=1#h", "https://e.com/")).toBe("https://e.com/x?b=1");
    expect(normalizeUrl("javascript:void(0)", "https://e.com/")).toBeNull();
  });
});
