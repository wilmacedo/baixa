import { describe, expect, it } from "vitest";
import { displayRaw, ghostCents, pasteText, typeKey } from "./amount-input";

const type = (keys: string) => [...keys].reduce(typeKey, "");

describe("typeKey", () => {
  it("builds an amount digit by digit", () => {
    expect(type("6240")).toBe("6240");
    expect(type("62,40")).toBe("62,40");
  });

  it("treats a dot like a comma", () => {
    expect(type("62.4")).toBe("62,4");
  });

  it("starts the fraction with a zero when the comma comes first", () => {
    expect(type(",5")).toBe("0,5");
  });

  it("ignores a second comma", () => {
    expect(type("1,,2")).toBe("1,2");
  });

  it("keeps at most two decimals", () => {
    expect(type("1,2345")).toBe("1,23");
  });

  it("keeps at most eight whole digits", () => {
    expect(type("1234567890")).toBe("12345678");
  });

  it("does not stack leading zeros", () => {
    expect(type("007")).toBe("7");
  });

  it("removes the last character on Backspace", () => {
    expect(typeKey("62,4", "Backspace")).toBe("62,");
    expect(typeKey("", "Backspace")).toBe("");
  });

  it("ignores keys that are not part of an amount", () => {
    expect(typeKey("12", "a")).toBe("12");
    expect(typeKey("12", "Enter")).toBe("12");
  });
});

describe("pasteText", () => {
  it.each([
    ["62,40", "62,40"],
    ["62.40", "62,40"],
    ["R$ 1.234,56", "1234,56"],
    ["1,234.56", "1234,56"],
    ["1.234", "1234"],
    ["abc", ""],
  ])("normalizes %j to %j", (text, expected) => {
    expect(pasteText(text)).toBe(expected);
  });

  it("limits the length", () => {
    expect(pasteText("123456789012345")).toHaveLength(11);
  });
});

describe("displayRaw", () => {
  it.each([
    ["", ""],
    ["5", "5"],
    ["1234", "1.234"],
    ["1234567,8", "1.234.567,8"],
    ["0,5", "0,5"],
    ["62,", "62,"],
  ])("shows %j as %j", (raw, expected) => {
    expect(displayRaw(raw)).toBe(expected);
  });
});

describe("ghostCents", () => {
  it.each([
    ["", ",00"],
    ["62", ",00"],
    ["62,", "00"],
    ["62,4", "0"],
    ["62,40", ""],
  ])("completes %j with %j", (raw, expected) => {
    expect(ghostCents(raw)).toBe(expected);
  });
});
