import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "../db";
import { createEntries } from "../entries";
import { createExpenses } from "../expenses";
import { createTemplates } from "../templates";
import { createQueries, QueryError } from "./queries";

let db: Db;
let queries: ReturnType<typeof createQueries>;
let templates: ReturnType<typeof createTemplates>;

const NOW = new Date(2026, 9, 15, 10, 0);

beforeEach(() => {
  db = openDatabase(":memory:");
  templates = createTemplates(db);
  queries = createQueries(db, () => NOW);

  const rent = templates.create({
    name: "Rent",
    amountCents: 300000,
    dueDay: 5,
    group: "fixed",
  });
  templates.create({
    name: "Streaming",
    amountCents: 4000,
    dueDay: 1,
    group: "charges",
    autoPaid: true,
  });
  templates.create({
    name: "Visa",
    amountCents: 0,
    dueDay: 14,
    group: "cards",
  });
  const old = templates.create({
    name: "Old loan",
    amountCents: 100000,
    dueDay: 3,
    group: "fixed",
  });
  templates.update(old.id, { active: false });

  const entries = createEntries(db);
  entries.save("2026-09", {
    templateId: rent.id,
    amountCents: 290000,
    paidAt: "2026-09-05",
  });
  entries.save("2026-09", {
    templateId: old.id,
    amountCents: 100000,
    paidAt: "2026-09-03",
  });

  const expenses = createExpenses(db);
  expenses.create({
    description: "Padaria",
    amountCents: 1850,
    category: "groceries",
    spentOn: "2026-10-03",
  });
  expenses.create({
    description: "Mercado Central",
    amountCents: 20000,
    category: "groceries",
    spentOn: "2026-09-20",
  });
  expenses.create({
    description: "Cinema",
    amountCents: 5000,
    category: "leisure",
    spentOn: "2026-09-21",
  });
});

afterEach(() => db.close());

describe("today", () => {
  it("reports the date and month from the injected clock", () => {
    expect(queries.today()).toMatchObject({
      date: "2026-10-15",
      month: "2026-10",
      day: 15,
    });
  });
});

describe("monthSummary", () => {
  it("builds the current month from the recurring bills, not from stored entries", () => {
    const summary = queries.monthSummary("2026-10");

    expect(summary.groups.fixed.pending.cents).toBe(300000);
    expect(summary.groups.charges.paid.cents).toBe(4000);
    expect(summary.groups.cards.pending.cents).toBe(0);
    expect(summary.pending.cents).toBe(300000);
    expect(summary.paid.cents).toBe(4000);
  });

  it("counts a bill as late once its due day has passed", () => {
    expect(queries.monthSummary("2026-10").late).toBe(2);
  });

  it("uses only stored entries for a past month, including inactive bills", () => {
    const summary = queries.monthSummary("2026-09");

    expect(summary.paid.cents).toBe(390000);
    expect(summary.pending.cents).toBe(0);
  });

  it("totals the one-off expenses of the month by category", () => {
    const { oneOffExpenses } = queries.monthSummary("2026-09");

    expect(oneOffExpenses.total.cents).toBe(25000);
    expect(oneOffExpenses.byCategory[0]).toMatchObject({
      category: "groceries",
    });
  });

  it("formats amounts the way the app does", () => {
    expect(queries.monthSummary("2026-10").pending.text).toBe("R$ 3.000,00");
  });

  it("rejects a malformed month", () => {
    expect(() => queries.monthSummary("October")).toThrow(QueryError);
  });
});

describe("listBills", () => {
  it("filters by group and status", () => {
    const late = queries.listBills("2026-10", { status: "late" });

    expect(late.map((b) => b.name).sort()).toEqual(["Rent", "Visa"]);
    expect(queries.listBills("2026-10", { group: "charges" })).toHaveLength(1);
  });

  it("shows a variable bill with a zero amount", () => {
    const visa = queries.listBills("2026-10").find((b) => b.name === "Visa");

    expect(visa?.amount.cents).toBe(0);
    expect(visa?.defaultAmount.cents).toBe(0);
  });
});

