import { describe, expect, it } from "vitest";
import {
  type CategorizedExpense,
  detectCategory,
  normalizeText,
} from "./category";

describe("normalizeText", () => {
  it("lowercases, trims and strips accents", () => {
    expect(normalizeText("  Farmácia São João ")).toBe("farmacia sao joao");
  });
});

describe("detectCategory", () => {
  it.each([
    ["Mercado Extra", "groceries"],
    ["Padaria", "groceries"],
    ["Farmácia", "health"],
    ["FARMACIA", "health"],
    ["Consulta dentista", "health"],
    ["Uber", "transport"],
    ["99 pop", "transport"],
    ["Gasolina", "transport"],
    ["Cinema", "leisure"],
    ["iFood", "leisure"],
    ["Gás", "home"],
    ["Lâmpadas", "home"],
  ])("detects %j as %s", (description, category) => {
    expect(detectCategory(description)).toBe(category);
  });

  it("matches a keyword at the start of any word", () => {
    expect(detectCategory("compra no mercado")).toBe("groceries");
  });

  it("does not match a keyword inside a word", () => {
    expect(detectCategory("embarque")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(detectCategory("Presente")).toBeNull();
    expect(detectCategory("")).toBeNull();
    expect(detectCategory("   ")).toBeNull();
  });

  it("prefers the history over keywords", () => {
    const history: CategorizedExpense[] = [
      { description: "Padaria do Zé", category: "leisure" },
    ];
    expect(detectCategory("padaria do ze", history)).toBe("leisure");
    expect(detectCategory("padaria", history)).toBe("groceries");
  });

  it("uses the latest matching history entry", () => {
    const history: CategorizedExpense[] = [
      { description: "Presente", category: "other" },
      { description: "presente", category: "leisure" },
    ];
    expect(detectCategory("Presente", history)).toBe("leisure");
  });
});
