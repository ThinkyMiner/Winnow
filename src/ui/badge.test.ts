// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURES } from "../../dev/fixtures";
import { attachBadge } from "./badge";

const model = FIXTURES[0]!;
let anchor: HTMLAnchorElement;
beforeEach(() => {
  vi.useFakeTimers();
  anchor = document.createElement("a");
  anchor.textContent = "link";
  document.body.append(anchor);
});
afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

describe("attachBadge", () => {
  it("inserts after anchor and shows short text", () => {
    attachBadge(anchor, { state: { status: "ready", model }, onFeedback() {} });
    const host = anchor.nextElementSibling as HTMLElement;
    expect(host.className).toBe("wi-badge-host");
    expect(host.shadowRoot!.querySelector(".wi-badge")!.textContent).toBe("GO");
    expect(host.shadowRoot!.querySelector(".wi-dot-high")).not.toBeNull();
  });

  it("loading and error pills", () => {
    const b = attachBadge(anchor, { state: { status: "loading" }, onFeedback() {} });
    const pill = (anchor.nextElementSibling as HTMLElement).shadowRoot!.querySelector<HTMLElement>(".wi-badge")!;
    expect(pill.textContent).toBe("…");
    b.update({ status: "error", error: { code: "no_key", message: "" } });
    expect(pill.textContent).toBe("!");
    expect(pill.title).toContain("Jev key");
  });

  it("hover shows popover with title after delay; Escape hides", () => {
    attachBadge(anchor, { state: { status: "ready", model }, onFeedback() {} });
    const host = anchor.nextElementSibling as HTMLElement;
    const pop = host.shadowRoot!.querySelector<HTMLElement>(".wi-pop")!;
    expect(pop.hidden).toBe(true);
    host.dispatchEvent(new Event("mouseenter"));
    expect(pop.hidden).toBe(true);
    vi.advanceTimersByTime(200);
    expect(pop.hidden).toBe(false);
    expect(pop.textContent).toContain(model.title);
    host.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(pop.hidden).toBe(true);
  });

  it("remove cleans up", () => {
    const b = attachBadge(anchor, { state: { status: "ready", model }, onFeedback() {} });
    b.remove();
    expect(anchor.nextElementSibling).toBeNull();
  });
});
