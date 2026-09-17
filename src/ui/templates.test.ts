import { describe, expect, it } from "vitest";
import { confidenceText, minutesText, mmss, pct } from "./templates";

describe("templates", () => {
  it("pct rounds", () => {
    expect(pct(0.744)).toBe("74%");
    expect(pct(0)).toBe("0%");
    expect(pct(1)).toBe("100%");
  });
  it("mmss", () => {
    expect(mmss(0)).toBe("0:00");
    expect(mmss(65)).toBe("1:05");
    expect(mmss(599.9)).toBe("9:59");
    expect(mmss(3661)).toBe("1:01:01");
  });
  it("minutesText", () => {
    expect(minutesText(0.4)).toBe("<1 min");
    expect(minutesText(12.4)).toBe("12 min");
  });
  it("confidenceText boundaries", () => {
    expect(confidenceText(0.8)).toBe("high");
    expect(confidenceText(0.79)).toBe("medium");
    expect(confidenceText(0.5)).toBe("medium");
    expect(confidenceText(0.49)).toBe("low");
  });
});
