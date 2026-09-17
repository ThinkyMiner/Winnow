import type { FeedAdapterId, FeedItem } from "../types";
import { getVideoId } from "./youtube";

type Visible = Array<{ item: FeedItem; element: HTMLElement }>;

export interface FeedAdapter {
  id: FeedAdapterId;
  observe(onVisible: (batch: Visible) => void, onHidden: (urls: string[]) => void): () => void;
}

type Found = { item: FeedItem; element: HTMLElement };
type Scanner = (doc: Document) => Found[];

const HN_PATHS = new Set(["/", "/news", "/newest", "/best", "/ask", "/show", "/front"]);

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (k.startsWith("utm_")) u.searchParams.delete(k);
    return u.href;
  } catch {
    return null;
  }
}

// ───────────── hn ─────────────

function scanHn(doc: Document): Found[] {
  const out: Found[] = [];
  for (const row of doc.querySelectorAll<HTMLElement>(".athing")) {
    const a = row.querySelector<HTMLAnchorElement>(".titleline > a");
    if (!a) continue;
    // Ask/Show HN link to item?id= themselves; that IS the article URL.
    const url = normalizeUrl(a.getAttribute("href") ?? "", doc.baseURI);
    if (!url) continue;
    const sub = row.nextElementSibling?.querySelector(".subtext");
    const parts = [
      text(row.querySelector(".sitestr")) || new URL(url).hostname,
      text(sub?.querySelector(".score")),
      text([...(sub?.querySelectorAll("a") ?? [])].find((x) => /comment|discuss/.test(x.textContent ?? ""))),
    ].filter(Boolean);
    out.push({ item: { url, title: text(a), snippet: parts.join(" · ") }, element: row });
  }
  return out;
}

// ───────────── youtube ─────────────

const YT_ITEMS = "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer";

function scanYouTube(doc: Document): Found[] {
  const out: Found[] = [];
  for (const el of doc.querySelectorAll<HTMLElement>(YT_ITEMS)) {
    const a = el.querySelector<HTMLAnchorElement>("a#video-title-link, a#video-title");
    if (!a) continue;
    const url = normalizeUrl(a.getAttribute("href") ?? "", "https://www.youtube.com/");
    const videoId = url ? getVideoId(url) : null;
    if (!url || !videoId) continue;
    const title = a.getAttribute("title")?.trim() || text(a);
    const snippet = [
      text(el.querySelector("#channel-name")),
      ...[...el.querySelectorAll("#metadata-line span")].map(text),
      text(el.querySelector("ytd-thumbnail-overlay-time-status-renderer")),
    ]
      .filter(Boolean)
      .join(" · ");
    out.push({
      item: { url: `https://www.youtube.com/watch?v=${videoId}`, title, snippet, videoId },
      element: el,
    });
  }
  return out;
}

// ───────────── generic ─────────────

const GENERIC_MIN = 15;
const GENERIC_CAP = 150;
const SKIP_ANCESTOR = "nav, header, footer, [role=navigation]";
const BLOCK = "p, li, article, section, div, td, h1, h2, h3, h4, h5, h6";

function scanGeneric(doc: Document): Found[] {
  const host = new URL(doc.baseURI).hostname;
  const seen = new Set<string>();
  const out: Found[] = [];
  for (const a of doc.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (out.length >= GENERIC_CAP) break;
    const title = text(a);
    if (title.length < GENERIC_MIN || a.closest(SKIP_ANCESTOR)) continue;
    const url = normalizeUrl(a.getAttribute("href") ?? "", doc.baseURI);
    if (!url || seen.has(url) || new URL(url).hostname === host) continue;
    seen.add(url);
    const block = a.parentElement?.closest<HTMLElement>(BLOCK);
    const snippet = text(block).replace(title, "").trim().slice(0, 160) || undefined;
    out.push({ item: { url, title, snippet }, element: a });
  }
  return out;
}

// ───────────── detection + observe ─────────────

export function detectFeed(doc: Document, url: string, enabled: Record<FeedAdapterId, boolean>): FeedAdapter | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, "");
  if (host === "news.ycombinator.com") {
    return enabled.hn && HN_PATHS.has(u.pathname) ? makeAdapter("hn", doc, scanHn) : null;
  }
  if (host === "youtube.com") {
    const ok = u.pathname === "/" || u.pathname.startsWith("/feed/") || u.pathname === "/results";
    return enabled.youtube && ok ? makeAdapter("youtube", doc, scanYouTube, true) : null;
  }
  if (!enabled.generic) return null;
  return scanGeneric(doc).length >= GENERIC_MIN ? makeAdapter("generic", doc, scanGeneric) : null;
}

function makeAdapter(id: FeedAdapterId, doc: Document, scan: Scanner, spa = false): FeedAdapter {
  return {
    id,
    observe(onVisible, onHidden) {
      const byEl = new Map<Element, FeedItem>();
      const shown = new Set<Element>();
      let pending: Visible = [];
      let timer: ReturnType<typeof setTimeout> | undefined;
      const flush = () => {
        timer = undefined;
        if (pending.length) onVisible(pending), (pending = []);
      };
      const near = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const item = byEl.get(e.target);
            if (e.isIntersecting && item) {
              shown.add(e.target);
              pending.push({ item, element: e.target as HTMLElement });
            }
          }
          if (pending.length && !timer) timer = setTimeout(flush, 250);
        },
        { rootMargin: "200px 0px", threshold: 0 },
      );
      const far = new IntersectionObserver(
        (entries) => {
          // Only items that were previously reported visible; skips the initial off-screen burst.
          const urls: string[] = [];
          for (const e of entries) {
            if (e.isIntersecting || !shown.delete(e.target)) continue;
            const u = byEl.get(e.target)?.url;
            if (u) urls.push(u);
          }
          if (urls.length) onHidden(urls);
        },
        { rootMargin: "600px 0px", threshold: 0 },
      );
      const rescan = () => {
        for (const { item, element } of scan(doc)) {
          if (element.dataset.worthit) continue;
          element.dataset.worthit = "1";
          byEl.set(element, item);
          near.observe(element);
          far.observe(element);
        }
      };
      rescan();

      let mo: MutationObserver | undefined;
      let moTimer: ReturnType<typeof setTimeout> | undefined;
      const onNav = () => {
        if (moTimer) clearTimeout(moTimer);
        moTimer = setTimeout(rescan, 300);
      };
      if (spa) {
        doc.addEventListener("yt-navigate-finish", onNav);
        mo = new MutationObserver(onNav);
        mo.observe(doc.querySelector("ytd-page-manager") ?? doc.body, { childList: true, subtree: true });
      }
      return () => {
        near.disconnect();
        far.disconnect();
        mo?.disconnect();
        if (timer) clearTimeout(timer);
        if (moTimer) clearTimeout(moTimer);
        if (spa) doc.removeEventListener("yt-navigate-finish", onNav);
      };
    },
  };
}
