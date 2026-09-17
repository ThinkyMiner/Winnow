import type { CardModel, FeedbackAction, JudgeError } from "../types";
import { STYLES } from "./styles";
import {
  CONTENT_TYPE_TEXT, ERROR_TEXT, PAYLOAD_LOCATION_TEXT, VERDICT_TEXT,
  confidenceText, minutesText, mmss, pct,
} from "./templates";

export type CardState =
  | { status: "loading" }
  | { status: "ready"; model: CardModel }
  | { status: "error"; error: JudgeError };

export interface CardHandle { update(s: CardState): void; remove(): void; el: HTMLElement }

export interface BodyHandlers {
  onFeedback(action: FeedbackAction): void;
  onSeek?(sec: number): void;
  /** When set, the title becomes a link that calls this instead of navigating. */
  onOpen?(url: string): void;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Record<string, string> = {}, ...kids: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...kids);
  return e;
}

function row(dt: string, ...dd: Array<Node | string>): Node[] {
  return [h("dt", {}, dt), h("dd", {}, ...dd)];
}

export function renderCardBody(m: CardModel, hx: BodyHandlers): HTMLElement {
  const low = m.verdict.firedRules.includes("low_confidence");
  const vt = VERDICT_TEXT[m.verdict.label];
  const conf = confidenceText(m.verdict.confidence);
  const pill = low
    ? h("span", { class: "wi-pill wi-pill-low", title: "low confidence" }, "?", h("small", {}, "low confidence"))
    : h("span", { class: "wi-pill", style: `--wi-verdict:${vt.color}`, title: `${vt.label}, ${conf} confidence` },
        vt.label, h("small", {}, conf));

  const title = hx.onOpen
    ? h("a", { class: "wi-title", href: m.url }, m.title)
    : h("div", { class: "wi-title" }, m.title);
  if (hx.onOpen) title.addEventListener("click", (e) => { e.preventDefault(); hx.onOpen!(m.url); });

  const density = Math.max(0, Math.min(10, Math.round(m.insightDensity)));
  const bar = h("span", { class: "wi-bar", "aria-hidden": "true" },
    ...Array.from({ length: 10 }, (_, i) => h("i", { class: i < density ? "on" : "" })));

  const grid = h("dl", { class: "wi-grid" },
    ...row("Insight density", `${density}/10`, bar),
    ...row("Content type", CONTENT_TYPE_TEXT[m.contentType]),
    ...row("Already known", pct(m.alreadyKnown)),
    ...row("Claims supported", pct(m.claimsSupported)),
    ...row("Sales pitch", pct(m.undisclosedSalesPitch)),
    ...row("AI-written", pct(m.aiWritten)),
    ...row("Payload", PAYLOAD_LOCATION_TEXT[m.payloadLocation]),
  );
  if (m.kind === "video" && m.payloadTimestamps?.length) {
    grid.append(...row("Skip to", ...m.payloadTimestamps.map((t) => {
      const b = h("button", { type: "button", class: "wi-chip", title: t.label, "aria-label": `Skip to ${t.label} at ${mmss(t.start)}` },
        `${mmss(t.start)}–${mmss(t.end)}`);
      if (hx.onSeek) b.addEventListener("click", () => hx.onSeek!(t.start));
      else b.disabled = true;
      return b;
    })));
  }
  if (m.readingMinutes != null) grid.append(...row("Length", minutesText(m.readingMinutes)));
  else if (m.durationSec != null) grid.append(...row("Length", mmss(m.durationSec)));

  const body = h("div", { class: "wi-body" }, h("div", { class: "wi-head" }, pill), title, grid);
  if (m.verdict.reasons.length) {
    body.append(h("ul", { class: "wi-reasons" }, ...m.verdict.reasons.slice(0, 4).map((r) => h("li", {}, r))));
  }

  const foot = h("div", { class: "wi-foot" });
  const btns = (["read", "skip"] as const).map((a) =>
    h("button", { type: "button", "aria-label": a === "read" ? "I read this" : "I skipped this" }, a === "read" ? "Read" : "Skip"));
  btns.forEach((b, i) => b.addEventListener("click", () => {
    btns.forEach((x) => (x.disabled = true));
    foot.insertBefore(h("span", { class: "wi-thanks" }, "Thanks"), btns[1]!.nextSibling);
    hx.onFeedback(i === 0 ? "read" : "skip");
  }));
  foot.append(...btns);
  if (m.fromCache) foot.append(h("span", { class: "wi-cache", title: "from cache", role: "img", "aria-label": "from cache" }));
  body.append(foot);
  return body;
}

export function renderState(s: CardState, hx: BodyHandlers): HTMLElement {
  if (s.status === "ready") return renderCardBody(s.model, hx);
  if (s.status === "loading") {
    return h("div", { class: "wi-body", "aria-busy": "true" },
      h("div", { class: "wi-head" }, h("span", { class: "wi-skel", "aria-hidden": "true" }), h("span", { class: "wi-muted" }, "Judging…")));
  }
  const e = h("div", { class: "wi-body", role: "alert" }, h("div", { class: "wi-err" }, ERROR_TEXT[s.error.code]));
  if (s.error.jev?.message) e.append(h("div", { class: "wi-muted" }, s.error.jev.message));
  return e;
}

export function mountCard(opts: {
  state: CardState;
  onFeedback(action: FeedbackAction): void;
  onSeek?(sec: number): void;
  onDismiss(): void;
  container?: HTMLElement;
}): CardHandle {
  const host = h("div", { id: "worth-it-card", class: "wi-card-host" });
  const root = host.attachShadow({ mode: "open" });
  const content = h("div");
  const x = h("button", { type: "button", class: "wi-x", "aria-label": "Dismiss" }, "×");
  const card = h("section", { class: "wi-card", role: "dialog", "aria-label": "Worth It verdict", tabindex: "-1" }, x, content);
  root.append(h("style", {}, STYLES), card);

  const hx: BodyHandlers = { onFeedback: opts.onFeedback, ...(opts.onSeek && { onSeek: opts.onSeek }) };
  const update = (s: CardState) => content.replaceChildren(renderState(s, hx));
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
  const remove = () => { document.removeEventListener("keydown", onKey); host.remove(); };
  const dismiss = () => { remove(); opts.onDismiss(); };

  x.addEventListener("click", dismiss);
  host.addEventListener("keydown", onKey);
  document.addEventListener("keydown", onKey);
  update(opts.state);
  (opts.container ?? document.documentElement).append(host);
  return { update, remove, el: host };
}
