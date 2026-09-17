// Minimal in-memory chrome.storage.local for node tests.
export function installChromeMock(): Map<string, unknown> {
  const store = new Map<string, unknown>();
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  const list = (keys: unknown): string[] =>
    typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys as object);
  const local = {
    async get(keys?: unknown) {
      if (keys == null) return clone(Object.fromEntries(store));
      const out: Record<string, unknown> = {};
      for (const k of list(keys)) if (store.has(k)) out[k] = clone(store.get(k));
      return out;
    },
    async set(items: Record<string, unknown>) {
      for (const [k, v] of Object.entries(items)) store.set(k, clone(v));
    },
    async remove(keys: string | string[]) {
      for (const k of list(keys)) store.delete(k);
    },
    async clear() {
      store.clear();
    },
  };
  (globalThis as unknown as { chrome: unknown }).chrome = { storage: { local } };
  return store;
}
