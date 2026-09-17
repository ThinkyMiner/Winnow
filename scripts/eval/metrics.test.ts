import { describe, expect, it } from "vitest";
import { accuracy, confusionMatrix, gridSearch, gridValues, type Pair } from "./metrics";

describe("accuracy", () => {
  it("counts exact matches", () => {
    expect(accuracy([["a", "a"], ["a", "b"], ["b", "b"], ["c", "a"]])).toBe(0.5);
  });
  it("is 0 on empty input", () => {
    expect(accuracy([])).toBe(0);
  });
});

describe("confusionMatrix", () => {
  const pairs: Pair[] = [["skip", "skip"], ["skip", "skim"], ["read_now", "read_now"]];
  it("puts gold on rows and predictions on columns", () => {
    const m = confusionMatrix(["read_now", "skim", "save", "skip"], pairs);
    const lines = m.split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/gold \\ pred\s+read_now\s+skim\s+save\s+skip\s+total/);
    // skip row: 0 read_now, 1 skim, 0 save, 1 skip, total 2
    expect(lines[4]).toMatch(/^skip\s+0\s+1\s+0\s+1\s+2$/);
    expect(lines[1]).toMatch(/^read_now\s+1\s+0\s+0\s+0\s+1$/);
  });
  it("compact drops unseen labels", () => {
    const m = confusionMatrix(["read_now", "skim", "save", "skip"], pairs, true);
    expect(m).not.toContain("save");
    expect(m.split("\n")).toHaveLength(4);
  });
});

describe("gridValues", () => {
  it("is inclusive and avoids float drift", () => {
    expect(gridValues({ min: 0.3, max: 0.5, step: 0.05 })).toEqual([0.3, 0.35, 0.4, 0.45, 0.5]);
    expect(gridValues({ min: 1, max: 3, step: 1 })).toEqual([1, 2, 3]);
  });
});

describe("gridSearch", () => {
  const ranges = { a: { min: 0, max: 4, step: 1 }, b: { min: 0, max: 1, step: 0.5 } };
  it("finds the best value per key holding the others at base", () => {
    // score peaks at a=3 regardless of b; b is irrelevant
    const { suggested, perKey } = gridSearch(ranges, { a: 0, b: 0 }, (t) => 1 - Math.abs(t.a - 3) / 10);
    expect(suggested.a).toBe(3);
    expect(perKey.a.before).toBeCloseTo(0.7);
    expect(perKey.a.after).toBe(1);
  });
  it("keeps the base value on ties", () => {
    const { suggested } = gridSearch(ranges, { a: 2, b: 0.5 }, () => 0.5);
    expect(suggested).toEqual({ a: 2, b: 0.5 });
  });
  it("prefers the tied value closest to base", () => {
    // a in {3,4} both score 1; base 2 → pick 3
    const { suggested } = gridSearch(ranges, { a: 2, b: 0 }, (t) => (t.a >= 3 ? 1 : 0));
    expect(suggested.a).toBe(3);
  });
});
