import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_FEED_ITEM_CHARS } from "../config";
import { createPrefetcher, extractSnippetFromHtml } from "./prefetch";

describe("extractSnippetFromHtml", () => {
  it("strips scripts/nav and decodes entities", () => {
    const html = `<html><head><title>T &amp; Co</title><meta name="description" content="Desc &quot;q&quot;">
<script>var x = "<p>not this</p>";</script><style>p{}</style></head>
<body><nav><p>Navigation paragraph that should be dropped entirely.</p></nav>
<p>First &lt;b&gt; paragraph &#39;quoted&#39; &#x41;&nbsp;and &#66; done here.</p>
<ul><li>List item number one with words</li><li>tiny</li></ul>
<footer><p>Footer paragraph that should be dropped as well.</p></footer></body></html>`;
    const r = extractSnippetFromHtml(html, "https://e.com/");
    expect(r.title).toBe("T & Co");
    expect(r.text).toBe(`Desc "q" First <b> paragraph 'quoted' A and B done here. List item number one with words`);
  });
  it("prefers og:title and caps length", () => {
    const html = `<title>x</title><meta property="og:title" content="OG"><body>${"<p>" + "word ".repeat(100) + "</p>"}`.repeat(5);
    const r = extractSnippetFromHtml(html, "u");
    expect(r.title).toBe("OG");
    expect(r.text.length).toBeLessThanOrEqual(MAX_FEED_ITEM_CHARS);
  });
});

function fakeFetch() {
  const pending = new Map<string, (r: Response) => void>();
  const fn = vi.fn((url: string, init: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      pending.set(url, resolve);
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }),
  );
  const respond = (url: string, body: string, type = "text/html") =>
    pending.get(url)!(new Response(body, { status: 200, headers: { "content-type": type } }));
  return { fn, respond, pending };
}

describe("createPrefetcher", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("caps concurrency and returns text", async () => {
    const f = fakeFetch();
    vi.stubGlobal("fetch", f.fn);
    const p = createPrefetcher({ concurrency: 2, maxChars: 50 });
    const sig = new AbortController().signal;
    const results = ["a", "b", "c"].map((u) => p.fetchText(`https://x.com/${u}`, sig));
    await Promise.resolve();
    expect(f.fn).toHaveBeenCalledTimes(2);
    f.respond("https://x.com/a", `<p>${"alpha ".repeat(30)}</p>`);
    expect(await results[0]).toHaveLength(50);
    await vi.waitFor(() => expect(f.fn).toHaveBeenCalledTimes(3));
    f.respond("https://x.com/b", "<p>x</p>");
    f.respond("https://x.com/c", "{}", "application/json");
    expect(await results[1]).toBeUndefined(); // too short → no text
    expect(await results[2]).toBeUndefined(); // non-html
  });

  it("cancel aborts queued and in-flight", async () => {
    const f = fakeFetch();
    vi.stubGlobal("fetch", f.fn);
    const p = createPrefetcher({ concurrency: 1, maxChars: 500 });
    const sig = new AbortController().signal;
    const a = p.fetchText("https://x.com/a", sig);
    const b = p.fetchText("https://x.com/b", sig);
    const c = p.fetchText("https://x.com/c", sig);
    await Promise.resolve();
    p.cancel(["https://x.com/a", "https://x.com/b"]);
    expect(await a).toBeUndefined();
    expect(await b).toBeUndefined();
    await vi.waitFor(() => expect(f.pending.has("https://x.com/c")).toBe(true));
    expect(f.fn).toHaveBeenCalledTimes(2); // b never fetched
    f.respond("https://x.com/c", `<p>${"gamma ".repeat(10)}</p>`);
    expect(await c).toMatch(/^gamma/);
  });

  it("caller signal aborts", async () => {
    const f = fakeFetch();
    vi.stubGlobal("fetch", f.fn);
    const p = createPrefetcher({ concurrency: 1, maxChars: 500 });
    const ctrl = new AbortController();
    const a = p.fetchText("https://x.com/a", ctrl.signal);
    ctrl.abort();
    expect(await a).toBeUndefined();
  });
});
