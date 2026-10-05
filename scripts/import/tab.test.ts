import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { parseTab } from "./tab";

const csv = `Cartões,,,,,Despesas Avulsas,,,
Banco,Valor,Categoria,Data,Situação,Item,Categoria,Valor,Data
Cartão A,"R$1 100,00",Cartão,14/08/26,Pago,Padaria,Mercado,"R$18,50",05/08/26
Cartão B,"R$400,00",Cartão,,Pendente,Total,,"R$18,50",
Total,"R$1 500,00",,,,,,,
Despesas Fixas,,,,,Cobranças Mensais,,,,
Descrição,Valor,Categoria,Data,Situação,Descrição,Valor,Categoria,Data,Situação
Aluguel,"R$1 800,00",Fixa,10/08/26,Pago,Streaming,"R$45,00",Fixa,N/A,Pago
Energia,,Fixa,,Pendente,Parcelamento,"R$400,00",Fixa,,Pendente
Total,"R$1 800,00",,,,Academia,"R$250,00",Fixa,05/08/26,Pago
,,,,,Total,"R$695,00",,,
`;

describe("parseTab", () => {
  const tab = parseTab(parseCsv(csv));
  const bill = (name: string) => tab.bills.find((b) => b.name === name);

  it("reads the bills of every block with their group", () => {
    expect(tab.bills.map((b) => [b.name, b.group])).toEqual([
      ["Cartão A", "cards"],
      ["Cartão B", "cards"],
      ["Aluguel", "fixed"],
      ["Energia", "fixed"],
      ["Streaming", "charges"],
      ["Parcelamento", "charges"],
      ["Academia", "charges"],
    ]);
  });

  it("reads amounts, leaving blank ones empty", () => {
    expect(bill("Aluguel")?.amountCents).toBe(180000);
    expect(bill("Energia")?.amountCents).toBeNull();
  });

  it("reads the status and the payment date", () => {
    expect(bill("Cartão A")).toMatchObject({
      paid: true,
      paidOn: "2026-08-14",
    });
    expect(bill("Cartão B")).toMatchObject({ paid: false, paidOn: null });
  });

  it("marks a paid bill without a date as paid", () => {
    expect(bill("Streaming")).toMatchObject({ paid: true, paidOn: null });
  });

  it("keeps right-hand rows that share a line with a left-hand total", () => {
    expect(bill("Academia")?.amountCents).toBe(25000);
  });

  it("skips totals", () => {
    expect(tab.bills.some((b) => b.name === "Total")).toBe(false);
    expect(tab.expenses.some((e) => e.description === "Total")).toBe(false);
  });

  it("reads the one-off expenses", () => {
    expect(tab.expenses).toEqual([
      {
        description: "Padaria",
        categoryText: "Mercado",
        amountCents: 1850,
        spentOn: "2026-08-05",
      },
    ]);
  });

  it("returns nothing for an empty tab", () => {
    expect(parseTab([])).toEqual({ bills: [], expenses: [] });
  });
});
