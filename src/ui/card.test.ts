// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { FIXTURES } from "../../dev/fixtures";
import { mountCard } from "./card";

const article = FIXTURES[0]!;
const video = FIXTURES[4]!;
const sr = (el: HTMLElement) => el.shadowRoot!;
const text = (el: HTMLElement) => sr(el).textContent ?? "";

afterEach(() => document.querySelectorAll("#worth-it-card").forEach((n) => n.remove()));

describe("mountCard", () => {
  it("mounts on documentElement with verdict label and 4 reasons", () => {
    const c = mountCard({ state: { status: "ready", model: article }, onFeedback() {}, onDismiss() {} });
    expect(c.el.parentElement).toBe(document.documentElement);
    expect(c.el.id).toBe("worth-it-card");
    expect(text(c.el)).toContain("Read now");
    expect(text(c.el)).toContain(article.title);
    expect(sr(c.el).querySelectorAll(".wi-reasons li")).toHaveLength(4);
    expect(sr(c.el).querySelectorAll(".wi-bar i.on")).toHaveLength(8);
  });

  it("feedback button calls handler once and disables", () => {
    const onFeedback = vi.fn();
    const c = mountCard({ state: { status: "ready", model: article }, onFeedback, onDismiss() {} });
    const [read, skip] = sr(c.el).querySelectorAll<HTMLButtonElement>(".wi-foot button");
    read!.click();
    read!.click();
    expect(onFeedback).toHaveBeenCalledTimes(1);
    expect(onFeedback).toHaveBeenCalledWith("read");
    expect(read!.disabled && skip!.disabled).toBe(true);
    expect(text(c.el)).toContain("Thanks");
  });

  it("Escape calls onDismiss and removes host", () => {
    const onDismiss = vi.fn();
    const c = mountCard({ state: { status: "loading" }, onFeedback() {}, onDismiss });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(document.getElementById("worth-it-card")).toBeNull();
  });

  it("update loading→ready swaps content", () => {
    const c = mountCard({ state: { status: "loading" }, onFeedback() {}, onDismiss() {} });
    expect(text(c.el)).toContain("Judging…");
    c.update({ status: "ready", model: article });
    expect(text(c.el)).not.toContain("Judging…");
    expect(text(c.el)).toContain("Read now");
    c.update({ status: "error", error: { code: "no_key", message: "" } });
    expect(text(c.el)).toContain("Add your Jev key");
  });

  it("seek chip calls onSeek with start", () => {
    const onSeek = vi.fn();
    const c = mountCard({ state: { status: "ready", model: video }, onFeedback() {}, onSeek, onDismiss() {} });
    const chips = sr(c.el).querySelectorAll<HTMLButtonElement>(".wi-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0]!.textContent).toBe("6:12–9:15");
    chips[1]!.click();
    expect(onSeek).toHaveBeenCalledWith(1102);
  });

  it("low_confidence shows ? pill", () => {
    const c = mountCard({ state: { status: "ready", model: FIXTURES[5]! }, onFeedback() {}, onDismiss() {} });
    const pill = sr(c.el).querySelector(".wi-pill")!;
    expect(pill.getAttribute("title")).toBe("low confidence");
    expect(pill.textContent).toContain("?");
  });
});
