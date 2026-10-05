import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "../../src/server/db";
import { createEntries } from "../../src/server/entries";
import { createExpenses } from "../../src/server/expenses";
import { createTemplates } from "../../src/server/templates";
import { applyPlan } from "./apply";
import type { ImportPlan } from "./plan";

const plan: ImportPlan = {
  templates: [
    {
      key: "fixed:rent",
      name: "Rent",
      group: "fixed",
      amountCents: 110000,
      dueDay: 9,
      active: true,
    },
    {
      key: "charges:gym",
      name: "Gym",
      group: "charges",
      amountCents: 25000,
      dueDay: 5,
      active: false,
    },
  ],
  entries: [
    {
      templateKey: "fixed:rent",
      month: "2026-09",
      amountCents: 110000,
      paidAt: "2026-09-09",
    },
    {
      templateKey: "charges:gym",
      month: "2026-08",
      amountCents: 25000,
      paidAt: null,
    },
  ],
  expenses: [
    {
      description: "Padaria",
      amountCents: 1850,
      category: "groceries",
      spentOn: "2026-08-05",
    },
  ],
  months: [],
  warnings: [],
};

let db: Db;

beforeEach(() => {
  db = openDatabase(":memory:");
});

afterEach(() => db.close());

describe("applyPlan", () => {
  it("writes templates, entries and expenses and reports the counts", () => {
    expect(applyPlan(db, plan)).toEqual({
      templates: 2,
      entries: 2,
      expenses: 1,
    });

    const templates = createTemplates(db).list();
    expect(templates.map((t) => [t.name, t.active, t.position])).toEqual([
      ["Rent", true, 1],
      ["Gym", false, 2],
    ]);
    expect(createEntries(db).listForMonth("2026-09")).toHaveLength(1);
    expect(createExpenses(db).listForMonth("2026-08")).toHaveLength(1);
  });

  it("links entries to the right templates", () => {
    applyPlan(db, plan);
    const [rent] = createTemplates(db).list();

    expect(createEntries(db).listForMonth("2026-09")).toEqual([
      { templateId: rent?.id, amountCents: 110000, paidAt: "2026-09-09" },
    ]);
  });

  it("refuses a database that already has data", () => {
    applyPlan(db, plan);

    expect(() => applyPlan(db, plan)).toThrow("already has data");
  });

  it("leaves the database untouched when something fails", () => {
    const broken = {
      ...plan,
      expenses: [{ ...plan.expenses[0], amountCents: 0 }],
    } as ImportPlan;

    expect(() => applyPlan(db, broken)).toThrow();
    expect(createTemplates(db).list()).toEqual([]);
  });
});
