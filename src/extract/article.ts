import { Readability } from "@mozilla/readability";
import { MAX_ARTICLE_CHARS, MIN_ARTICLE_WORDS } from "../config";
import type { ArticleContent } from "../types";

const WPM = 230;

function words(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Collapse whitespace; cut at MAX_ARTICLE_CHARS, preferring the last sentence end past the halfway mark. */
function capText(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= MAX_ARTICLE_CHARS) return t;
  const head = t.slice(0, MAX_ARTICLE_CHARS);
  const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "));
  return cut > MAX_ARTICLE_CHARS / 2 ? head.slice(0, cut + 1) : head;
}

function fallbackText(doc: Document): string {
  let best = "";
  for (const el of doc.querySelectorAll("article, main, [role=main]")) {
    const t = el.textContent ?? "";
    if (t.length > best.length) best = t;
  }
  if (words(best) >= MIN_ARTICLE_WORDS) return best;
  return Array.from(doc.body?.querySelectorAll("p") ?? [], (p) => p.textContent ?? "").join(" ");
}

export function extractArticle(doc: Document, url: string): ArticleContent | null {
  try {
    const meta = (name: string) =>
      doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute("content")?.trim() ||
      undefined;
    let text = "";
    let title = "";
    let byline: string | undefined;
    let siteName: string | undefined;
    let readabilityHit = false;

    const r = new Readability(doc.cloneNode(true) as Document).parse();
    if (r?.textContent && words(r.textContent) >= MIN_ARTICLE_WORDS) {
      text = r.textContent;
      title = r.title ?? "";
      byline = r.byline ?? undefined;
      siteName = r.siteName ?? undefined;
      readabilityHit = true;
    } else {
      text = fallbackText(doc);
      if (words(text) < MIN_ARTICLE_WORDS) return null;
    }

    text = capText(text);
    const wordCount = words(text);
    return {
      kind: "article",
      url,
      title: title || meta("og:title") || doc.title || "",
      text,
      wordCount,
      readingMinutes: Math.ceil(wordCount / WPM),
      byline: byline ?? meta("author"),
      siteName: siteName ?? meta("og:site_name"),
      readabilityHit,
    };
  } catch {
    return null;
  }
}
