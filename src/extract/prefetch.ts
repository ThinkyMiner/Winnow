import { MAX_FEED_ITEM_CHARS } from "../config";

// ponytail: regex HTML text, no DOM in SW; swap for chrome.offscreen + Readability if badge quality on prose-heavy sites is poor

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

function clean(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function attr(html: string, re: RegExp): string | undefined {
  const m = re.exec(html);
  return m?.[1] ? clean(m[1]) : undefined;
}

export function extractSnippetFromHtml(html: string, _url: string): { title: string; text: string } {
  const head = html.slice(0, 200_000);
  const title =
    attr(head, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ??
    attr(head, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i) ??
    attr(head, /<title[^>]*>([\s\S]*?)<\/title>/i) ??
    "";
  const description =
    attr(head, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ??
    attr(head, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ??
    "";

  const body = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|nav|header|footer|aside|noscript|svg)\b[\s\S]*?<\/\1\s*>/gi, " ");
  const paras: string[] = [];
  let total = description.length;
  for (const m of body.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
    const t = clean(m[2] ?? "");
    if (t.length < 20) continue;
    paras.push(t);
    total += t.length + 1;
    if (total > MAX_FEED_ITEM_CHARS) break;
  }
  const text = [description, ...paras].filter(Boolean).join(" ").slice(0, MAX_FEED_ITEM_CHARS);
  return { title, text };
}

const MAX_BODY_BYTES = 300_000;
const TIMEOUT_MS = 8_000;

/**
 * Bounded-concurrency fetch queue for feed-item link text. Never throws; undefined on any failure.
 * cancel(urls) aborts queued and in-flight fetches for those URLs.
 */
export function createPrefetcher(opts: { concurrency: number; maxChars: number }) {
  type Job = { url: string; ctrl: AbortController; run: () => Promise<void> };
  const queue: Job[] = [];
  const active = new Map<string, AbortController>();
  let running = 0;

  const pump = () => {
    while (running < opts.concurrency && queue.length) {
      const job = queue.shift()!;
      if (job.ctrl.signal.aborted) continue;
      running++;
      active.set(job.url, job.ctrl);
      void job.run().finally(() => {
        running--;
        active.delete(job.url);
        pump();
      });
    }
  };

  async function readCapped(res: Response, signal: AbortSignal): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) return (await res.text()).slice(0, MAX_BODY_BYTES);
    const dec = new TextDecoder();
    let out = "";
    let bytes = 0;
    while (bytes < MAX_BODY_BYTES && !signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      out += dec.decode(value, { stream: true });
    }
    void reader.cancel().catch(() => {});
    return out;
  }

  return {
    fetchText(url: string, signal: AbortSignal): Promise<string | undefined> {
      const ctrl = new AbortController();
      const abort = () => ctrl.abort();
      signal.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, TIMEOUT_MS);
      return new Promise<string | undefined>((resolve) => {
        const finish = (v: string | undefined) => {
          clearTimeout(timer);
          signal.removeEventListener("abort", abort);
          resolve(v);
        };
        const run = async () => {
          try {
            if (ctrl.signal.aborted) return;
            const res = await fetch(url, { credentials: "omit", redirect: "follow", signal: ctrl.signal });
            const ct = res.headers.get("content-type") ?? "";
            if (!res.ok || (ct && !/text\/html|application\/xhtml/i.test(ct))) return finish(undefined);
            const html = await readCapped(res, ctrl.signal);
            const { text } = extractSnippetFromHtml(html, url);
            finish(text ? text.slice(0, opts.maxChars) : undefined);
          } catch {
            finish(undefined);
          }
        };
        ctrl.signal.addEventListener("abort", () => finish(undefined), { once: true });
        queue.push({ url, ctrl, run });
        pump();
      });
    },
    cancel(urls: string[]) {
      const set = new Set(urls);
      for (const j of queue) if (set.has(j.url)) j.ctrl.abort();
      for (const u of urls) active.get(u)?.abort();
    },
  };
}
