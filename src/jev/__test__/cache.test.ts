import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_MAX_ENTRIES, CACHE_TTL_MS } from "../../config";
import type { Judgment } from "../../types";
import { cache, cacheKey } from "../cache";
import { installChromeMock } from "./chromeMock";

const j = (url: string, over: Partial<Judgment> = {}): Judgment =>
  ({ url, title: url, depth: "full", model: "m", judgedAt: 0, readerStateVersion: 1, answers: {} as Judgment["answers"], usage: { input_tokens: 1, output_tokens: 0 }, ...over });

let store: Map<string, unknown>;
beforeEach(() => {
  store = installChromeMock();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("cache", () => {
  it("keys differ by depth and reader-state version", async () => {
    const a = await cacheKey("u", "full", 1);
    expect(a).toMatch(/^c:[0-9a-f]{64}$/);
    expect(await cacheKey("u", "snippet", 1)).not.toBe(a);
    expect(await cacheKey("u", "full", 2)).not.toBe(a);
    expect(await cacheKey("u", "full", 1)).toBe(a);
  });

  it("round-trips, prefers full over snippet in batch reads, and counts", async () => {
    await cache.set(j("a"), j("b", { depth: "snippet" }), j("b", { depth: "full", title: "b-full" }));
    expect(await cache.get("a", "full", 1)).toMatchObject({ url: "a" });
    expect(await cache.get("a", "snippet", 1)).toBeUndefined();
    expect(await cache.get("a", "full", 2)).toBeUndefined();
    const batch = await cache.getBatch(["a", "b", "zzz"], ["full", "snippet"], 1);
    expect(Object.keys(batch).sort()).toEqual(["a", "b"]);
    expect(batch.b?.title).toBe("b-full");
    expect(await cache.count()).toBe(3);
    await cache.clear();
    expect(await cache.count()).toBe(0);
    expect(store.size).toBe(0);
  });

  it("expires entries after the TTL", async () => {
    await cache.set(j("a"));
    vi.advanceTimersByTime(CACHE_TTL_MS - 1000);
    expect(await cache.get("a", "full", 1)).toBeDefined();
    vi.advanceTimersByTime(2000);
    expect(await cache.get("a", "full", 1)).toBeUndefined();
    expect(await cache.count()).toBe(0);
  });

  it("evicts the oldest beyond CACHE_MAX_ENTRIES", async () => {
    const many = Array.from({ length: CACHE_MAX_ENTRIES }, (_, i) => j(`u${i}`));
    await cache.set(...many);
    expect(await cache.count()).toBe(CACHE_MAX_ENTRIES);
    await cache.set(j("new1"), j("new2"));
    expect(await cache.count()).toBe(CACHE_MAX_ENTRIES);
    expect(await cache.get("u0", "full", 1)).toBeUndefined();
    expect(await cache.get("u1", "full", 1)).toBeUndefined();
    expect(await cache.get("u2", "full", 1)).toBeDefined();
    expect(await cache.get("new2", "full", 1)).toBeDefined();
    expect(store.size).toBe(CACHE_MAX_ENTRIES + 1); // entries + index
  });
});
