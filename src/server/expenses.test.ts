import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExpenseInput } from "../shared/types";
import { type Db, openDatabase } from "./db";
import { createExpenses } from "./expenses";

let db: Db;
let expenses: ReturnType<typeof createExpenses>;

beforeEach(() => {
  db = openDatabase(":memory:");
  expenses = createExpenses(db);
});

afterEach(() => db.close());

const lunch: ExpenseInput = {
  description: "Lunch",
  amountCents: 4590,
  category: "leisure",
  spentOn: "2026-10-03",
};

describe("expenses", () => {
  it("creates an expense with an id", () => {
    const created = expenses.create(lunch);

    expect(created).toMatchObject(lunch);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(expenses.get(created.id)).toEqual(created);
  });

  it("lists only the expenses of the month, newest first", () => {
    expenses.create({ ...lunch, description: "Early", spentOn: "2026-10-01" });
    expenses.create({
      ...lunch,
      description: "Other month",
      spentOn: "2026-09-30",
    });
    expenses.create({ ...lunch, description: "Late", spentOn: "2026-10-20" });
    expenses.create({
      ...lunch,
      description: "Late, added after",
      spentOn: "2026-10-20",
    });

    expect(expenses.listForMonth("2026-10").map((e) => e.description)).toEqual([
      "Late, added after",
      "Late",
      "Early",
    ]);
    expect(expenses.listForMonth("2026-11")).toEqual([]);
  });

  it("replaces every field of an expense", () => {
    const created = expenses.create(lunch);
    const replaced = expenses.replace(created.id, {
      description: "Pharmacy",
      amountCents: 6240,
      category: "health",
      spentOn: "2026-10-04",
    });

    expect(replaced).toEqual({
      id: created.id,
      description: "Pharmacy",
      amountCents: 6240,
      category: "health",
      spentOn: "2026-10-04",
    });
  });

  it("moves an expense to another month when its date changes", () => {
    const created = expenses.create(lunch);
    expenses.replace(created.id, { ...lunch, spentOn: "2026-09-28" });

    expect(expenses.listForMonth("2026-10")).toEqual([]);
    expect(expenses.listForMonth("2026-09")).toHaveLength(1);
  });

  it("returns undefined when replacing an unknown expense", () => {
    expect(expenses.replace("missing", lunch)).toBeUndefined();
  });

  it("deletes an expense and reports whether it existed", () => {
    const created = expenses.create(lunch);

    expect(expenses.delete(created.id)).toBe(true);
    expect(expenses.get(created.id)).toBeUndefined();
    expect(expenses.delete(created.id)).toBe(false);
  });
});
