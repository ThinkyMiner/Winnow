// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { extractArticle } from "./article";
import { FALLBACK_HTML, READABLE_HTML, SHORT_HTML } from "./__fixtures__/article";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("extractArticle", () => {
  it("uses Readability on real paragraphs", () => {
    const a = extractArticle(parse(READABLE_HTML), "https://ex.com/post");
    expect(a).not.toBeNull();
    expect(a!.readabilityHit).toBe(true);
    expect(a!.title).toMatch(/Why Types Matter/);
    expect(a!.wordCount).toBeGreaterThan(120);
    expect(a!.readingMinutes).toBe(Math.ceil(a!.wordCount / 230));
    expect(a!.text).not.toMatch(/Home|About|©/);
    expect(a!.siteName).toBe("Example Blog");
  });

  it("falls back to <main> text", () => {
    const a = extractArticle(parse(FALLBACK_HTML), "https://ex.com/notes");
    expect(a).not.toBeNull();
    expect(a!.wordCount).toBeGreaterThanOrEqual(120);
    expect(a!.text).toMatch(/line 0 some words/);
    expect(a!.title).toBe("Notes");
  });

  it("returns null under min words", () => {
    expect(extractArticle(parse(SHORT_HTML), "https://ex.com/tiny")).toBeNull();
  });

  it("never throws", () => {
    expect(extractArticle({} as Document, "x")).toBeNull();
  });
});
