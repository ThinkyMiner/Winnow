import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_THRESHOLDS, STORAGE_KEYS } from "../config";
import { DEFAULT_SETTINGS, getKey, getSettings, setKey } from "./storage";
import { handle } from "./router";

vi.mock("../jev", () => ({
  cache: { count: async () => 0 },
  readerState: { get: async () => ({ version: 1 }) },
}));
vi.mock("../extract/prefetch", () => ({}));

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

beforeEach(() => store.clear());

describe("settings", () => {
  it("returns defaults when nothing stored", async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it("merges partial stored settings over defaults, including nested maps", async () => {
    store.set(STORAGE_KEYS.settings, { pageMode: false, feedSites: { hn: false }, thresholds: { min_confidence: 0.7 } });
    const s = await getSettings();
    expect(s.pageMode).toBe(false);
    expect(s.feedSites).toEqual({ hn: false, youtube: true, generic: true });
    expect(s.thresholds).toEqual({ ...DEFAULT_THRESHOLDS, min_confidence: 0.7 });
    expect(s.excludedHosts).toEqual(DEFAULT_SETTINGS.excludedHosts);
  });
});

describe("key", () => {
  it("GET_STATUS reports hasKey only, never the key", async () => {
    await setKey("sk-secret-123");
    expect(await getKey()).toBe("sk-secret-123");
    const r = await handle({ type: "GET_STATUS" });
    expect(r.ok && r.value.hasKey).toBe(true);
    expect(JSON.stringify(r)).not.toContain("secret");
  });
});
