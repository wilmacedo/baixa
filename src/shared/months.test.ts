import { describe, expect, it } from "vitest";
import {
  addMonths,
  isMonthKey,
  monthKey,
  parseMonthKey,
  todayOf,
} from "./months";

describe("monthKey", () => {
  it("pads the month", () => {
    expect(monthKey(2026, 0)).toBe("2026-01");
    expect(monthKey(2026, 9)).toBe("2026-10");
  });
});

describe("parseMonthKey", () => {
  it("returns the year and a zero-based month index", () => {
    expect(parseMonthKey("2026-10")).toEqual({ year: 2026, monthIndex: 9 });
  });
});

describe("isMonthKey", () => {
  it.each(["2026-01", "2026-12", "1999-06"])("accepts %s", (value) => {
    expect(isMonthKey(value)).toBe(true);
  });

  it.each(["2026-00", "2026-13", "2026-1", "26-10", "2026-10-01", ""])(
    "rejects %j",
    (value) => {
      expect(isMonthKey(value)).toBe(false);
    },
  );
});

describe("addMonths", () => {
  it("moves forward and backward inside a year", () => {
    expect(addMonths("2026-05", 1)).toBe("2026-06");
    expect(addMonths("2026-05", -1)).toBe("2026-04");
  });

  it("crosses year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", 15)).toBe("2028-01");
    expect(addMonths("2026-10", -22)).toBe("2024-12");
  });

  it("returns the same month for zero", () => {
    expect(addMonths("2026-10", 0)).toBe("2026-10");
  });
});

describe("todayOf", () => {
  it("uses the local calendar date", () => {
    expect(todayOf(new Date(2026, 9, 5, 23, 59))).toEqual({
      month: "2026-10",
      day: 5,
    });
  });
});
