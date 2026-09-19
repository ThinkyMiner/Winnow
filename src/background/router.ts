import { JEV_MODEL, MAX_FEED_ITEM_CHARS, PREFETCH_CONCURRENCY } from "../config";
import { createPrefetcher } from "../extract/prefetch";
import { cache, cancelFeed, judgeFeed, judgePage, readerState, verifyKey } from "../jev";
import type {
  ContentMessage,
  JudgeErrorCode,
  PageMessage,
  PageResponseFor,
  ResponseFor,
  Result,
  Settings,
} from "../types";
import { clearKey, getKey, getSettings, setKey, setSettings } from "./storage";

const DEBUG = false;
/** Counts and codes only. Never content, never the key. */
export const log = (...args: unknown[]) => {
  if (DEBUG) console.log("[winnow]", ...args);
};

type Msg = ContentMessage | PageMessage;
type Reply<M extends Msg> = M extends ContentMessage
  ? ResponseFor<M>
  : M extends PageMessage
    ? PageResponseFor<M>
    : never;

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const err = (code: JudgeErrorCode, message: string): Result<never> => ({ ok: false, error: { code, message } });

const PRIVATE_HOST = /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|\[f[cd]|\[fe80)/i;

/** Non-https, private/loopback, or on the user's exclusion list (exact or suffix). */
export function isExcluded(pageUrl: string | undefined, excludedHosts: string[]): boolean {
  let u: URL;
  try {
    u = new URL(pageUrl ?? "");
  } catch {
    return true;
  }
  if (u.protocol !== "https:" || PRIVATE_HOST.test(u.hostname)) return true;
  return excludedHosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
}

/** Only extension pages (onboarding/options) may change key, settings, or state. */
const PRIVILEGED = new Set<Msg["type"]>([
  "SET_KEY", "CLEAR_KEY", "SET_SETTINGS", "SET_GOALS", "CLEAR_CACHE", "RESET_READER_STATE",
]);

let prefetcher: ReturnType<typeof createPrefetcher> | undefined;
async function prefetchFor(settings: Settings) {
  if (!settings.prefetchLinkText) return undefined;
  if (!(await chrome.permissions.contains({ origins: ["<all_urls>"] }))) return undefined;
  prefetcher ??= createPrefetcher({ concurrency: PREFETCH_CONCURRENCY, maxChars: MAX_FEED_ITEM_CHARS });
  return (url: string, signal: AbortSignal) => prefetcher!.fetchText(url, signal);
}

/** `senderUrl` is the sender tab's URL (page for content scripts, chrome-extension:// for our pages). */
export async function handle<M extends Msg>(msg: M, senderUrl?: string): Promise<Reply<M>> {
  try {
    return (await route(msg, senderUrl)) as Reply<M>;
  } catch (e) {
    log(msg.type, "threw", e instanceof Error ? e.name : typeof e);
    return err("internal", "Something went wrong inside the extension.") as Reply<M>;
  }
}

async function route(msg: Msg, senderUrl?: string): Promise<Result<unknown>> {
  if (PRIVILEGED.has(msg.type) && !senderUrl?.startsWith("chrome-extension://")) {
    return err("internal", "Not allowed from this context.");
  }
  switch (msg.type) {
    case "JUDGE_PAGE":
    case "JUDGE_FEED": {
      const settings = await getSettings();
      if (isExcluded(senderUrl, settings.excludedHosts)) return err("excluded_host", "Winnow is off on this site.");
      const apiKey = await getKey();
      if (!apiKey) return err("no_key", "Add your Jev API key in Winnow options.");
      const ctx = { apiKey, settings };
      if (msg.type === "JUDGE_PAGE") {
        if (!settings.pageMode) return err("disabled", "Page mode is off.");
        return judgePage(msg.content, ctx);
      }
      if (!settings.feedMode || !settings.feedSites[msg.adapter]) return err("disabled", "Feed mode is off.");
      log("JUDGE_FEED", msg.adapter, msg.items.length);
      return judgeFeed(msg.items, msg.adapter, ctx, { prefetch: await prefetchFor(settings) });
    }
    case "FEED_CANCEL":
      cancelFeed(msg.urls);
      prefetcher?.cancel(msg.urls);
      return ok(null);
    case "FEEDBACK":
      await readerState.recordFeedback({ url: msg.url, title: msg.title, action: msg.action });
      return ok(null);
    case "GET_SETTINGS":
      return ok(await getSettings());
    case "GET_STATUS":
      return ok({
        hasKey: !!(await getKey()),
        model: JEV_MODEL,
        cacheEntries: await cache.count(),
        readerStateVersion: (await readerState.get()).version,
      });
    case "SET_KEY": {
      const r = await verifyKey(msg.key);
      if (r.ok) await setKey(msg.key);
      return r;
    }
    case "CLEAR_KEY":
      await clearKey();
      return ok(null);
    case "SET_SETTINGS":
      await setSettings(msg.settings);
      return ok(null);
    case "SET_GOALS":
      await readerState.setGoals(msg.goals);
      return ok(null);
    case "CLEAR_CACHE":
      await cache.clear();
      return ok(null);
    case "RESET_READER_STATE":
      await readerState.reset();
      return ok(null);
  }
}
