import { describe, expect, it } from "vitest";
import { formatCents, parseRaw, toRaw } from "./money";

describe("formatCents", () => {
  it.each([
    [0, "0,00"],
    [5, "0,05"],
    [6240, "62,40"],
    [96701, "967,01"],
    [390000, "3.900,00"],
    [128628, "1.286,28"],
    [123456789, "1.234.567,89"],
    [-2500, "-25,00"],
  ])("formats %i as %s", (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });
});

describe("toRaw", () => {
  it("drops the thousands separators", () => {
    expect(toRaw(123456)).toBe("1234,56");
    expect(toRaw(500)).toBe("5,00");
  });
});

describe("parseRaw", () => {
  it.each([
    ["", 0],
    ["0", 0],
    ["62", 6200],
    ["62,4", 6240],
    ["62,40", 6240],
    ["62,", 6200],
    ["1234,56", 123456],
    ["0,05", 5],
  ])("parses %j as %i cents", (raw, cents) => {
    expect(parseRaw(raw)).toBe(cents);
  });

  it("round-trips with toRaw", () => {
    for (const cents of [1, 99, 100, 101, 250075, 99999999]) {
      expect(parseRaw(toRaw(cents))).toBe(cents);
    }
  });
});
