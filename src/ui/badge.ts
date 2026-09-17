import type { FeedbackAction } from "../types";
import { STYLES } from "./styles";
import { ERROR_TEXT, VERDICT_TEXT, confidenceText } from "./templates";
import { type BodyHandlers, type CardState, h, renderState } from "./card";

export type BadgeState = CardState;
export interface BadgeHandle { update(s: BadgeState): void; remove(): void }

const HOVER_MS = 150;
const GAP = 6;

export function attachBadge(anchor: HTMLElement, opts: {
  state: BadgeState;
  onFeedback(action: FeedbackAction): void;
  onOpen?(url: string): void;
}): BadgeHandle {
  const host = h("span", { class: "wi-badge-host" });
  const root = host.attachShadow({ mode: "open" });
  const pill = h("button", { type: "button", class: "wi-badge", "aria-expanded": "false", "aria-haspopup": "true" });
  const pop = h("div", { class: "wi-pop", role: "tooltip", hidden: "" });
  root.append(h("style", {}, STYLES), pill, pop);

  const hx: BodyHandlers = { onFeedback: opts.onFeedback, ...(opts.onOpen && { onOpen: opts.onOpen }) };
  let state = opts.state;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const renderPill = () => {
    pill.replaceChildren();
    pill.style.removeProperty("--wi-verdict");
    if (state.status === "loading") {
      pill.append("…"); pill.title = "Judging…"; pill.setAttribute("aria-label", "Judging");
    } else if (state.status === "error") {
      pill.append("!"); pill.title = ERROR_TEXT[state.error.code]; pill.setAttribute("aria-label", pill.title);
    } else {
      const v = state.model.verdict;
      const low = v.firedRules.includes("low_confidence");
      const vt = VERDICT_TEXT[v.label];
      const conf = confidenceText(v.confidence);
      if (!low) pill.style.setProperty("--wi-verdict", vt.color);
      pill.append(low ? "?" : vt.short, h("span", { class: `wi-dot wi-dot-${conf}`, "aria-hidden": "true" }));
      pill.title = low ? "low confidence" : `${vt.label}, ${conf} confidence`;
      pill.setAttribute("aria-label", pill.title);
    }
  };

  const position = () => {
    const r = pill.getBoundingClientRect();
    const w = pop.offsetWidth || 320, ph = pop.offsetHeight || 0;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    let top = r.bottom + GAP;
    if (top + ph > window.innerHeight && r.top - ph - GAP >= 0) top = r.top - ph - GAP;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  };
  const show = () => {
    clearTimeout(timer);
    pop.replaceChildren(renderState(state, hx));
    pop.hidden = false;
    pill.setAttribute("aria-expanded", "true");
    position();
  };
  const hide = () => {
    clearTimeout(timer);
    pop.hidden = true;
    pill.setAttribute("aria-expanded", "false");
  };
  const scheduleShow = () => { clearTimeout(timer); timer = setTimeout(show, HOVER_MS); };
  // ponytail: hide is delayed so the mouse can cross the 6px gap into the popover.
  const scheduleHide = () => { clearTimeout(timer); timer = setTimeout(hide, 120); };

  host.addEventListener("mouseenter", scheduleShow);
  host.addEventListener("mouseleave", scheduleHide);
  host.addEventListener("focusin", show);
  host.addEventListener("focusout", (e) => {
    if (!(e.relatedTarget instanceof Node && host.contains(e.relatedTarget)) && !root.contains(e.relatedTarget as Node | null)) hide();
  });
  host.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !pop.hidden) { e.stopPropagation(); pill.focus(); hide(); }
  });

  renderPill();
  anchor.insertAdjacentElement("afterend", host);
  return {
    update(s) { state = s; renderPill(); if (!pop.hidden) show(); },
    remove() { clearTimeout(timer); host.remove(); },
  };
}
