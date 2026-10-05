import { describe, expect, it } from "vitest";
import {
  monthFromTabName,
  parseAmountCents,
  parseSheetDate,
} from "./sheet-values";

describe("parseAmountCents", () => {
  it.each([
    ["R$1 800,00", 180000],
    ["R$ 1.234,56", 123456],
    ["R$1 234,5", 123450],
    ["R$475,87", 47587],
    ["R$0,00", 0],
    ["1.250", 125000],
    ["62", 6200],
    ["R$ 2 000,10", 200010],
  ])("reads %j as %i cents", (text, cents) => {
    expect(parseAmountCents(text)).toBe(cents);
  });

  it.each(["", "Pendente", "N/A", "abc", "R$"])("rejects %j", (text) => {
    expect(parseAmountCents(text)).toBeNull();
  });
});

describe("parseSheetDate", () => {
  it("reads two and four digit years", () => {
    expect(parseSheetDate("05/09/26")).toBe("2026-09-05");
    expect(parseSheetDate("5/9/2026")).toBe("2026-09-05");
  });

  it.each(["", "N/A", "Pendente", "31/02/26", "10/13/26", "10-09-26"])(
    "rejects %j",
    (text) => {
      expect(parseSheetDate(text)).toBeNull();
    },
  );
});

describe("monthFromTabName", () => {
  it.each([
    ["Set/2026", "2026-09"],
    ["Ago/2026", "2026-08"],
    ["Jul/26", "2026-07"],
    ["Jun 26", "2026-06"],
    ["Março 2025", "2025-03"],
    ["Planilha - Dez_2024", "2024-12"],
  ])("reads %j as %s", (name, month) => {
    expect(monthFromTabName(name)).toBe(month);
  });

  it("ignores tabs that are not months", () => {
    expect(monthFromTabName("Modelo")).toBeNull();
    expect(monthFromTabName("Resumo")).toBeNull();
  });
});
