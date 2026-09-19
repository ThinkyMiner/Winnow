// Page mode: judge the article or video the user is looking at and show one card.
import { extractArticle } from "../extract/article";
import { extractYouTube, isYouTubeWatch } from "../extract/youtube";
import { detectFeed } from "../extract/feed";
import { sendMessage } from "../background/messaging";
import { mountCard, type CardHandle } from "../ui/card";
import type { ExtractedContent, JudgeErrorCode } from "../types";

/** Errors that mean "nothing to show", not "something broke". */
const SILENT: ReadonlySet<JudgeErrorCode> = new Set(["excluded_host", "disabled", "no_key", "content_too_short"]);

let card: CardHandle | undefined;
let runId = 0;

async function extract(): Promise<ExtractedContent | null> {
  const url = location.href;
  if (isYouTubeWatch(url)) return extractYouTube(document, url);
  // A feed page (HN front page, YouTube home) is not an article; badges handle it.
  if (detectFeed(document, url, { hn: true, youtube: true, generic: false })) return null;
  return extractArticle(document, url);
}

async function run(): Promise<void> {
  const id = ++runId;
  card?.remove();
  card = undefined;
  const content = await extract();
  if (!content || id !== runId) return;

  card = mountCard({
    state: { status: "loading" },
    onDismiss: () => { card = undefined; },
    onFeedback: (action) => { void sendMessage({ type: "FEEDBACK", url: content.url, title: content.title, action }); },
    onSeek: content.kind === "video"
      ? (sec) => { const v = document.querySelector("video"); if (v) { v.currentTime = sec; void v.play(); } }
      : undefined,
  });

  const res = await sendMessage({ type: "JUDGE_PAGE", content });
  if (id !== runId || !card) return;
  if (res.ok) card.update({ status: "ready", model: res.value });
  else if (SILENT.has(res.error.code)) { card.remove(); card = undefined; }
  else card.update({ status: "error", error: res.error });
}

if (window.top === window) {
  void run();
  // YouTube is an SPA; re-judge on in-app navigation. Harmless elsewhere.
  document.addEventListener("yt-navigate-finish", () => { void run(); });
}
