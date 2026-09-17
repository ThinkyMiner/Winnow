import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../config";
import type { ContentMessage, ExtractedContent } from "../types";
import { handle, isExcluded } from "./router";

const jev = vi.hoisted(() => ({
  verifyKey: vi.fn(),
  judgePage: vi.fn(async (_content: unknown, ctx: unknown) => ({ ok: true, value: "card", ctx })),
  judgeFeed: vi.fn(),
  cancelFeed: vi.fn(),
  cache: { clear: vi.fn(), count: async () => 0 },
  readerState: { get: async () => ({ version: 1 }), setGoals: vi.fn(), recordFeedback: vi.fn(), reset: vi.fn() },
}));
vi.mock("../jev", () => jev);
vi.mock("../extract/prefetch", () => ({ createPrefetcher: vi.fn() }));

const store = new Map<string, unknown>();
globalThis.chrome = {
  storage: {
    local: {
      get: async (k: string) => ({ [k]: store.get(k) }),
      set: async (o: Record<string, unknown>) => void Object.entries(o).forEach(([k, v]) => store.set(k, v)),
      remove: async (k: string) => void store.delete(k),
    },
  },
} as unknown as typeof chrome;

const page: ContentMessage = { type: "JUDGE_PAGE", content: {} as ExtractedContent };
const EXT = "chrome-extension://abc/src/options/index.html";
beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("isExcluded", () => {
  it.each([
    ["https://mail.google.com/mail/u/0", true],
    ["https://sub.notion.so/x", true],
    ["http://example.com/a", true],
    ["https://192.168.1.4/", true],
    ["https://[::1]/", true],
    ["https://example.com/a", false],
    ["https://notnotion.so/", false],
    [undefined, true],
  ])("%s -> %s", (url, want) => {
    expect(isExcluded(url, ["mail.google.com", "notion.so"])).toBe(want);
  });
});

describe("JUDGE_PAGE guards", () => {
  it("excluded host", async () => {
    store.set(STORAGE_KEYS.apiKey, "k");
    const r = await handle(page, "https://docs.google.com/d/1");
    expect(!r.ok && r.error.code).toBe("excluded_host");
    expect(jev.judgePage).not.toHaveBeenCalled();
  });
  it("no key", async () => {
    const r = await handle(page, "https://example.com/post");
    expect(!r.ok && r.error.code).toBe("no_key");
  });
  it("disabled", async () => {
    store.set(STORAGE_KEYS.apiKey, "k");
    store.set(STORAGE_KEYS.settings, { pageMode: false });
    const r = await handle(page, "https://example.com/post");
    expect(!r.ok && r.error.code).toBe("disabled");
  });
  it("delegates to judgePage with key + settings", async () => {
    store.set(STORAGE_KEYS.apiKey, "k");
    const r = await handle(page, "https://example.com/post");
    expect(r).toMatchObject({ ok: true, value: "card", ctx: { apiKey: "k", settings: { pageMode: true } } });
  });
});

describe("SET_KEY", () => {
  it("stores only when verifyKey ok", async () => {
    jev.verifyKey.mockResolvedValueOnce({ ok: false, error: { code: "jev_error", message: "nope" } });
    let r = await handle({ type: "SET_KEY", key: "bad" }, EXT);
    expect(r.ok).toBe(false);
    expect(store.has(STORAGE_KEYS.apiKey)).toBe(false);

    jev.verifyKey.mockResolvedValueOnce({ ok: true, value: { model: "jev-1.13.0" } });
    r = await handle({ type: "SET_KEY", key: "good" }, EXT);
    expect(r).toEqual({ ok: true, value: { model: "jev-1.13.0" } });
    expect(store.get(STORAGE_KEYS.apiKey)).toBe("good");
  });
  it("is refused from a content script", async () => {
    const r = await handle({ type: "SET_KEY", key: "x" }, "https://evil.example/");
    expect(!r.ok && r.error.code).toBe("internal");
    expect(jev.verifyKey).not.toHaveBeenCalled();
  });
});