describe("billHistory", () => {
  it("matches the name ignoring case and accents", () => {
    expect(queries.billHistory("RENT")[0]?.name).toBe("Rent");
  });

  it("returns stored months plus the generated current month", () => {
    const [rent] = queries.billHistory("rent");

    expect(rent?.months.map((m) => [m.month, m.amount.cents])).toEqual([
      ["2026-09", 290000],
      ["2026-10", 300000],
    ]);
  });

  it("includes inactive bills", () => {
    const [loan] = queries.billHistory("old loan");

    expect(loan).toMatchObject({ active: false });
    expect(loan?.months).toHaveLength(1);
  });

  it("limits the range", () => {
    const [rent] = queries.billHistory("rent", "2026-10", "2026-10");

    expect(rent?.months.map((m) => m.month)).toEqual(["2026-10"]);
  });
});

describe("listExpenses", () => {
  it("filters by date range, category and text", () => {
    expect(
      queries.listExpenses({ from: "2026-09-01", to: "2026-09-30" }).count,
    ).toBe(2);
    expect(queries.listExpenses({ category: "leisure" }).total.cents).toBe(
      5000,
    );
    expect(queries.listExpenses({ text: "mercado" }).count).toBe(1);
  });

  it("totals everything when no filter is given", () => {
    expect(queries.listExpenses().total.cents).toBe(26850);
  });
});

describe("spendingTrend", () => {
  it("returns one entry per month ending at the current one", () => {
    const trend = queries.spendingTrend(3);

    expect(trend.map((t) => t.month)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(trend[1]?.billsPaid.cents).toBe(390000);
    expect(trend[1]?.oneOffExpenses.cents).toBe(25000);
  });

  it("caps the number of months", () => {
    expect(queries.spendingTrend(500)).toHaveLength(36);
  });
});

describe("listRecurring", () => {
  it("hides inactive bills unless asked", () => {
    expect(queries.listRecurring().map((t) => t.name)).not.toContain(
      "Old loan",
    );
    expect(queries.listRecurring(true).map((t) => t.name)).toContain(
      "Old loan",
    );
  });

  it("flags variable and automatic bills", () => {
    const all = queries.listRecurring();

    expect(all.find((t) => t.name === "Visa")).toMatchObject({
      variable: true,
      defaultAmount: null,
    });
    expect(all.find((t) => t.name === "Streaming")).toMatchObject({
      chargedAutomatically: true,
    });
  });
});

describe("runSql", () => {
  it("runs a select", () => {
    const result = queries.runSql("SELECT COUNT(*) AS n FROM templates;");

    expect(result.rows).toEqual([{ n: 4 }]);
  });

  it("allows a common table expression", () => {
    expect(
      queries.runSql("WITH t AS (SELECT 1 AS x) SELECT x FROM t").rows,
    ).toEqual([{ x: 1 }]);
  });

  it.each([
    "DELETE FROM templates",
    "UPDATE templates SET name = 'x'",
    "DROP TABLE entries",
    "PRAGMA user_version = 9",
    "SELECT 1; DELETE FROM templates",
    "INSERT INTO templates VALUES (1)",
  ])("refuses %s", (sql) => {
    expect(() => queries.runSql(sql)).toThrow(QueryError);
    expect(templates.list()).toHaveLength(4);
  });

  it("still allows writes by the app afterwards", () => {
    queries.runSql("SELECT 1");

    expect(() =>
      templates.create({
        name: "New",
        amountCents: 100,
        dueDay: 1,
        group: "fixed",
      }),
    ).not.toThrow();
  });

  it("stops at the row limit", () => {
    const result = queries.runSql(
      "WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000) SELECT i FROM n",
    );

    expect(result.rows).toHaveLength(200);
    expect(result.truncated).toBe(true);
  });
});
