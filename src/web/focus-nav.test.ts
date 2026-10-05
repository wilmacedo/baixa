import { describe, expect, it } from "vitest";
import { moveColumn, moveFocus } from "./focus-nav";

const columns = [["a1", "a2", "a3"], ["b1", "b2"], [], ["av:1"]];

describe("moveFocus", () => {
  it("starts at the first item going down and the last going up", () => {
    expect(moveFocus(columns, null, 1)).toBe("a1");
    expect(moveFocus(columns, null, -1)).toBe("av:1");
  });

  it("walks through the columns in order", () => {
    expect(moveFocus(columns, "a3", 1)).toBe("b1");
    expect(moveFocus(columns, "b1", -1)).toBe("a3");
  });

  it("stops at both ends", () => {
    expect(moveFocus(columns, "a1", -1)).toBe("a1");
    expect(moveFocus(columns, "av:1", 1)).toBe("av:1");
  });

  it("starts over when the current item is gone", () => {
    expect(moveFocus(columns, "zzz", 1)).toBe("a1");
  });

  it("returns nothing for empty columns", () => {
    expect(moveFocus([[], []], null, 1)).toBeNull();
  });
});

describe("moveColumn", () => {
  it("keeps the row when the next column is long enough", () => {
    expect(moveColumn(columns, "a2", 1)).toBe("b2");
  });

  it("clamps the row to the shorter column and skips empty ones", () => {
    expect(moveColumn(columns, "a3", 1)).toBe("b2");
    expect(moveColumn(columns, "b2", 1)).toBe("av:1");
  });

  it("stops at the first and last columns", () => {
    expect(moveColumn(columns, "a1", -1)).toBe("a1");
    expect(moveColumn(columns, "av:1", 1)).toBe("av:1");
  });

  it("goes to the first item when nothing is focused", () => {
    expect(moveColumn(columns, null, 1)).toBe("a1");
  });
});
