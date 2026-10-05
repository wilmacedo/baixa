import { describe, expect, it } from "vitest";
import { parseBlocks, parseInline } from "./chat-markdown";

describe("parseInline", () => {
  it("marks bold and code and keeps the rest plain", () => {
    expect(parseInline("Faltam **R$ 10,00** em `run_sql` ok")).toEqual([
      { text: "Faltam " },
      { text: "R$ 10,00", bold: true },
      { text: " em " },
      { text: "run_sql", code: true },
      { text: " ok" },
    ]);
  });

  it("leaves unbalanced markers alone", () => {
    expect(parseInline("2 ** 3 e `solto")).toEqual([
      { text: "2 ** 3 e `solto" },
    ]);
  });

  it("never produces markup from html", () => {
    expect(parseInline("<b>oi</b>")).toEqual([{ text: "<b>oi</b>" }]);
  });
});

describe("parseBlocks", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    const blocks = parseBlocks("Primeira\nlinha\n\nSegunda");

    expect(blocks).toEqual([
      { type: "paragraph", inline: [{ text: "Primeira linha" }] },
      { type: "paragraph", inline: [{ text: "Segunda" }] },
    ]);
  });

  it("groups bullets and numbered items into lists", () => {
    const blocks = parseBlocks(
      "Contas:\n- **Aluguel:** R$ 1,00\n- Luz\n\n1. um\n2. dois",
    );

    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list", "list"]);
    expect(blocks[1]).toMatchObject({ ordered: false });
    expect((blocks[1] as { items: unknown[] }).items).toHaveLength(2);
    expect(blocks[2]).toMatchObject({ ordered: true });
  });

  it("ends a paragraph when a list starts right after it", () => {
    expect(parseBlocks("Por grupo:\n- a\n- b").map((b) => b.type)).toEqual([
      "paragraph",
      "list",
    ]);
  });

  it("returns nothing for empty text", () => {
    expect(parseBlocks("")).toEqual([]);
  });
});
