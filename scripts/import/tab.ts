import { normalizeText } from "../../src/shared/category";
import type { Group } from "../../src/shared/types";
import { parseAmountCents, parseSheetDate } from "./sheet-values";

export interface SheetBill {
  name: string;
  group: Group;
  amountCents: number | null;
  paid: boolean;
  paidOn: string | null;
}

export interface SheetExpense {
  description: string;
  categoryText: string;
  amountCents: number | null;
  spentOn: string | null;
}

export interface ParsedTab {
  bills: SheetBill[];
  expenses: SheetExpense[];
}

type Section = "cards" | "expenses" | "fixed" | "charges";

const TITLES: Record<string, Section> = {
  cartoes: "cards",
  "despesas avulsas": "expenses",
  "despesas fixas": "fixed",
  "cobrancas mensais": "charges",
};

const BILL_WIDTH = 5;
const EXPENSE_WIDTH = 4;

interface Marker {
  section: Section;
  row: number;
  column: number;
}

function findMarkers(rows: string[][]): Marker[] {
  return rows.flatMap((cells, row) =>
    cells.flatMap((cell, column) => {
      const section = TITLES[normalizeText(cell)];
      return section ? [{ section, row, column }] : [];
    }),
  );
}

function blockRows(rows: string[][], marker: Marker, markers: Marker[]) {
  const next = markers
    .filter((other) => other.row > marker.row)
    .reduce((min, other) => Math.min(min, other.row), rows.length);
  return rows.slice(marker.row + 2, next);
}

const isTotal = (cell: string) => normalizeText(cell) === "total";

function parseBill(cells: string[], group: Group): SheetBill | null {
  const name = (cells[0] ?? "").trim();
  if (!name || isTotal(name)) return null;

  const rest = cells.slice(1);
  const status = rest
    .map(normalizeText)
    .find((cell) => cell === "pago" || cell === "pendente");
  const paidOn = rest.map(parseSheetDate).find((date) => date !== null) ?? null;

  return {
    name,
    group,
    amountCents: parseAmountCents(cells[1] ?? ""),
    paid: status === "pago",
    paidOn,
  };
}

function parseExpense(cells: string[]): SheetExpense | null {
  const description = (cells[0] ?? "").trim();
  if (!description || isTotal(description)) return null;

  return {
    description,
    categoryText: (cells[1] ?? "").trim(),
    amountCents: parseAmountCents(cells[2] ?? ""),
    spentOn: parseSheetDate(cells[3] ?? ""),
  };
}

export function parseTab(rows: string[][]): ParsedTab {
  const markers = findMarkers(rows);
  const bills: SheetBill[] = [];
  const expenses: SheetExpense[] = [];

  for (const marker of markers) {
    const width = marker.section === "expenses" ? EXPENSE_WIDTH : BILL_WIDTH;
    for (const row of blockRows(rows, marker, markers)) {
      const cells = row.slice(marker.column, marker.column + width);

      if (marker.section === "expenses") {
        const expense = parseExpense(cells);
        if (expense) expenses.push(expense);
      } else {
        const bill = parseBill(cells, marker.section);
        if (bill) bills.push(bill);
      }
    }
  }

  return { bills, expenses };
}
