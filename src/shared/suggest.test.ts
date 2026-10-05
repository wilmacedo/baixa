import { describe, expect, it } from "vitest";
import { suggestCompletion } from "./suggest";

const history = [
  { description: "Mercado Central", category: "groceries" },
  { description: "Mercado do bairro", category: "groceries" },
] as const;

describe("suggestCompletion", () => {
  it("completes from the built-in list", () => {
    expect(suggestCompletion("farm", [])).toBe("ácia");
    expect(suggestCompletion("Ub", [])).toBe("er");
  });

  it("prefers the most recent history entry", () => {
    expect(suggestCompletion("merc", history)).toBe("ado do bairro");
  });

  it("ignores accents and case when matching", () => {
    expect(suggestCompletion("FARMAC", [])).toBe("ia");
  });

  it("suggests nothing for an empty text or a full match", () => {
    expect(suggestCompletion("", history)).toBe("");
    expect(suggestCompletion("Uber", [])).toBe("");
  });

  it("suggests nothing when no candidate starts with the text", () => {
    expect(suggestCompletion("xyz", history)).toBe("");
  });

  it("does not repeat a description that is already in the history", () => {
    const repeated = [
      { description: "Padaria", category: "groceries" },
    ] as const;

    expect(suggestCompletion("pad", repeated)).toBe("aria");
  });
});
