import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("splits rows and cells", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps empty cells in place", () => {
    expect(parseCsv("a,,c\n,,\n")).toEqual([
      ["a", "", "c"],
      ["", "", ""],
    ]);
  });

  it("reads quoted cells with commas", () => {
    expect(parseCsv('Rent,"R$1 800,00",Fixa\n')).toEqual([
      ["Rent", "R$1 800,00", "Fixa"],
    ]);
  });

  it("reads escaped quotes and line breaks inside quotes", () => {
    expect(parseCsv('"say ""hi""","two\nlines"\n')).toEqual([
      ['say "hi"', "two\nlines"],
    ]);
  });

  it("accepts windows line endings and a missing final newline", () => {
    expect(parseCsv("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns nothing for an empty text", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
