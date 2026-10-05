import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isoDate, parseIsoDate, weekday } from "./dates";

describe("isoDate", () => {
  it("uses the local calendar date with padding", () => {
    expect(isoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(isoDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("parseIsoDate", () => {
  it("splits the parts", () => {
    expect(parseIsoDate("2026-10-05")).toEqual({
      year: 2026,
      month: 10,
      day: 5,
    });
  });
});

describe("addDays", () => {
  it.each([
    ["2026-10-05", 0, "2026-10-05"],
    ["2026-10-05", 1, "2026-10-06"],
    ["2026-10-05", -5, "2026-09-30"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2028-03-01", -1, "2028-02-29"],
    ["2026-10-05", -60, "2026-08-06"],
  ])("moves %s by %i days to %s", (iso, days, expected) => {
    expect(addDays(iso, days)).toBe(expected);
  });
});

describe("daysBetween", () => {
  it("counts calendar days in either direction", () => {
    expect(daysBetween("2026-10-05", "2026-10-05")).toBe(0);
    expect(daysBetween("2026-10-05", "2026-10-03")).toBe(-2);
    expect(daysBetween("2026-09-28", "2026-10-05")).toBe(7);
  });
});

describe("weekday", () => {
  it("returns 0 for Sunday through 6 for Saturday", () => {
    expect(weekday("2026-10-04")).toBe(0);
    expect(weekday("2026-10-05")).toBe(1);
    expect(weekday("2026-10-10")).toBe(6);
  });
});
