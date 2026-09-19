// Feed mode: badge every link that scrolls into view on HN, YouTube lists, and link-heavy pages.
import { detectFeed } from "../extract/feed";
import { sendMessage } from "../background/messaging";
import { attachBadge, type BadgeHandle } from "../ui/badge";
import type { FeedItem, JudgeErrorCode } from "../types";

const FATAL: ReadonlySet<JudgeErrorCode> = new Set(["excluded_host", "disabled", "no_key"]);

/** Where the badge goes for each adapter's element. */
function anchorFor(el: HTMLElement): HTMLElement {
  return (el.querySelector<HTMLElement>(".titleline > a, a#video-title-link, a#video-title, #video-title") ?? el);
}

async function main(): Promise<void> {
  if (window.top !== window) return;
  const settings = await sendMessage({ type: "GET_SETTINGS" });
  if (!settings.ok || !settings.value.feedMode) return;
  const adapter = detectFeed(document, location.href, settings.value.feedSites);
  if (!adapter) return;

  const badges = new Map<string, BadgeHandle>();
  const pending = new Set<string>();

  const stop = adapter.observe(
    async (batch) => {
      const items: FeedItem[] = [];
      for (const { item, element } of batch) {
        if (badges.has(item.url)) continue;
        badges.set(item.url, attachBadge(anchorFor(element), {
          state: { status: "loading" },
          onFeedback: (action) => { void sendMessage({ type: "FEEDBACK", url: item.url, title: item.title, action }); },
        }));
        pending.add(item.url);
        items.push(item);
      }
      if (!items.length) return;

      const res = await sendMessage({ type: "JUDGE_FEED", pageUrl: location.href, adapter: adapter.id, items });
      if (!res.ok) {
        for (const it of items) { badges.get(it.url)?.remove(); badges.delete(it.url); pending.delete(it.url); }
        if (FATAL.has(res.error.code)) { stop(); for (const b of badges.values()) b.remove(); badges.clear(); }
        return;
      }
      for (const it of items) {
        pending.delete(it.url);
        const badge = badges.get(it.url);
        const r = res.value.cards[it.url];
        if (!badge) continue;
        if (!r) { badge.remove(); badges.delete(it.url); } // cancelled or dropped
        else if (r.ok) badge.update({ status: "ready", model: r.value });
        else badge.update({ status: "error", error: r.error });
      }
      console.debug("[winnow] feed batch", items.length, "cache hits", res.value.cacheHits, "tokens", res.value.usage.input_tokens);
    },
    (urls) => {
      const cancel = urls.filter((u) => pending.has(u));
      if (!cancel.length) return;
      for (const u of cancel) { pending.delete(u); badges.get(u)?.remove(); badges.delete(u); }
      void sendMessage({ type: "FEED_CANCEL", pageUrl: location.href, urls: cancel });
    },
  );
}

void main();
