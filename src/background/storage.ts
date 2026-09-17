import { DEFAULT_EXCLUDED_HOSTS, DEFAULT_THRESHOLDS, STORAGE_KEYS } from "../config";
import type { Settings } from "../types";

export const DEFAULT_SETTINGS: Settings = {
  pageMode: true,
  feedMode: true,
  feedSites: { hn: true, youtube: true, generic: true },
  excludedHosts: [...DEFAULT_EXCLUDED_HOSTS],
  prefetchLinkText: false,
  thresholds: { ...DEFAULT_THRESHOLDS },
};

const read = async <T>(key: string): Promise<T | undefined> =>
  (await chrome.storage.local.get(key))[key] as T | undefined;

/** Stored settings merged over defaults, so new keys get defaults without a migration. */
export async function getSettings(): Promise<Settings> {
  const s = (await read<Partial<Settings>>(STORAGE_KEYS.settings)) ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    feedSites: { ...DEFAULT_SETTINGS.feedSites, ...s.feedSites },
    thresholds: { ...DEFAULT_THRESHOLDS, ...s.thresholds },
  };
}

export const setSettings = (settings: Settings) =>
  chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });

/** The key never leaves the service worker: not logged, not messaged, not in any Result. */
export const getKey = () => read<string>(STORAGE_KEYS.apiKey);
export const setKey = (key: string) => chrome.storage.local.set({ [STORAGE_KEYS.apiKey]: key });
export const clearKey = () => chrome.storage.local.remove(STORAGE_KEYS.apiKey);
